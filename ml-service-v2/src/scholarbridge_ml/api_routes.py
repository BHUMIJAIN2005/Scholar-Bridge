import logging
import uuid
from typing import Any, Callable
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from scholarbridge_ml.document_extractor import (
    combine_documents,
    extract_single_document,
)
from scholarbridge_ml.professor_analyzer import (
    LaymanSummary,
    ProfessorAnalysisResult,
    ResearchProfile,
    StatedRequirements,
    analyze_professor_documents,
)
from scholarbridge_ml.storage import (
    InMemoryStorage,
    OpportunityContext,
    OpportunityPublicResponse,
    StudentOpportunityMatch,
    StudentProfileRecord,
    storage,
)
from scholarbridge_ml.student_matching import (
    StudentMatchResult,
    rank_opportunities_for_student,
    rank_students_for_opportunity,
    rank_students_for_professor,
)

logger = logging.getLogger("scholarbridge_ml.api_routes")

router = APIRouter(tags=["Professor Matching & Research Discovery"])

# Dependency container for encoder callable
_encoder_getter: Callable[[], Any] | None = None


def set_encoder_getter(getter: Callable[[], Any]) -> None:
    global _encoder_getter
    _encoder_getter = getter


def get_shared_encoder() -> Any:
    if _encoder_getter is None:
        raise RuntimeError("Shared encoder getter has not been configured.")
    return _encoder_getter()


# ---------------------------------------------------------
# Request & Response Models
# ---------------------------------------------------------


class ProfileConfirmRequest(BaseModel):
    research_profile: ResearchProfile
    stated_requirements: StatedRequirements | None = None
    layman_summary: LaymanSummary | None = None
    draft_id: str | None = None


class ProfileConfirmResponse(BaseModel):
    professor_id: str
    status: str
    is_confirmed: bool
    confirmed_at: str
    message: str
    research_profile: ResearchProfile
    stated_requirements: StatedRequirements | None
    layman_summary: LaymanSummary | None


class MatchStudentsRequest(BaseModel):
    students: list[StudentProfileRecord] | None = None
    top_k: int = Field(default=20, ge=1, le=100)


class OpportunityCreateRequest(BaseModel):
    opportunity_id: str | None = None
    professor_id: str
    title: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1, max_length=10000)
    research_domains: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    preferred_years: list[str] = Field(default_factory=list)
    eligibility_criteria: list[str] = Field(default_factory=list)
    status: str = "open"


class OpportunityMatchRequest(BaseModel):
    students: list[StudentProfileRecord] | None = None
    top_k: int = Field(default=20, ge=1, le=100)


def build_student_embedding(student: StudentProfileRecord, encoder: Any) -> list[float]:
    """Generate normalized 384-dim embedding for student from profile text."""
    skills_text = ", ".join(student.skill_tags) if student.skill_tags else student.skills
    interests_text = ", ".join(student.interests)
    proj_text = " ".join(f"{p.get('title', '')}: {p.get('description', '')}" for p in student.projects)
    combined = f"Student background. Department: {student.department}. Academic year: {student.academic_year}. Skills: {skills_text}. Research interests: {interests_text}. Projects: {proj_text}"
    vec = encoder.encode([combined], normalize_embeddings=True)[0]
    return vec.tolist()


