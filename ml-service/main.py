from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

import joblib
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from model.train import MODEL_DIR
from utils.pdf_extract import extract_pdf_text
from utils.preprocess import preprocess_text


class CategorizationRequest(BaseModel):
    text: str = Field(min_length=20, max_length=1_000_000)


class CategorizationResponse(BaseModel):
    category: str
    confidence: float = Field(ge=0, le=1)


def load_classifier(model_dir: Path = MODEL_DIR):
    artifact = model_dir / "classifier.joblib"
    if not artifact.is_file():
        raise RuntimeError("Classifier not trained. Run `python -m model.train` first.")
    return joblib.load(artifact)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.classifier = load_classifier()
    yield


app = FastAPI(title="ScholarBridge ML Categorizer", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": hasattr(app.state, "classifier")}


def categorize(text: str) -> CategorizationResponse:
    cleaned = preprocess_text(text)
    if len(cleaned) < 20:
        raise HTTPException(status_code=422, detail="Extracted text must contain at least 20 characters.")
    classifier = app.state.classifier
    probabilities = classifier.predict_proba([cleaned])[0]
    index = int(probabilities.argmax())
    return CategorizationResponse(
        category=str(classifier.classes_[index]),
        confidence=float(probabilities[index]),
    )


@app.post("/categorize", response_model=CategorizationResponse)
def categorize_text(request: CategorizationRequest):
    return categorize(request.text)


@app.post("/categorize/pdf", response_model=CategorizationResponse)
async def categorize_pdf(file: Annotated[UploadFile, File()]):
    if file.content_type not in {"application/pdf", "application/octet-stream"} and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Upload a PDF file.")
    content = await file.read(20 * 1024 * 1024 + 1)
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="PDF must be no larger than 20 MB.")
    if not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid PDF.")
    try:
        text = extract_pdf_text(content)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="The PDF could not be read.") from exc
    return categorize(text)