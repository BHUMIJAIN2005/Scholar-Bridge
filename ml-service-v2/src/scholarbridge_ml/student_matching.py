import logging
import re
from typing import Any
import numpy as np
from pydantic import BaseModel, Field


from scholarbridge_ml.storage import (
    OpportunityContext,
    StudentOpportunityMatch,
    StudentProfileRecord,
)
from scholarbridge_ml.professor_analyzer import ResearchProfile, StatedRequirements

logger = logging.getLogger("scholarbridge_ml.student_matching")

DEFAULT_WEIGHTS = {
    "research_similarity": 0.55,
    "skill_match": 0.20,
    "experience_match": 0.15,
    "preference_match": 0.10,
}


class FactorScores(BaseModel):
    research_similarity: float
    skill_match: float | None = None
    experience_match: float | None = None
    preference_match: float | None = None


class StudentMatchResult(BaseModel):
    student_id: str | int
    student_name: str
    department: str
    academic_year: str
    research_interests: list[str] = Field(default_factory=list)
    relevant_technical_skills: list[str] = Field(default_factory=list)
    match_score: float  # 0 to 100
    research_similarity_score: float  # 0 to 100
    skill_match_score: float | None = None  # 0 to 100
    experience_match_score: float | None = None  # 0 to 100
    preference_match_score: float | None = None  # 0 to 100
    shared_research_interests: list[str] = Field(default_factory=list)
    why_matched: str


def _tokenize(text: str) -> set[str]:
    """Tokenize and normalize text into lowercase alphanumeric tokens."""
    if not text:
        return set()
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    stops = {"and", "or", "the", "a", "an", "in", "on", "for", "with", "to", "of", "using", "by"}
    return {w for w in cleaned.split() if len(w) > 1 and w not in stops}


def compute_skill_overlap(
    professor_skills: list[str],
    student_skills: list[str],
) -> tuple[float, list[str]]:
    """
    Compute overlap between professor's required methods/skills and student's skills.
    Returns normalized score [0, 1] and list of matching skills.
    """
    if not professor_skills:
        return 0.5, []
    if not student_skills:
        return 0.0, []

    matched = []
    prof_norm = [s.strip().lower() for s in professor_skills if s.strip()]
    stud_norm = {s.strip().lower(): s for s in student_skills if s.strip()}

    for p in prof_norm:
        p_tokens = _tokenize(p)
        for s_lower, orig in stud_norm.items():
            s_tokens = _tokenize(s_lower)
            if p == s_lower or (p_tokens and p_tokens.issubset(s_tokens)) or (s_tokens and s_tokens.issubset(p_tokens)):
                if orig not in matched:
                    matched.append(orig)

    coverage = len(matched) / max(len(prof_norm), 1)
    score = min(1.0, max(0.0, coverage))
    return round(score, 4), matched


def compute_experience_score(
    professor_domains: list[str],
    professor_methods: list[str],
    student_projects: list[dict[str, str]],
    student_papers: list[dict[str, Any]],
) -> tuple[float | None, list[str]]:
    """
    Evaluate project and research experience based on actual projects and papers.
    If student has no projects or papers, returns None (unavailable, no penalty).
    """
    if not student_projects and not student_papers:
        return None, []

    prof_keywords = set()
    for d in professor_domains:
        prof_keywords.update(_tokenize(d))
    for m in professor_methods:
        prof_keywords.update(_tokenize(m))

    if not prof_keywords:
        return 0.5, []

    matching_evidence: list[str] = []
    matches_count = 0

    for project in student_projects:
        title = project.get("title", "")
        desc = project.get("description", "")
        proj_tokens = _tokenize(f"{title} {desc}")
        overlap = prof_keywords.intersection(proj_tokens)
        if overlap:
            matches_count += len(overlap)
            if title and title not in matching_evidence:
                matching_evidence.append(title)

    for paper in student_papers:
        title = paper.get("title", "")
        category = paper.get("category", "")
        paper_tokens = _tokenize(f"{title} {category}")
        overlap = prof_keywords.intersection(paper_tokens)
        if overlap:
            matches_count += len(overlap) * 2
            if title and title not in matching_evidence:
                matching_evidence.append(title)

    if matches_count == 0:
        return 0.2, []

    score = min(1.0, 0.4 + (matches_count * 0.15))
    return round(score, 4), matching_evidence


