import logging
import uuid
from typing import Any, Callable
from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
import numpy as np
from pydantic import BaseModel, Field
import os
import tempfile

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
    rank_professors_for_student,
)
from scholarbridge_ml.student_resume_analyzer import (
    StudentResumeAnalysisResponse,
    StudentResumeConfigurationError,
    StudentResumeProfile,
    StudentResumeProviderError,
    StudentResumeResponseError,
    analyze_student_resume,
)
from scholarbridge_ml.format_validator import check_ieee_format

logger = logging.getLogger("scholarbridge_ml.api_routes")

router = APIRouter(tags=["Professor Matching & Research Discovery"])
MAX_STUDENT_RESUME_SIZE = 25 * 1024 * 1024
MAX_PROFESSOR_FILE_SIZE = 25 * 1024 * 1024
MAX_PROFESSOR_TOTAL_SIZE = 100 * 1024 * 1024
MAX_PROFESSOR_DOCUMENT_COUNT = 10

# Dependency container for encoder callable
_encoder_getter: Callable[[], Any] | None = None


def set_encoder_getter(getter: Callable[[], Any]) -> None:
    global _encoder_getter
    _encoder_getter = getter


def get_shared_encoder() -> Any:
    if _encoder_getter is None:
        raise RuntimeError("Shared encoder getter has not been configured.")
    return _encoder_getter()


def _joined_value(value: Any) -> str:
    if isinstance(value, list):
        return ", ".join(str(item) for item in value if item is not None and str(item).strip())
    return str(value).strip() if value is not None else ""


def _resume_items_text(items: Any, fields: tuple[str, ...]) -> str:
    if not isinstance(items, list):
        return ""
    sections = []
    for item in items:
        if not isinstance(item, dict):
            continue
        parts = [_joined_value(item.get(field)) for field in fields]
        section = ". ".join(part for part in parts if part)
        if section:
            sections.append(section)
    return ". ".join(sections)


def student_embedding_text(student: StudentProfileRecord) -> str:
    """Build the embedding source text from the confirmed student-profile fields."""
    skills_text = ", ".join(student.skill_tags) if student.skill_tags else student.skills
    interests_text = ", ".join(student.interests)
    projects = []
    for project in student.projects:
        title = _joined_value(project.get("title"))
        description = _joined_value(project.get("description"))
        technologies = _joined_value(project.get("technologies"))
        projects.append(f"{title}: {description}. Technologies: {technologies}")

    details = student.resume_details
    education_text = _resume_items_text(
        details.get("education"),
        ("degree", "fieldOfStudy", "university", "academicYear", "cgpa"),
    )
    internships_text = _resume_items_text(
        details.get("internships"),
        ("role", "organization", "description", "technologies"),
    )
    work_text = _resume_items_text(
        details.get("workExperience"),
        ("role", "organization", "description", "technologies"),
    )
    research_text = _resume_items_text(
        details.get("researchExperience"),
        ("title", "role", "organization", "description", "technologies"),
    )
    certifications_text = _joined_value(details.get("certifications"))
    achievements_text = _joined_value(details.get("achievements"))
    return (
        f"Student background. Department: {student.department}. Academic year: {student.academic_year}. "
        f"Skills: {skills_text}. Research interests: {interests_text}. Projects: {' '.join(projects)}. "
        f"Education: {education_text}. Internships: {internships_text}. Work experience: {work_text}. "
        f"Certifications: {certifications_text}. Achievements: {achievements_text}. "
        f"Research experience: {research_text}"
    )


