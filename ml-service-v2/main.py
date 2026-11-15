
from pathlib import Path
import json
import sys
from functools import lru_cache
from typing import Any

import numpy as np
import joblib
import pdfplumber
from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel, Field
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"
SRC_DIR = BASE_DIR / "src"

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from scholarbridge_ml.api_routes import (
    router as matching_router,
    set_encoder_getter,
)

app = FastAPI(
    title="ScholarBridge ML Service",
    description="Research paper analysis, categorization and recommendations",
    version="2.1.0",
)

# Load categorization model
try:
    classifier = joblib.load(MODEL_DIR / "tfidf_classifier.joblib")
    CATEGORY_MAP = json.loads(
        (MODEL_DIR / "category_map.json").read_text(encoding="utf-8")
    )
except Exception as exc:
    raise RuntimeError(
        f"Could not load categorization model artifacts: {exc}"
    ) from exc


# Shared Sentence Transformer encoder
@lru_cache(maxsize=1)
def get_encoder():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(
        str(MODEL_DIR / "sentence_transformer"),
        device="cpu",
    )


# Register shared encoder with professor and opportunity matching routes
set_encoder_getter(get_encoder)
app.include_router(matching_router)


# --------------------------------------------------
# REQUEST MODELS
# --------------------------------------------------

class CategorizeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=50000)


class Opening(BaseModel):
    id: str | int
    title: str = Field(min_length=1, max_length=500)
    description: str = Field(default="", max_length=10000)
    required_skills: str | list[str] = ""


class RecommendRequest(BaseModel):
    skills: str = Field(default="", max_length=5000)
    interests: str = Field(default="", max_length=5000)
    experience: str = Field(default="", max_length=5000)
    openings: list[Opening] = Field(min_length=1, max_length=100)
    top_k: int = Field(default=5, ge=1, le=100)


class PaperEmbeddingRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    abstract: str = Field(default="", max_length=10000)
    text: str = Field(min_length=1, max_length=50000)


class ExistingPaper(BaseModel):
    paper_id: int
    title: str = Field(min_length=1, max_length=500)
    embedding: list[float] = Field(min_length=384, max_length=384)


class SimilarPaperRequest(BaseModel):
    embedding: list[float] = Field(min_length=384, max_length=384)
    existing_papers: list[ExistingPaper] = Field(
        default_factory=list,
        max_length=10000,
    )
    exclude_paper_id: int | None = None
    top_k: int = Field(default=5, ge=1, le=20)


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def opening_text(opening: Opening) -> str:
    skills = opening.required_skills

    if isinstance(skills, list):
        skills = ", ".join(skills)

    return (
        f"Research title: {opening.title}. "
        f"Description: {opening.description}. "
        f"Required skills: {skills}."
    )


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ScholarBridge ML Service",
        "categorization_model": "TF-IDF + Logistic Regression",
        "recommendation_model": "Sentence Transformer + cosine similarity",
        "paper_embedding_model": "all-MiniLM-L6-v2",
    }


# --------------------------------------------------
# PAPER CATEGORIZATION
# --------------------------------------------------

@app.post("/categorize")
def categorize(request: CategorizeRequest) -> dict[str, Any]:
    text = request.text.strip()

    if not text:
        raise HTTPException(
            status_code=422,
            detail="Text cannot be empty.",
        )

    try:
        probabilities = classifier.predict_proba([text])[0]
        best_index = int(np.argmax(probabilities))
        category = str(classifier.classes_[best_index])

        return {
            "category": category,
            "confidence": round(float(probabilities[best_index]), 4),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Categorization failed: {exc}",
        ) from exc


# --------------------------------------------------
# PDF CATEGORIZATION
# --------------------------------------------------

@app.post("/categorize/pdf")
async def categorize_pdf(
    file: UploadFile = File(...)
) -> dict[str, Any]:

    if file.content_type != "application/pdf" and not (
        file.filename and file.filename.lower().endswith(".pdf")
    ):
        raise HTTPException(
            status_code=415,
            detail="Please upload a PDF file.",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Uploaded PDF is empty.",
        )

    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="PDF must be 15 MB or smaller.",
        )

    try:
        import io

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = "\n".join(
                page.extract_text() or ""
                for page in pdf.pages
            )

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail="No selectable text found. Scanned PDFs need OCR.",
            )

        result = categorize(
            CategorizeRequest(text=text[:50000])
        )

        return {
            "filename": file.filename,
            **result,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read PDF: {exc}",
        ) from exc


