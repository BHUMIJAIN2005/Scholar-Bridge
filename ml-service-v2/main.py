
from pathlib import Path
import json
from typing import Any

import numpy as np
import joblib
import pdfplumber
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

app = FastAPI(
    title="ScholarBridge ML Service",
    description="Research-paper categorization and research-opening recommendations",
    version="2.0.0",
)

# Load models once when the service starts.
try:
    classifier = joblib.load(MODEL_DIR / "tfidf_classifier.joblib")
    encoder = SentenceTransformer(
        str(MODEL_DIR / "sentence_transformer"),
        device="cpu",
    )
    CATEGORY_MAP = json.loads(
        (MODEL_DIR / "category_map.json").read_text(encoding="utf-8")
    )
except Exception as exc:
    raise RuntimeError(f"Could not load ML artifacts: {exc}") from exc


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


def opening_text(opening: Opening) -> str:
    skills = opening.required_skills
    if isinstance(skills, list):
        skills = ", ".join(skills)

    return (
        f"Research title: {opening.title}. "
        f"Description: {opening.description}. "
        f"Required skills: {skills}."
    )


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "ScholarBridge ML Service",
        "categorization_model": "TF-IDF + Logistic Regression",
        "recommendation_model": "Sentence Transformer + cosine similarity",
    }


@app.post("/categorize")
def categorize(request: CategorizeRequest) -> dict[str, Any]:
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text cannot be empty.")

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


@app.post("/categorize/pdf")
async def categorize_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    if file.content_type != "application/pdf" and not (
        file.filename and file.filename.lower().endswith(".pdf")
    ):
        raise HTTPException(status_code=415, detail="Please upload a PDF file.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded PDF is empty.")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF must be 15 MB or smaller.")

    try:
        import io

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        if not text.strip():
            raise HTTPException(
                status_code=422,
                detail="No selectable text found. Scanned PDFs need OCR.",
            )

        result = categorize(CategorizeRequest(text=text[:50000]))
        return {"filename": file.filename, **result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read PDF: {exc}",
        ) from exc


@app.post("/recommend")
def recommend(request: RecommendRequest) -> dict[str, Any]:
    student_text = (
        f"Skills: {request.skills}. "
        f"Research interests: {request.interests}. "
        f"Research experience: {request.experience}."
    ).strip()

    if not any([request.skills.strip(), request.interests.strip(),
                request.experience.strip()]):
        raise HTTPException(
            status_code=422,
            detail="Provide at least skills, interests, or experience.",
        )

    try:
        opening_texts = [opening_text(opening) for opening in request.openings]
        vectors = encoder.encode(
            [student_text] + opening_texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        scores = cosine_similarity(vectors[0:1], vectors[1:])[0]
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