def compute_preference_score(
    stated_requirements: StatedRequirements | None,
    student_year: str,
    student_skills: list[str],
) -> tuple[float | None, list[str]]:
    """
    Score against explicitly stated professor preferences.
    If professor has no stated preferences, returns None (unavailable).
    """
    if not stated_requirements:
        return None, []

    pref_years = stated_requirements.preferred_years or []
    pref_skills = stated_requirements.preferred_skills or []

    if not pref_years and not pref_skills:
        return None, []

    factors_checked = 0
    factors_met = 0
    matched_pref: list[str] = []

    if pref_years:
        factors_checked += 1
        student_year_norm = student_year.strip().lower()
        if any(y.strip().lower() in student_year_norm for y in pref_years):
            factors_met += 1
            matched_pref.append(f"Academic Year ({student_year})")

    if pref_skills:
        factors_checked += 1
        _, matched_sk = compute_skill_overlap(pref_skills, student_skills)
        if matched_sk:
            factors_met += min(1.0, len(matched_sk) / max(len(pref_skills), 1))
            matched_pref.extend(matched_sk)

    score = factors_met / max(factors_checked, 1)
    return round(min(1.0, max(0.0, score)), 4), matched_pref


def generate_why_matched(
    student_name: str,
    matched_interests: list[str],
    matched_skills: list[str],
    matched_projects: list[str],
    professor_domains: list[str],
    similarity_score: float,
) -> str:
    """
    Deterministic factual explanation generator.
    Only mentions facts actually present in student and professor profiles.
    Does NOT describe similarity scores as probabilities.
    """
    reasons = []

    if matched_interests:
        interests_str = ", ".join(matched_interests[:3])
        reasons.append(f"shared research focus in {interests_str}")

    if matched_skills:
        skills_str = ", ".join(matched_skills[:3])
        reasons.append(f"demonstrated technical skills in {skills_str}")

    if matched_projects:
        proj = matched_projects[0]
        reasons.append(f"relevant project work on '{proj}'")

    if reasons:
        explanation = f"Matches due to {'; '.join(reasons)}."
    elif professor_domains:
        domain = professor_domains[0]
        explanation = f"Demonstrates solid background alignment with your research in {domain}."
    else:
        explanation = "Demonstrates semantic research and technical background alignment."

    return explanation


def calculate_normalized_composite_score(
    scores: dict[str, float | None],
    base_weights: dict[str, float] | None = None,
) -> float:
    """
    Calculate composite score with dynamic weight normalization:
    When an optional factor is unavailable (None), normalize the remaining
    weights so they sum to 1.0. Does not penalize students for missing optional info.
    Returns composite score in [0.0, 1.0].
    """
    weights = base_weights or DEFAULT_WEIGHTS
    active_weights: dict[str, float] = {}
    active_scores: dict[str, float] = {}

    for factor, score in scores.items():
        if score is not None and factor in weights:
            active_weights[factor] = weights[factor]
            active_scores[factor] = score

    total_weight = sum(active_weights.values())
    if total_weight <= 0:
        return 0.0

    composite = sum(
        (weight / total_weight) * active_scores[factor]
        for factor, weight in active_weights.items()
    )

    return min(1.0, max(0.0, composite))