@router.post(
    "/students/analyze-resume",
    response_model=StudentResumeAnalysisResponse,
    tags=["Student Resume Intelligence"],
)
async def analyze_student_resume_endpoint(
    file: UploadFile = File(...),
) -> StudentResumeAnalysisResponse:
    """Extract a resume PDF and return a validated student profile draft."""
    filename = file.filename or "resume.pdf"
    if not (filename.lower().endswith(".pdf") or file.content_type == "application/pdf"):
        raise HTTPException(status_code=415, detail="Only PDF resumes are supported.")

    content = await file.read(MAX_STUDENT_RESUME_SIZE + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The uploaded resume is empty.")
    if len(content) > MAX_STUDENT_RESUME_SIZE:
        raise HTTPException(status_code=413, detail="Resume PDF exceeds the 25 MB limit.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")

    try:
        extracted = extract_single_document(
            content,
            filename=filename,
            document_type="resume",
        )
    except Exception as exc:
        logger.exception("Student resume PDF text extraction failed.")
        raise HTTPException(
            status_code=422,
            detail="Could not extract readable text from the resume PDF.",
        ) from exc

    if not extracted.text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable resume text was found, including after OCR fallback.",
        )

    try:
        profile: StudentResumeProfile = analyze_student_resume(extracted.text)
    except StudentResumeConfigurationError as exc:
        logger.error("Student resume analysis is not configured.")
        raise HTTPException(
            status_code=503,
            detail="Resume analysis is not configured.",
        ) from exc
    except (StudentResumeProviderError, StudentResumeResponseError) as exc:
        logger.error("Student resume analysis failed: %s", exc)
        raise HTTPException(
            status_code=502,
            detail="Resume analysis could not produce a valid profile draft.",
        ) from exc

    return StudentResumeAnalysisResponse(
        profile=profile,
        extraction_metadata=extracted.to_metadata(),
        warnings=extracted.warnings,
    )


MAX_FORMAT_VALIDATION_SIZE = 20 * 1024 * 1024