def seed_demo_data_if_empty(encoder: Any) -> None:
    """Pre-populate a few realistic candidate students if student storage is empty."""
    if len(storage.get_all_students()) > 0:
        return

    demo_students = [
        StudentProfileRecord(
            id="student_101",
            name="Aarav Sharma",
            department="Computer Science and Engineering",
            academic_year="3rd Year",
            skills="Python, PyTorch, OpenCV, CNNs",
            skill_tags=["Python", "PyTorch", "OpenCV", "Deep Learning"],
            interests=["Medical Image Segmentation", "Computer Vision"],
            projects=[
                {
                    "title": "Brain MRI Tumor Segmentation",
                    "description": "Implemented modified 2D U-Net using PyTorch on BraTS dataset with 0.88 Dice score.",
                }
            ],
            papers=[
                {
                    "title": "Automated Abdominal CT Lesion Localization",
                    "category": "Computer Vision and Pattern Recognition",
                }
            ],
        ),
        StudentProfileRecord(
            id="student_102",
            name="Priya Patel",
            department="Information Technology",
            academic_year="4th Year",
            skills="Python, Transformers, NLP, HuggingFace",
            skill_tags=["Python", "Transformers", "NLP", "PyTorch"],
            interests=["Natural Language Processing", "Large Language Models"],
            projects=[
                {
                    "title": "Low-Resource Hindi Machine Translation",
                    "description": "Fine-tuned multilingual BERT on parallel Hindi-English corpus.",
                }
            ],
        ),
        StudentProfileRecord(
            id="student_103",
            name="Rohan Verma",
            department="Electrical and Electronics Engineering",
            academic_year="2nd Year",
            skills="Embedded C, MATLAB, Signal Processing, IoT",
            skill_tags=["Embedded C", "MATLAB", "Signal Processing"],
            interests=["Edge Computing", "IoT Telemetry"],
            projects=[
                {
                    "title": "Smart ECG Sensor Interface",
                    "description": "Built Arduino-based ECG reader with analog filtering.",
                }
            ],
        ),
    ]

    for s in demo_students:
        s.embedding = build_student_embedding(s, encoder)
        storage.save_student(s)

    logger.info("Seeded %d realistic candidate students into memory.", len(demo_students))


# ---------------------------------------------------------
# 1. Analyze Uploaded Documents (Draft Generation)
# ---------------------------------------------------------


@router.post("/professor/analyze-documents", response_model=ProfessorAnalysisResult)
async def analyze_documents(
    files: list[UploadFile] = File(...),
    document_types: list[str] | None = Form(default=None),
) -> ProfessorAnalysisResult:
    """
    Accept multiple PDF documents (CV, research papers, publications).
    Extracts text via pdfplumber with PyMuPDF+Tesseract OCR fallback.
    Calls Groq LLM for structured profile and layman summary extraction.
    Returns draft for professor review. Does NOT persist or generate embeddings.
    """
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one PDF document.")

    extracted_docs = []
    types_list = document_types or []

    for idx, file in enumerate(files):
        # Validate filename and PDF extension
        filename = file.filename or f"doc_{idx + 1}.pdf"
        if not (filename.lower().endswith(".pdf") or file.content_type == "application/pdf"):
            raise HTTPException(
                status_code=415,
                detail=f"File '{filename}' is not a PDF. Only PDF documents are supported.",
            )

        content = await file.read()
        if len(content) > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File '{filename}' exceeds maximum allowed size of 25MB.",
            )

        # Determine document type (cv vs paper vs publication)
        doc_type = "paper"
        if idx < len(types_list) and types_list[idx].strip():
            doc_type = types_list[idx].strip()
        elif "cv" in filename.lower() or "resume" in filename.lower():
            doc_type = "cv"

        extracted = extract_single_document(content, filename=filename, document_type=doc_type)
        extracted_docs.append(extracted)

    # Combine extracted texts preserving document boundaries
    combined = combine_documents(extracted_docs)
    draft_id = f"draft_{uuid.uuid4().hex[:12]}"

    # Run Groq LLM research analysis
    result = analyze_professor_documents(
        combined_text=combined.combined_text,
        documents_metadata=combined.documents_metadata,
        draft_id=draft_id,
    )
    result.warnings.extend(combined.warnings)

    # Save draft analysis in unconfirmed storage for subsequent review
    storage.save_unconfirmed_analysis(
        draft_id,
        {
            "draft_id": draft_id,
            "result": result.model_dump(),
            "combined_text": combined.combined_text,
        },
    )

    return result


# ---------------------------------------------------------
# 2. Confirm Research Profile
# ---------------------------------------------------------