# --------------------------------------------------
# OPPORTUNITY RECOMMENDATIONS
# --------------------------------------------------

@app.post("/recommend")
def recommend(request: RecommendRequest) -> dict[str, Any]:

    student_text = (
        f"Skills: {request.skills}. "
        f"Research interests: {request.interests}. "
        f"Research experience: {request.experience}."
    ).strip()

    if not any([
        request.skills.strip(),
        request.interests.strip(),
        request.experience.strip(),
    ]):
        raise HTTPException(
            status_code=422,
            detail="Provide at least skills, interests, or experience.",
        )

    try:
        opening_texts = [
            opening_text(opening)
            for opening in request.openings
        ]

        vectors = get_encoder().encode(
            [student_text] + opening_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        scores = cosine_similarity(
            vectors[0:1],
            vectors[1:],
        )[0]

        ranked = []

        for opening, score in zip(request.openings, scores):
            skills = opening.required_skills

            if isinstance(skills, list):
                skills = ", ".join(skills)

            ranked.append({
                "opening_id": opening.id,
                "title": opening.title,
                "similarity_score": round(float(score), 4),
                "description": opening.description,
                "required_skills": skills,
            })

        ranked.sort(
            key=lambda item: item["similarity_score"],
            reverse=True,
        )

        return {
            "recommendations": ranked[:request.top_k],
            "count": min(request.top_k, len(ranked)),
            "scoring_note": (
                "Scores represent semantic similarity, not acceptance "
                "probabilities or validated relevance probabilities."
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation failed: {exc}",
        ) from exc


# --------------------------------------------------
# RESEARCH PAPER EMBEDDING GENERATION
# --------------------------------------------------

@app.post("/papers/embed")
def embed_paper(
    request: PaperEmbeddingRequest
) -> dict[str, Any]:

    paper_text = (
        f"Research title: {request.title}. "
        f"Abstract: {request.abstract}. "
        f"Paper content: {request.text}"
    )

    try:
        embedding = get_encoder().encode(
            paper_text,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        return {
            "title": request.title,
            "embedding": embedding.tolist(),
            "dimensions": int(len(embedding)),
            "model": "all-MiniLM-L6-v2",
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Paper embedding failed: {exc}",
        ) from exc


# --------------------------------------------------
# SIMILAR RESEARCH PAPER DETECTION
# --------------------------------------------------

@app.post("/papers/similar")
def find_similar_papers(
    request: SimilarPaperRequest
) -> dict[str, Any]:

    if not request.existing_papers:
        return {
            "similar_papers": [],
            "count": 0,
            "message": "No existing papers available for comparison.",
        }

    try:
        query_embedding = np.asarray(
            request.embedding,
            dtype=np.float32,
        ).reshape(1, -1)

        candidates = [
            paper
            for paper in request.existing_papers
            if paper.paper_id != request.exclude_paper_id
        ]

        if not candidates:
            return {
                "similar_papers": [],
                "count": 0,
                "message": "No eligible papers available for comparison.",
            }

        candidate_embeddings = np.asarray(
            [paper.embedding for paper in candidates],
            dtype=np.float32,
        )

        if not (
            np.isfinite(query_embedding).all()
            and np.isfinite(candidate_embeddings).all()
        ):
            raise HTTPException(
                status_code=422,
                detail="Embeddings must contain finite numerical values.",
            )

        scores = cosine_similarity(
            query_embedding,
            candidate_embeddings,
        )[0]

        results = []

        for paper, score in zip(candidates, scores):
            results.append({
                "paper_id": paper.paper_id,
                "title": paper.title,
                "similarity_score": round(float(score), 4),
            })

        results.sort(
            key=lambda item: item["similarity_score"],
            reverse=True,
        )

        return {
            "similar_papers": results[:request.top_k],
            "count": min(request.top_k, len(results)),
            "scoring_note": (
                "Semantic similarity indicates related content. "
                "It does not establish plagiarism."
            ),
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Similar-paper detection failed: {exc}",
        ) from exc