@router.post(
    "/validate-format",
    tags=["Conference Paper Screening"],
)
async def validate_paper_format(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Validate an uploaded research paper PDF against preliminary IEEE checks."""

    filename = file.filename or "paper.pdf"

    if not (
        filename.lower().endswith(".pdf")
        or file.content_type == "application/pdf"
    ):
        raise HTTPException(
            status_code=415,
            detail="Only PDF research papers are supported.",
        )

    content = await file.read(MAX_FORMAT_VALIDATION_SIZE + 1)

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is empty.",
        )

    if len(content) > MAX_FORMAT_VALIDATION_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Research paper exceeds the 20 MB limit.",
        )

    if not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid PDF.",
        )

    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            delete=False,
        ) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        result = check_ieee_format(temp_path)

        return {
            **result,
            "filename": filename,
            "validation_type": "preliminary_ieee_format_check",
        }

    except Exception as exc:
        logger.exception("Conference paper format validation failed.")

        raise HTTPException(
            status_code=500,
            detail="Could not validate the uploaded research paper.",
        ) from exc

    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

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
    embedding_dimensions: int
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


class StudentProfileSyncResponse(BaseModel):
    student_id: str
    embedding_dimensions: int


def build_student_embedding(student: StudentProfileRecord, encoder: Any) -> list[float]:
    """Generate normalized 384-dim embedding for student from profile text."""
    vec = encoder.encode([student_embedding_text(student)], normalize_embeddings=True)[0]
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


def seed_demo_professor_profiles_if_empty(encoder: Any) -> None:
    """Create confirmed, clearly labelled test profiles when no faculty profiles exist."""
    if storage.get_all_confirmed_profiles():
        return

    demo_profiles = [
        (
            "-1001",
            "[TEST DATA] Dr. Demo Machine Learning Professor",
            "Computer Science and Engineering [DEMO]",
            ResearchProfile(
                research_interests=[
                    "Machine Learning",
                    "Collaborative research",
                    "Natural Language Processing",
                ],
                research_domains=["Artificial Intelligence", "Natural Language Processing"],
                methods=["Python", "PyTorch", "Transformers"],
                publications=["TEST DATA: Demonstration study of compact language models"],
                contributions=["Synthetic profile for validating recommendation matching."],
                embedding_text=(
                    "TEST DATA professor profile. Research in machine learning, collaborative "
                    "research, and natural language processing. Uses Python, PyTorch, and "
                    "transformers to build reliable language models."
                ),
            ),
        ),
        (
            "-1002",
            "[TEST DATA] Dr. Demo Computer Vision Professor",
            "Computer Science and Engineering [DEMO]",
            ResearchProfile(
                research_interests=["Machine Learning", "Computer Vision", "Medical Imaging"],
                research_domains=["Artificial Intelligence", "Computer Vision"],
                methods=["PyTorch", "Convolutional Neural Networks", "Image Segmentation"],
                publications=["TEST DATA: Demonstration study of image segmentation"],
                contributions=["Synthetic profile for validating recommendation matching."],
                embedding_text=(
                    "TEST DATA professor profile. Research in machine learning, computer "
                    "vision, and medical imaging. Uses PyTorch and convolutional neural "
                    "networks for image segmentation."
                ),
            ),
        ),
        (
            "-1003",
            "[TEST DATA] Dr. Demo Cybersecurity Professor",
            "Computer Science and Engineering [DEMO]",
            ResearchProfile(
                research_interests=["Cybersecurity", "Software assurance", "Collaborative research"],
                research_domains=["Application Security", "Privacy Engineering"],
                methods=["Secure coding", "Threat modeling", "Security testing"],
                publications=["TEST DATA: Demonstration study of software assurance"],
                contributions=["Synthetic profile for validating recommendation matching."],
                embedding_text=(
                    "TEST DATA professor profile. Research in cybersecurity, software "
                    "assurance, and privacy engineering. Uses secure coding, threat modeling, "
                    "and security testing to improve application safety."
                ),
            ),
        ),
        (
            "-1004",
            "[TEST DATA] Dr. Demo Distributed Systems Professor",
            "Computer Science and Engineering [DEMO]",
            ResearchProfile(
                research_interests=["Distributed Systems", "Cloud Computing", "Observability"],
                research_domains=["Cloud and Web Systems", "Reliable Infrastructure"],
                methods=["Java", "Service Monitoring", "Fault-tolerant Systems"],
                publications=["TEST DATA: Demonstration study of observable services"],
                contributions=["Synthetic profile for validating recommendation matching."],
                embedding_text=(
                    "TEST DATA professor profile. Research in distributed systems, cloud "
                    "computing, and observability. Uses Java and service monitoring to build "
                    "reliable, fault-tolerant infrastructure."
                ),
            ),
        ),
    ]

    for professor_id, professor_name, department, profile in demo_profiles:
        embedding = encoder.encode([profile.embedding_text], normalize_embeddings=True)[0]
        if len(embedding) != 384:
            raise RuntimeError(
                f"Demo professor embedding for {professor_id} has {len(embedding)} dimensions; expected 384."
            )
        storage.save_confirmed_profile(
            professor_id=professor_id,
            confirmed_profile=profile,
            original_profile=None,
            stated_requirements=None,
            layman_summary=None,
            embedding=embedding,
            professor_name=professor_name,
            department=department,
            is_demo=True,
        )

    logger.info(
        "Seeded %d confirmed test professor profiles with 384-dimensional embeddings.",
        len(demo_profiles),
    )


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
    if len(files) > MAX_PROFESSOR_DOCUMENT_COUNT:
        raise HTTPException(
            status_code=413,
            detail=f"Upload no more than {MAX_PROFESSOR_DOCUMENT_COUNT} research documents at a time.",
        )

    extracted_docs = []
    types_list = document_types or []
    total_size = 0

    for idx, file in enumerate(files):
        filename = file.filename or f"doc_{idx + 1}.pdf"
        if not (filename.lower().endswith(".pdf") or file.content_type == "application/pdf"):
            raise HTTPException(
                status_code=415,
                detail=f"File '{filename}' is not a PDF. Only PDF documents are supported.",
            )

        if idx < len(types_list) and types_list[idx].strip().lower() not in {
            "cv", "paper", "publication", "other",
        }:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported document type for '{filename}'.",
            )

        content = await file.read(MAX_PROFESSOR_FILE_SIZE + 1)
        if len(content) > MAX_PROFESSOR_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{filename}' exceeds maximum allowed size of 25MB.",
            )
        total_size += len(content)
        if total_size > MAX_PROFESSOR_TOTAL_SIZE:
            raise HTTPException(
                status_code=413,
                detail="The combined research documents exceed the 100MB upload limit.",
            )
        if not content:
            raise HTTPException(status_code=400, detail=f"File '{filename}' is empty.")
        if not content.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' is not a valid PDF.",
            )

        doc_type = "paper"
        if idx < len(types_list) and types_list[idx].strip():
            doc_type = types_list[idx].strip().lower()
        elif "cv" in filename.lower() or "resume" in filename.lower():
            doc_type = "cv"

        extracted = extract_single_document(content, filename=filename, document_type=doc_type)
        extracted_docs.append(extracted)

    # Combine extracted texts preserving document boundaries
    combined = combine_documents(extracted_docs)
    if not combined.has_readable_content:
        return ProfessorAnalysisResult(
            status="no_research_content",
            no_research_content=True,
            reason="No readable academic content was extracted from these documents, including after OCR.",
            extraction_metadata=combined.documents_metadata,
            warnings=combined.warnings
            + ["Upload a text-based or clearly scanned research CV or document and try again."],
        )

    draft_id = f"draft_{uuid.uuid4().hex[:12]}"

    # Run Groq LLM research analysis
    result = analyze_professor_documents(
        combined_text=combined.combined_text,
        documents_metadata=combined.documents_metadata,
        draft_id=draft_id,
    )
    result.draft_id = draft_id
    result.extraction_metadata = combined.documents_metadata
    result.warnings.extend(combined.warnings)

    if result.status == "config_error":
        raise HTTPException(status_code=503, detail=result.reason or "AI analysis is not configured.")
    if result.status == "error":
        status_code = {
            "rate_limited": 429,
            "timeout": 504,
        }.get(result.error_code, 502)
        raise HTTPException(
            status_code=status_code,
            detail=result.reason or "The AI provider could not analyze these documents.",
        )
    if result.status != "success" or result.research_profile is None:
        raise HTTPException(status_code=502, detail="The AI provider returned an incomplete research profile.")

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

    if not any([
        profile.research_interests,
        profile.research_domains,
        profile.methods,
        profile.publications,
        profile.contributions,
    ]):
        raise HTTPException(
            status_code=422,
            detail="Cannot confirm an empty research profile. Provide at least research interests or domains.",
        )

    # Generate normalized 384-dim embedding using shared SentenceTransformer
    try:
        encoder = get_shared_encoder()
        embedding_vector = np.asarray(
            encoder.encode([embedding_text], normalize_embeddings=True)[0],
            dtype=np.float32,
        )
        if (
            embedding_vector.shape != (384,)
            or not np.isfinite(embedding_vector).all()
            or not np.isclose(float(np.linalg.norm(embedding_vector)), 1.0, atol=1e-3)
        ):
            raise ValueError("The encoder returned an invalid normalized 384-dimensional vector.")
    except Exception as exc:
        logger.error("Embedding generation failed during confirmation (%s).", type(exc).__name__)
        raise HTTPException(
            status_code=500, detail="Embedding generation failed. Please retry."
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
        embedding_dimensions=int(embedding_vector.shape[0]),
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

    title = request.title.strip()
    description = request.description.strip()
    existing = storage.get_opportunity(opp_id)
    if existing is not None and (
        existing.embedding is not None
        and len(existing.embedding) == 384
        and existing.title == title
        and existing.description == description
        and existing.research_domains == request.research_domains
        and existing.required_skills == request.required_skills
    ):
        existing.professor_id = request.professor_id
        existing.preferred_skills = request.preferred_skills
        existing.preferred_years = request.preferred_years
        existing.eligibility_criteria = request.eligibility_criteria
        existing.status = request.status or "open"
        opportunity = storage.save_opportunity(existing)
    else:
        opp_text = (
            f"Research opening: {title}. "
            f"Domains: {', '.join(request.research_domains)}. "
            f"Required skills: {', '.join(request.required_skills)}. "
            f"Description: {description}"
        )

        try:
            encoder = get_shared_encoder()
            embedding_vec = encoder.encode([opp_text], normalize_embeddings=True)[0].tolist()
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Failed to generate opportunity embedding: {exc}"
            ) from exc

        opportunity = OpportunityContext(
            opportunity_id=opp_id,
            professor_id=request.professor_id,
            title=title,
            description=description,
            research_domains=request.research_domains,
            required_skills=request.required_skills,
            preferred_skills=request.preferred_skills,
            preferred_years=request.preferred_years,
            eligibility_criteria=request.eligibility_criteria,
            status=request.status or "open",
            embedding=embedding_vec,
        )
        if existing is not None:
            opportunity.created_at = existing.created_at
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


# ---------------------------------------------------------
# 9. Student-to-Professor Research Matching
# ---------------------------------------------------------

@router.put(
    "/students/{student_id}/profile",
    response_model=StudentProfileSyncResponse,
)
def sync_student_profile(
    student_id: str,
    student: StudentProfileRecord,
) -> StudentProfileSyncResponse:
    """Synchronize the authenticated app profile and generate its matching embedding."""
    if str(student.id) != student_id:
        raise HTTPException(
            status_code=400,
            detail="Student profile ID must match the request path.",
        )

    encoder = get_shared_encoder()
    existing = storage.get_student(student_id)
    if (
        existing is not None
        and existing.embedding is not None
        and len(existing.embedding) == 384
        and student_embedding_text(existing) == student_embedding_text(student)
    ):
        student.embedding = existing.embedding
    else:
        student.embedding = build_student_embedding(student, encoder)
    if len(student.embedding) != 384:
        raise HTTPException(
            status_code=500,
            detail="Student embedding generation returned an invalid dimension.",
        )

    storage.save_student(student)
    logger.info("Synchronized student %s with a 384-dimensional embedding.", student_id)
    return StudentProfileSyncResponse(
        student_id=student_id,
        embedding_dimensions=len(student.embedding),
    )


@router.post(
    "/students/{student_id}/match-professors",
    response_model=dict[str, Any],
)
def match_professors_for_student(
    student_id: str,
    top_k: int = Query(default=20, ge=1, le=100),
) -> dict[str, Any]:
    """
    Rank confirmed professors for a student using research
    embedding cosine similarity.
    """

    encoder = get_shared_encoder()

    student = storage.get_student(student_id)

    if not student:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Student profile '{student_id}' not found. "
                "Please register a student profile first."
            ),
        )

    # Generate student embedding if missing
    if not student.embedding or len(student.embedding) != 384:
        student.embedding = build_student_embedding(student, encoder)
        storage.save_student(student)

    # Retrieve all confirmed professor profiles and embeddings
    professors = storage.get_all_confirmed_profiles_with_embeddings()

    if not professors:
        seed_demo_professor_profiles_if_empty(encoder)
        professors = storage.get_all_confirmed_profiles_with_embeddings()

    # Rank professors for this student
    ranked_matches = rank_professors_for_student(
        student=student,
        professors=professors,
        top_k=top_k,
    )
    matches = []
    for match in ranked_matches:
        professor = storage.get_confirmed_profile(str(match["professor_id"]))
        if professor is None:
            continue
        matches.append({
            **match,
            "professor_name": professor.professor_name,
            "department": professor.department,
            "is_demo": professor.is_demo,
        })

    return {
        "student_id": student_id,
        "matches": matches,
        "count": len(matches),
        "note": (
            "Professors ranked by semantic research similarity "
            "using cosine similarity between normalized embeddings."
        ),
    }