@router.put(
    "/professor/{professor_id}/research-profile/confirm",
    response_model=ProfileConfirmResponse,
)
def confirm_research_profile(
    professor_id: str,
    request: ProfileConfirmRequest,
) -> ProfileConfirmResponse:
    """
    Accept professor-verified research profile and layman summary.
    Generates normalized 384-dimensional MiniLM embedding from confirmed embedding_text.
    Persists confirmed profile and embedding in storage.
    """
    profile = request.research_profile
    embedding_text = profile.embedding_text.strip()

    if not embedding_text:
        # Fallback to synthesizing embedding text from interests, domains, and methods
        embedding_text = (
            f"Professor with research focus in {', '.join(profile.research_domains)}. "
            f"Key research interests: {', '.join(profile.research_interests)}. "
            f"Methodologies and tools: {', '.join(profile.methods)}. "
            f"Key contributions: {', '.join(profile.contributions)}."
        ).strip()
        profile.embedding_text = embedding_text

    if not any([profile.research_interests, profile.research_domains, profile.methods]):
        raise HTTPException(
            status_code=422,
            detail="Cannot confirm an empty research profile. Provide at least research interests or domains.",
        )

    # Generate normalized 384-dim embedding using shared SentenceTransformer
    try:
        encoder = get_shared_encoder()
        embedding_vector = encoder.encode([embedding_text], normalize_embeddings=True)[0]
    except Exception as exc:
        logger.error("Embedding generation failed during confirmation: %s", exc)
        raise HTTPException(
            status_code=500, detail=f"Embedding generation failed: {exc}"
        ) from exc

    # Retrieve original profile if draft_id provided
    original_profile: ResearchProfile | None = None
    if request.draft_id:
        draft = storage.get_unconfirmed_analysis(request.draft_id)
        if draft and "result" in draft and draft["result"].get("research_profile"):
            try:
                original_profile = ResearchProfile(**draft["result"]["research_profile"])
            except Exception:
                original_profile = None

    stored = storage.save_confirmed_profile(
        professor_id=professor_id,
        confirmed_profile=profile,
        original_profile=original_profile,
        stated_requirements=request.stated_requirements,
        layman_summary=request.layman_summary,
        embedding=embedding_vector,
    )

    return ProfileConfirmResponse(
        professor_id=professor_id,
        status="confirmed",
        is_confirmed=True,
        confirmed_at=stored.confirmed_at,
        message="Research profile confirmed and 384-dimensional embedding generated successfully.",
        research_profile=stored.confirmed_profile,
        stated_requirements=stored.stated_requirements,
        layman_summary=stored.layman_summary,
    )


# ---------------------------------------------------------
# 3. Retrieve Research Profile
# ---------------------------------------------------------


@router.get("/professor/{professor_id}/research-profile")
def get_research_profile(professor_id: str) -> dict[str, Any]:
    """Retrieve confirmed research profile for a professor."""
    stored = storage.get_confirmed_profile(professor_id)
    if not stored:
        raise HTTPException(
            status_code=404,
            detail=f"Confirmed research profile not found for professor '{professor_id}'. Please upload documents and confirm your profile first.",
        )

    return {
        "professor_id": stored.professor_id,
        "is_confirmed": stored.is_confirmed,
        "confirmed_at": stored.confirmed_at,
        "research_profile": stored.confirmed_profile,
        "stated_requirements": stored.stated_requirements,
        "layman_summary": stored.layman_summary,
    }


# ---------------------------------------------------------
# 4. Match Students with Professor
# ---------------------------------------------------------