def rank_students_for_professor(
    professor_profile: ResearchProfile,
    professor_embedding: np.ndarray,
    students: list[StudentProfileRecord],
    stated_requirements: StatedRequirements | None = None,
    weights: dict[str, float] | None = None,
    top_k: int = 50,
) -> list[StudentMatchResult]:
    """
    Rank students for a professor using batched NumPy vector operations and
    explainable multi-factor scoring.
    """
    if not students:
        return []

    valid_students: list[StudentProfileRecord] = []
    embedding_matrix_list: list[list[float]] = []

    for s in students:
        if s.embedding and len(s.embedding) == 384:
            valid_students.append(s)
            embedding_matrix_list.append(s.embedding)

    if not valid_students:
        logger.warning("No students with valid 384-dimensional embeddings found.")
        return []

    # Batched NumPy dot product: (N, 384) x (384,) -> (N,)
    student_embeddings = np.array(embedding_matrix_list, dtype=np.float32)
    prof_vector = np.array(professor_embedding, dtype=np.float32).flatten()

    raw_similarities = np.dot(student_embeddings, prof_vector)

    results: list[StudentMatchResult] = []

    prof_methods = professor_profile.methods or []
    prof_domains = professor_profile.research_domains or []
    prof_interests = professor_profile.research_interests or []

    for idx, student in enumerate(valid_students):
        sim = float(raw_similarities[idx])
        research_sim = min(1.0, max(0.0, sim))

        # Skill match
        all_student_skills = list(
            set(student.skill_tags + [s.strip() for s in student.skills.split(",") if s.strip()])
        )
        skill_score, matched_skills = compute_skill_overlap(prof_methods, all_student_skills)
        if not all_student_skills:
            skill_score = None  # Missing student skills -> normalize weights, do not penalize

        # Experience match
        exp_score, matched_projects = compute_experience_score(
            prof_domains, prof_methods, student.projects, student.papers
        )

        # Preference match
        pref_score, _ = compute_preference_score(
            stated_requirements, student.academic_year, all_student_skills
        )

        # Identify overlapping research interests
        student_interests_norm = {i.strip().lower(): i for i in student.interests if i.strip()}
        matched_interests = [
            student_interests_norm[p.strip().lower()]
            for p in prof_interests
            if p.strip().lower() in student_interests_norm
        ]

        factor_dict = {
            "research_similarity": research_sim,
            "skill_match": skill_score,
            "experience_match": exp_score,
            "preference_match": pref_score,
        }

        composite_score = calculate_normalized_composite_score(factor_dict, weights)
        final_score_100 = round(composite_score * 100.0, 1)

        why_matched = generate_why_matched(
            student_name=student.name,
            matched_interests=matched_interests,
            matched_skills=matched_skills,
            matched_projects=matched_projects,
            professor_domains=prof_domains,
            similarity_score=research_sim,
        )

        results.append(
            StudentMatchResult(
                student_id=student.id,
                student_name=student.name,
                department=student.department,
                academic_year=student.academic_year,
                research_interests=student.interests,
                relevant_technical_skills=matched_skills or all_student_skills[:4],
                match_score=final_score_100,
                research_similarity_score=round(research_sim * 100.0, 1),
                skill_match_score=round(skill_score * 100.0, 1) if skill_score is not None else None,
                experience_match_score=round(exp_score * 100.0, 1) if exp_score is not None else None,
                preference_match_score=round(pref_score * 100.0, 1) if pref_score is not None else None,
                shared_research_interests=matched_interests,
                why_matched=why_matched,
            )
        )

    results.sort(key=lambda r: r.match_score, reverse=True)
    return results[:top_k]


