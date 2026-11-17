
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
    professor_name: str | None = None
    department: str | None = None
    original_profile: ResearchProfile | None = None
    confirmed_profile: ResearchProfile
    stated_requirements: StatedRequirements | None = None
    layman_summary: LaymanSummary | None = None
    is_confirmed: bool = False
    is_demo: bool = False
    confirmed_at: str = ""


class StudentProfileRecord(BaseModel):
    id: str | int
    name: str = "Anonymous Student"
    department: str = "Computer Science and Engineering"
    academic_year: str = "3rd Year"
    skills: str = ""
    skill_tags: list[str] = Field(default_factory=list)
    interests: list[str] = Field(default_factory=list)
    projects: list[dict[str, Any]] = Field(default_factory=list)
    papers: list[dict[str, Any]] = Field(default_factory=list)
    resume_details: dict[str, Any] = Field(default_factory=dict)
    embedding: list[float] | None = None  # 384-dimensional normalized embedding


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
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
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
    match_score: float
    relevance_score: float
    matching_reasons: list[str] = Field(default_factory=list)
    eligibility_gaps: list[str] = Field(default_factory=list)
    status: str


class ApplicationRecord(BaseModel):
    """Student application snapshot."""

    application_id: str
    opportunity_id: str
    student_id: str
    note: str | None = None
    applied_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    status: str = "applied"
    match_score: float
    matching_factors: dict[str, float] = Field(default_factory=dict)
    profile_snapshot: StudentProfileRecord


class InMemoryStorage:
    """Thread-safe in-memory storage for ScholarBridge."""

    def __init__(self):
        self._lock = threading.RLock()

        self._unconfirmed_analyses: dict[str, dict[str, Any]] = {}
        self._confirmed_profiles: dict[str, StoredProfile] = {}
        self._embeddings: dict[str, np.ndarray] = {}
        self._opportunities: dict[str, OpportunityContext] = {}
        self._students: dict[str, StudentProfileRecord] = {}
        self._applications: dict[str, ApplicationRecord] = {}

    def save_unconfirmed_analysis(
        self, draft_id: str, data: dict[str, Any]
    ) -> None:
        with self._lock:
            self._unconfirmed_analyses[str(draft_id)] = data

    def get_unconfirmed_analysis(
        self, draft_id: str
    ) -> dict[str, Any] | None:
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
        professor_name: str | None = None,
        department: str | None = None,
        is_demo: bool = False,
        confirmed_at: str | None = None,
    ) -> StoredProfile:
        with self._lock:
            professor_id = str(professor_id)

            stored = StoredProfile(
                professor_id=professor_id,
                professor_name=professor_name,
                department=department,
                original_profile=original_profile,
                confirmed_profile=confirmed_profile,
                stated_requirements=stated_requirements,
                layman_summary=layman_summary,
                is_confirmed=True,
                is_demo=is_demo,
                confirmed_at=confirmed_at or datetime.now(timezone.utc).isoformat(),
            )

            self._confirmed_profiles[professor_id] = stored
            self._embeddings[professor_id] = np.asarray(
                embedding, dtype=np.float32
            ).copy()

            return stored

    def get_confirmed_profile(
        self, professor_id: str
    ) -> StoredProfile | None:
        with self._lock:
            return self._confirmed_profiles.get(str(professor_id))

    def get_professor_embedding(
        self, professor_id: str
    ) -> np.ndarray | None:
        with self._lock:
            embedding = self._embeddings.get(str(professor_id))
            return embedding.copy() if embedding is not None else None

    def get_all_confirmed_profiles(self) -> list[StoredProfile]:
        """Return all professor profiles that have been confirmed."""
        with self._lock:
            return [
                profile
                for profile in self._confirmed_profiles.values()
                if profile.is_confirmed
            ]

    def get_all_confirmed_profiles_with_embeddings(
        self,
    ) -> list[tuple[StoredProfile, np.ndarray]]:
        """
        Return confirmed professor profiles paired with their embeddings.

        Profiles without an embedding are skipped because they cannot
        participate in cosine-similarity matching.
        """
        with self._lock:
            results = []

            for professor_id, profile in self._confirmed_profiles.items():
                embedding = self._embeddings.get(professor_id)

                if not profile.is_confirmed or embedding is None:
                    continue

                results.append((profile, embedding.copy()))

            return results

    def get_all_professor_embeddings(self) -> dict[str, np.ndarray]:
        """Return a copy of all stored professor embeddings."""
        with self._lock:
            return {
                professor_id: embedding.copy()
                for professor_id, embedding in self._embeddings.items()
            }

    def retain_confirmed_profiles(self, professor_ids: set[str]) -> list[str]:
        """Remove cached profiles that are no longer confirmed in the source database."""
        with self._lock:
            stale_ids = set(self._confirmed_profiles) - {str(value) for value in professor_ids}
            for professor_id in stale_ids:
                self._confirmed_profiles.pop(professor_id, None)
                self._embeddings.pop(professor_id, None)
            return sorted(stale_ids)

    def save_opportunity(
        self, opportunity: OpportunityContext
    ) -> OpportunityContext:
        with self._lock:
            self._opportunities[str(opportunity.opportunity_id)] = opportunity
            return opportunity

    def get_opportunity(
        self, opportunity_id: str
    ) -> OpportunityContext | None:
        with self._lock:
            return self._opportunities.get(str(opportunity_id))

    def get_all_opportunities(
        self, open_only: bool = True
    ) -> list[OpportunityContext]:
        with self._lock:
            if open_only:
                return [
                    opportunity
                    for opportunity in self._opportunities.values()
                    if opportunity.status.lower() == "open"
                ]

            return list(self._opportunities.values())

    def save_student(
        self, student: StudentProfileRecord
    ) -> StudentProfileRecord:
        with self._lock:
            self._students[str(student.id)] = student
            return student

    def get_student(
        self, student_id: str
    ) -> StudentProfileRecord | None:
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
            self._applications.clear()


# Global singleton storage instance
storage = InMemoryStorage()