@router.post(
    "/professor/{professor_id}/match-students",
    response_model=dict[str, Any],
)
def match_students_for_prof(
    professor_id: str,
    request: MatchStudentsRequest,
) -> dict[str, Any]:
    """
    Rank students for a professor based on confirmed research profile and embedding.
    Calculates 4-factor score (research similarity 55%, skills 20%, experience 15%, preferences 10%)
    with dynamic weight normalization.
    """
    stored = storage.get_confirmed_profile(professor_id)
    if not stored:
        raise HTTPException(
            status_code=400,
            detail=f"Professor '{professor_id}' has not confirmed a research profile yet. Confirm your profile before requesting student matches.",
        )

    prof_embedding = storage.get_professor_embedding(professor_id)
    if prof_embedding is None:
        raise HTTPException(
            status_code=500, detail="Professor embedding vector is missing."
        )

    encoder = get_shared_encoder()
    seed_demo_data_if_empty(encoder)

    # Determine candidate student list
    if request.students:
        candidate_students = []
        for s in request.students:
            if not s.embedding or len(s.embedding) != 384:
                s.embedding = build_student_embedding(s, encoder)
            candidate_students.append(s)
    else:
        candidate_students = storage.get_all_students()

    if not candidate_students:
        return {
            "professor_id": professor_id,
            "matches": [],
            "count": 0,
            "note": "No student profiles found for matching.",
        }

    matches: list[StudentMatchResult] = rank_students_for_professor(
        professor_profile=stored.confirmed_profile,
        professor_embedding=prof_embedding,
        students=candidate_students,
        stated_requirements=stored.stated_requirements,
        top_k=request.top_k,
    )

    return {
        "professor_id": professor_id,
        "matches": matches,
        "count": len(matches),
        "note": "Ranked based on semantic research alignment, technical skills, and research experience.",
    }


# ---------------------------------------------------------
# 5. Create Opportunity
# ---------------------------------------------------------


@router.post("/opportunities", response_model=OpportunityPublicResponse)
def create_opportunity(request: OpportunityCreateRequest) -> OpportunityPublicResponse:
    """
    Create a new research opportunity under a professor.
    Generates embedding once from the opportunity description/skills and stores it.
    Does not overwrite the professor's overall research profile.
    """
    opp_id = request.opportunity_id or f"opp_{uuid.uuid4().hex[:10]}"

    encoder = get_shared_encoder()
    opp_text = (
        f"Research opening: {request.title}. "
        f"Domains: {', '.join(request.research_domains)}. "
        f"Required skills: {', '.join(request.required_skills)}. "
        f"Description: {request.description}"
    )

    try:
        embedding_vec = encoder.encode([opp_text], normalize_embeddings=True)[0].tolist()
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate opportunity embedding: {exc}"
        ) from exc

    opportunity = OpportunityContext(
        opportunity_id=opp_id,
        professor_id=request.professor_id,
        title=request.title.strip(),
        description=request.description.strip(),
        research_domains=request.research_domains,
        required_skills=request.required_skills,
        preferred_skills=request.preferred_skills,
        preferred_years=request.preferred_years,
        eligibility_criteria=request.eligibility_criteria,
        status=request.status or "open",
        embedding=embedding_vec,
    )

    storage.save_opportunity(opportunity)

    return OpportunityPublicResponse(
        opportunity_id=opportunity.opportunity_id,
        professor_id=opportunity.professor_id,
        title=opportunity.title,
        description=opportunity.description,
        research_domains=opportunity.research_domains,
        required_skills=opportunity.required_skills,
        preferred_skills=opportunity.preferred_skills,
        preferred_years=opportunity.preferred_years,
        eligibility_criteria=opportunity.eligibility_criteria,
        status=opportunity.status,
        created_at=opportunity.created_at,
    )


# ---------------------------------------------------------
# 6. Retrieve Opportunities
# ---------------------------------------------------------