def rank_students_for_opportunity(
    opportunity: OpportunityContext,
    professor_profile: ResearchProfile | None,
    opportunity_embedding: np.ndarray,
    students: list[StudentProfileRecord],
    weights: dict[str, float] | None = None,
    top_k: int = 50,
) -> list[StudentMatchResult]:
    """
    Opportunity-specific student ranking.
    Preserves professor's overall research profile while tailoring recommendations
    to the specific opening's requirements and context.
    """
    opportunity_requirements = StatedRequirements(
        preferred_skills=opportunity.preferred_skills or opportunity.required_skills,
        preferred_years=opportunity.preferred_years,
        notes="Opportunity-specific requirements",
    )

    base_interests = professor_profile.research_interests if professor_profile else []
    base_domains = (
        opportunity.research_domains
        or (professor_profile.research_domains if professor_profile else [])
    )
    base_methods = (
        opportunity.required_skills
        or (professor_profile.methods if professor_profile else [])
    )

    opp_profile = ResearchProfile(
        research_interests=base_interests,
        research_domains=base_domains,
        methods=base_methods,
        publications=professor_profile.publications if professor_profile else [],
        contributions=professor_profile.contributions if professor_profile else [],
        embedding_text=opportunity.description,
    )

    return rank_students_for_professor(
        professor_profile=opp_profile,
        professor_embedding=opportunity_embedding,
        students=students,
        stated_requirements=opportunity_requirements,
        weights=weights,
        top_k=top_k,
    )


def rank_opportunities_for_student(
    student: StudentProfileRecord,
    opportunities: list[OpportunityContext],
    top_k: int = 50,
) -> list[StudentOpportunityMatch]:
    """
    Student opportunity feed ranking:
    1. Compares student's stored embedding against open opportunity embeddings via batched dot product.
    2. Ranks opportunities by relevance.
    3. Analyzes required skills and eligibility criteria against student's skills/year.
    4. Displays matching reasons and eligibility gaps (e.g. skills to develop) rather than silently removing.
    """
    if not opportunities or not student.embedding or len(student.embedding) != 384:
        return []

    unique_opportunities: dict[str, OpportunityContext] = {}
    for opportunity in opportunities:
        if (
            opportunity.status.lower() == "open"
            and opportunity.embedding
            and len(opportunity.embedding) == 384
        ):
            unique_opportunities.setdefault(opportunity.opportunity_id, opportunity)
    valid_opps = list(unique_opportunities.values())
    if not valid_opps:
        return []

    opp_embeddings = np.array([opp.embedding for opp in valid_opps], dtype=np.float32)
    student_vector = np.array(student.embedding, dtype=np.float32).flatten()

    similarities = np.dot(opp_embeddings, student_vector)

    all_student_skills = list(
        set(student.skill_tags + [s.strip() for s in student.skills.split(",") if s.strip()])
    )
    student_skills_lower = {s.lower(): s for s in all_student_skills}
    student_year_lower = student.academic_year.strip().lower()

    matches: list[StudentOpportunityMatch] = []

    for idx, opp in enumerate(valid_opps):
        sim = float(similarities[idx])
        relevance_score = min(1.0, max(0.0, sim))

        # Check required skills
        _, matched_skills = compute_skill_overlap(opp.required_skills, all_student_skills)
        missing_skills = [
            req for req in opp.required_skills
            if not any(req.lower() in s or s in req.lower() for s in student_skills_lower)
        ]

        # Check preferred years
        missing_year = False
        if opp.preferred_years and not any(y.lower() in student_year_lower for y in opp.preferred_years):
            missing_year = True

        reasons = []
        if matched_skills:
            reasons.append(f"You have required skills in: {', '.join(matched_skills[:3])}")
        if any(d.lower() in [i.lower() for i in student.interests] for d in opp.research_domains):
            reasons.append(f"Aligns with your research interests in {', '.join(opp.research_domains[:2])}")
        if not reasons:
            reasons.append("Strong semantic overlap with your research and project background")

        gaps = []
        if missing_skills:
            gaps.append(f"Desired skills: {', '.join(missing_skills[:3])}")
        if missing_year and opp.preferred_years:
            gaps.append(f"Preferred academic years: {', '.join(opp.preferred_years)}")
        if opp.eligibility_criteria:
            for crit in opp.eligibility_criteria:
                gaps.append(f"Criteria: {crit}")

        # Final composite opportunity score (relevance 65%, skill overlap 35%)
        skill_coverage = len(matched_skills) / max(len(opp.required_skills), 1) if opp.required_skills else 0.8
        composite = 0.65 * relevance_score + 0.35 * min(1.0, skill_coverage)
        match_score_100 = round(composite * 100.0, 1)

        matches.append(
            StudentOpportunityMatch(
                opportunity_id=opp.opportunity_id,
                professor_id=opp.professor_id,
                title=opp.title,
                description=opp.description,
                research_domains=opp.research_domains,
                required_skills=opp.required_skills,
                match_score=match_score_100,
                relevance_score=round(relevance_score * 100.0, 1),
                matching_reasons=reasons,
                eligibility_gaps=gaps,
                status=opp.status,
            )
        )

    matches.sort(key=lambda match: (match.match_score, match.relevance_score), reverse=True)
    return matches[:top_k]


