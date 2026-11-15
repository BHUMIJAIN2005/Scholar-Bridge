import logging
import threading
from datetime import datetime, timezone
from typing import Any
import numpy as np
from pydantic import BaseModel, Field

from scholarbridge_ml.professor_analyzer import (
    ResearchProfile,
    StatedRequirements,
    LaymanSummary,
)

logger = logging.getLogger("scholarbridge_ml.storage")


class StoredProfile(BaseModel):
    professor_id: str
    original_profile: ResearchProfile | None = None
    confirmed_profile: ResearchProfile
    stated_requirements: StatedRequirements | None = None
    layman_summary: LaymanSummary | None = None
    is_confirmed: bool = False
    confirmed_at: str = ""


class StudentProfileRecord(BaseModel):
    id: str | int
    name: str = "Anonymous Student"
    department: str = "Computer Science and Engineering"
    academic_year: str = "3rd Year"
    skills: str = ""
    skill_tags: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    projects: list[dict[str, str]] = Field(default_factory=list)
    papers: list[dict[str, Any]] = Field(default_factory=list)
    embedding: list[float] | None = None  # 384-dim normalized embedding


class OpportunityContext(BaseModel):
    opportunity_id: str
    professor_id: str
    title: str
    description: str
    research_domains: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    preferred_years: list[str] = Field(default_factory=list)
    eligibility_criteria: list[str] = Field(default_factory=list)
    status: str = "open"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    embedding: list[float] | None = None


class OpportunityPublicResponse(BaseModel):
    opportunity_id: str
    professor_id: str
    title: str
    description: str
    research_domains: list[str]
    required_skills: list[str]
    preferred_skills: list[str]
    preferred_years: list[str]
    eligibility_criteria: list[str]
    status: str
    created_at: str


class StudentOpportunityMatch(BaseModel):
    opportunity_id: str
    professor_id: str
    title: str
    description: str
    research_domains: list[str]
    required_skills: list[str]
    match_score: float  # 0 to 100
    relevance_score: float  # 0 to 100
    matching_reasons: list[str] = Field(default_factory=list)
    eligibility_gaps: list[str] = Field(default_factory=list)
    status: str



    # ---------------------------------------------------------------------
    # Application handling (student applications to opportunities)
    # ---------------------------------------------------------------------
    class ApplicationRecord(BaseModel):
        """Persisted student application snapshot.

        The ``profile_snapshot`` is a deep‑copy of the ``StudentProfileRecord``
        at the moment the application is created so later edits to the student
        profile do not affect historical applications.
        """
        application_id: str
        opportunity_id: str
        student_id: str
        note: str | None = None
        applied_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
        status: str = "applied"  # enum: applied, under_review, shortlisted, accepted, rejected
        match_score: float
        matching_factors: dict[str, float] = Field(default_factory=dict)
        profile_snapshot: StudentProfileRecord

    def __init__(self):
        self._lock = threading.RLock()
        self._unconfirmed_analyses: dict[str, dict[str, Any]] = {}
        self._confirmed_profiles: dict[str, StoredProfile] = {}
        self._embeddings: dict[str, np.ndarray] = {}  # professor_id -> np.ndarray (384,)
        self._opportunities: dict[str, OpportunityContext] = {}
        self._students: dict[str, StudentProfileRecord] = {}
        self._applications: dict[str, InMemoryStorage.ApplicationRecord] = {}

    """
    Isolated, thread-safe in-memory storage for professor research profiles,
    embeddings, opportunities, and student candidate profiles.
    Pre-configured for local dev and demo persistence.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._unconfirmed_analyses: dict[str, dict[str, Any]] = {}
        self._confirmed_profiles: dict[str, StoredProfile] = {}
        self._embeddings: dict[str, np.ndarray] = {}  # professor_id -> np.ndarray (384,)
        self._opportunities: dict[str, OpportunityContext] = {}
        self._students: dict[str, StudentProfileRecord] = {}

    def save_unconfirmed_analysis(self, draft_id: str, data: dict[str, Any]) -> None:
        with self._lock:
            self._unconfirmed_analyses[str(draft_id)] = data

    def get_unconfirmed_analysis(self, draft_id: str) -> dict[str, Any] | None:
        with self._lock:
            return self._unconfirmed_analyses.get(str(draft_id))

    def save_confirmed_profile(
        self,
        professor_id: str,
        confirmed_profile: ResearchProfile,
        original_profile: ResearchProfile | None,
        stated_requirements: StatedRequirements | None,
        layman_summary: LaymanSummary | None,
        embedding: np.ndarray,
    ) -> StoredProfile:
        with self._lock:
            stored = StoredProfile(
                professor_id=str(professor_id),
                original_profile=original_profile,
                confirmed_profile=confirmed_profile,
                stated_requirements=stated_requirements,
                layman_summary=layman_summary,
                is_confirmed=True,
                confirmed_at=datetime.now(timezone.utc).isoformat(),
            )
            self._confirmed_profiles[str(professor_id)] = stored
            self._embeddings[str(professor_id)] = embedding
            return stored

    def get_confirmed_profile(self, professor_id: str) -> StoredProfile | None:
        with self._lock:
            return self._confirmed_profiles.get(str(professor_id))

    def get_professor_embedding(self, professor_id: str) -> np.ndarray | None:
        with self._lock:
            return self._embeddings.get(str(professor_id))

    def save_opportunity(self, opportunity: OpportunityContext) -> OpportunityContext:
        with self._lock:
            self._opportunities[str(opportunity.opportunity_id)] = opportunity
            return opportunity

    def get_opportunity(self, opportunity_id: str) -> OpportunityContext | None:
        with self._lock:
            return self._opportunities.get(str(opportunity_id))

    def get_all_opportunities(self, open_only: bool = True) -> list[OpportunityContext]:
        with self._lock:
            if open_only:
                return [opp for opp in self._opportunities.values() if opp.status.lower() == "open"]
            return list(self._opportunities.values())

    def save_student(self, student: StudentProfileRecord) -> StudentProfileRecord:
        with self._lock:
            self._students[str(student.id)] = student
            return student

    def get_student(self, student_id: str) -> StudentProfileRecord | None:
        with self._lock:
            return self._students.get(str(student_id))

    def get_all_students(self) -> list[StudentProfileRecord]:
        with self._lock:
            return list(self._students.values())

    def clear(self) -> None:
        with self._lock:
            self._unconfirmed_analyses.clear()
            self._confirmed_profiles.clear()
            self._embeddings.clear()
            self._opportunities.clear()
            self._students.clear()


# Global singleton storage instance
storage = InMemoryStorage()