@router.get("/opportunities", response_model=list[OpportunityPublicResponse])
def get_opportunities(open_only: bool = Query(default=True)) -> list[OpportunityPublicResponse]:
    """Retrieve all available research opportunities without exposing raw embeddings."""
    opps = storage.get_all_opportunities(open_only=open_only)
    return [
        OpportunityPublicResponse(
            opportunity_id=o.opportunity_id,
            professor_id=o.professor_id,
            title=o.title,
            description=o.description,
            research_domains=o.research_domains,
            required_skills=o.required_skills,
            preferred_skills=o.preferred_skills,
            preferred_years=o.preferred_years,
            eligibility_criteria=o.eligibility_criteria,
            status=o.status,
            created_at=o.created_at,
        )
        for o in opps
    ]


# ---------------------------------------------------------
# 7. Match Students to an Opportunity
# ---------------------------------------------------------


@router.post(
    "/opportunities/{opportunity_id}/match-students",
    response_model=dict[str, Any],
)
def match_students_for_opp(
    opportunity_id: str,
    request: OpportunityMatchRequest,
) -> dict[str, Any]:
    """
    Rank students for a specific opportunity using its own description, requirements,
    and stored embedding. Preserves the professor's broader research profile.
    """
    opportunity = storage.get_opportunity(opportunity_id)
    if not opportunity:
        raise HTTPException(
            status_code=404,
            detail=f"Research opportunity '{opportunity_id}' not found.",
        )

    encoder = get_shared_encoder()
    seed_demo_data_if_empty(encoder)

    # Opportunity embedding
    opp_emb = opportunity.embedding
    if not opp_emb or len(opp_emb) != 384:
        opp_text = f"Research opening: {opportunity.title}. Description: {opportunity.description}"
        opp_emb = encoder.encode([opp_text], normalize_embeddings=True)[0].tolist()
        opportunity.embedding = opp_emb

    # Retrieve professor confirmed profile for context if available
    prof_stored = storage.get_confirmed_profile(opportunity.professor_id)
    prof_profile = prof_stored.confirmed_profile if prof_stored else None

    # Determine candidate student list
    if request.students:
        candidate_students = []
        for s in request.students:
            if not s.embedding or len(s.embedding) != 384:
                s.embedding = build_student_embedding(s, encoder)
            candidate_students.append(s)
    else:
        candidate_students = storage.get_all_students()

    import numpy as np
    matches = rank_students_for_opportunity(
        opportunity=opportunity,
        professor_profile=prof_profile,
        opportunity_embedding=np.array(opp_emb, dtype=np.float32),
        students=candidate_students,
        top_k=request.top_k,
    )

    return {
        "opportunity_id": opportunity_id,
        "title": opportunity.title,
        "matches": matches,
        "count": len(matches),
        "note": "Opportunity-specific matching preserving the professor's broader research context.",
    }


# ---------------------------------------------------------
# 8. Student Opportunity Feed
# ---------------------------------------------------------


@router.get(
    "/students/{student_id}/opportunities",
    response_model=dict[str, Any],
)
def get_student_opportunity_feed(
    student_id: str,
    top_k: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    """
    Retrieve open opportunities ranked by relevance for a specific student.
    Calculates semantic match and displays eligibility criteria and skill gaps
    without silently dropping candidates.
    """
    encoder = get_shared_encoder()
    seed_demo_data_if_empty(encoder)

    student = storage.get_student(student_id)
    if not student:
        raise HTTPException(
            status_code=404,
            detail=f"Student profile '{student_id}' not found. Please provide or register a student profile first.",
        )

    if not student.embedding or len(student.embedding) != 384:
        student.embedding = build_student_embedding(student, encoder)
        storage.save_student(student)

    open_opps = storage.get_all_opportunities(open_only=True)
    if not open_opps:
        return {
            "student_id": student_id,
            "feed": [],
            "count": 0,
            "note": "No open research opportunities are currently active.",
        }

    matches: list[StudentOpportunityMatch] = rank_opportunities_for_student(
        student=student,
        opportunities=open_opps,
        top_k=top_k,
    )

    return {
        "student_id": student_id,
        "feed": matches,
        "count": len(matches),
        "note": "Personalized opportunity feed ranked by research relevance with visible eligibility guidance.",
    }