def rank_professors_for_student(
    student: StudentProfileRecord,
    professors: list[tuple[Any, np.ndarray]],
    top_k: int = 20,
) -> list[dict[str, Any]]:
    """
    Rank confirmed professors for a student using cosine similarity
    between their normalized research embeddings.

    Each item in professors contains:
        (StoredProfile, professor_embedding)
    """

    if not student.embedding or len(student.embedding) != 384:
        logger.warning(
            "Student %s does not have a valid 384-dimensional embedding.",
            student.id,
        )
        return []

    if not professors:
        return []

    student_vector = np.asarray(
        student.embedding, dtype=np.float32
    ).flatten()

    student_norm = np.linalg.norm(student_vector)

    if student_norm == 0:
        logger.warning("Student embedding has zero magnitude.")
        return []

    student_vector = student_vector / student_norm

    student_skills = list(
        set(
            student.skill_tags
            + [
                skill.strip()
                for skill in student.skills.split(",")
                if skill.strip()
            ]
        )
    )

    student_interests = {
        interest.strip().lower(): interest
        for interest in student.interests
        if interest.strip()
    }

    results = []

    for stored_profile, professor_embedding in professors:
        if not stored_profile.is_confirmed:
            continue

        if professor_embedding is None:
            continue

        professor_vector = np.asarray(
            professor_embedding, dtype=np.float32
        ).flatten()

        if professor_vector.shape[0] != 384:
            continue

        professor_norm = np.linalg.norm(professor_vector)

        if professor_norm == 0:
            continue

        professor_vector = professor_vector / professor_norm

        # Cosine similarity between student and professor embeddings
        similarity = float(
            np.dot(student_vector, professor_vector)
        )

        similarity = min(1.0, max(0.0, similarity))

        profile = stored_profile.confirmed_profile

        professor_methods = profile.methods or []
        professor_domains = profile.research_domains or []
        professor_interests = profile.research_interests or []

        # Identify overlapping technical skills
        skill_score, matched_skills = compute_skill_overlap(
            professor_methods,
            student_skills,
        )

        # Identify shared research interests
        professor_interest_set = {
            interest.strip().lower(): interest
            for interest in professor_interests
            if interest.strip()
        }

        shared_interests = [
            student_interests[key]
            for key in student_interests
            if key in professor_interest_set
        ]

        results.append(
            {
                "professor_id": stored_profile.professor_id,
                "match_score": round(similarity * 100.0, 1),
                "research_similarity_score": round(
                    similarity * 100.0, 1
                ),
                "matched_skills": matched_skills,
                "shared_research_interests": shared_interests,
                "research_domains": professor_domains,
                "research_interests": professor_interests,
                "methods": professor_methods,
                "skill_match_score": round(skill_score * 100.0, 1),
                "why_matched": (
                    "Research alignment with "
                    + ", ".join(professor_domains[:3])
                    if professor_domains
                    else "Semantic alignment with your research profile."
                ),
            }
        )

    results.sort(
        key=lambda result: result["match_score"],
        reverse=True,
    )

    return results[:top_k]


    matches.sort(key=lambda m: m.match_score, reverse=True)
    return matches[:top_k]
