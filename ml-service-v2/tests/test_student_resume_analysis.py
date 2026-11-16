import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import fitz
from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "src"))

from main import app
from scholarbridge_ml.document_extractor import ExtractedDocument
from scholarbridge_ml.storage import storage
from scholarbridge_ml.student_resume_analyzer import (
    StudentResumeProfile,
    StudentResumeProviderError,
    StudentResumeResponseError,
    analyze_student_resume,
)


def create_test_pdf_bytes(text: str) -> bytes:
    document = fitz.open()
    page = document.new_page()
    page.insert_text(fitz.Point(50, 72), text, fontsize=11)
    pdf_bytes = document.tobytes()
    document.close()
    return pdf_bytes


class TestStudentResumeAnalysis(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)
        storage.clear()

    def test_analyzer_validates_and_normalizes_mocked_llm_response(self) -> None:
        raw_profile = {
            "name": "  Asha Rao ",
            "email": " ASHA.RAO@EXAMPLE.ORG ",
            "phone": " +91 98765 43210 ",
            "academic_year": " 3rd Year ",
            "education": [
                {
                    "degree": " B.Tech ",
                    "field_of_study": "Computer Science",
                    "university": "MITS-DU",
                    "academic_year": "2022-2026",
                    "cgpa": "8.7/10",
                }
            ],
            "technical_skills": ["Python", " Python ", "PyTorch", ""],
            "skill_tags": ["AI", "Machine Learning"],
            "projects": [
                {
                    "title": " Resume Parser ",
                    "description": "Built a parser for academic resumes.",
                    "technologies": ["Python", " FastAPI "],
                }
            ],
            "internships": [],
            "work_experience": [],
            "certifications": [" AWS Cloud Practitioner "],
            "achievements": [],
            "research_interests": ["NLP"],
            "research_experience": [],
            "unexpected_key": "ignored",
        }
        client = MagicMock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(raw_profile))
                )
            ]
        )

        profile = analyze_student_resume(
            "Synthetic resume text describing Asha's education and skills.",
            model="llama-3.1-8b-instant",
            groq_client=client,
        )

        self.assertEqual(profile.name, "Asha Rao")
        self.assertEqual(profile.email, "asha.rao@example.org")
        self.assertEqual(profile.education[0].cgpa, "8.7/10")
        self.assertEqual(profile.technical_skills, ["Python", "PyTorch"])
        self.assertEqual(profile.projects[0].technologies, ["Python", "FastAPI"])
        self.assertEqual(client.chat.completions.create.call_args.kwargs["response_format"], {"type": "json_object"})

    def test_missing_and_invalid_fields_are_normalized_without_invention(self) -> None:
        profile = StudentResumeProfile.model_validate(
            {
                "email": "not-an-email",
                "education": None,
                "technical_skills": None,
                "projects": None,
            }
        )

        self.assertIsNone(profile.name)
        self.assertIsNone(profile.email)
        self.assertEqual(profile.education, [])
        self.assertEqual(profile.technical_skills, [])
        self.assertEqual(profile.projects, [])

    def test_analyzer_rejects_malformed_llm_json(self) -> None:
        client = MagicMock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="{bad json"))]
        )

        with self.assertRaises(StudentResumeResponseError):
            analyze_student_resume("Synthetic resume text.", groq_client=client)

    def test_analyzer_rejects_invalid_structured_fields(self) -> None:
        client = MagicMock()
        client.chat.completions.create.return_value = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content=json.dumps({"technical_skills": {"not": "a list"}})
                    )
                )
            ]
        )

        with self.assertRaises(StudentResumeResponseError):
            analyze_student_resume("Synthetic resume text.", groq_client=client)

    def test_endpoint_extracts_pdf_and_returns_unpersisted_draft(self) -> None:
        resume_text = (
            "Asha Rao\nasha.rao@example.org\nB.Tech Computer Science, MITS-DU, CGPA 8.7/10. "
            "Technical skills include Python, PyTorch, SQL, and FastAPI. "
            "Project: Resume Parser, a tool that extracts structured data from academic resumes. "
        ) * 2
        profile = StudentResumeProfile(
            name="Asha Rao",
            email="asha.rao@example.org",
            technical_skills=["Python", "PyTorch", "SQL", "FastAPI"],
        )

        with patch(
            "scholarbridge_ml.api_routes.analyze_student_resume",
            return_value=profile,
        ) as analyze:
            response = self.client.post(
                "/students/analyze-resume",
                files={
                    "file": (
                        "asha_resume.pdf",
                        create_test_pdf_bytes(resume_text),
                        "application/pdf",
                    )
                },
            )

        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "draft")
        self.assertEqual(payload["profile"]["name"], "Asha Rao")
        self.assertEqual(payload["extraction_metadata"]["document_type"], "cv")
        self.assertIn("Asha Rao", analyze.call_args.args[0])
        self.assertEqual(storage.get_all_students(), [])

    def test_endpoint_uses_existing_extractor_ocr_text(self) -> None:
        scanned_text = "Synthetic OCR resume text for student profile extraction."
        extracted = ExtractedDocument(
            filename="scanned_resume.pdf",
            document_type="cv",
            text=scanned_text,
            extraction_method="pymupdf_tesseract_ocr",
            extracted_char_count=len(scanned_text),
            status="ocr_fallback",
            warnings=[],
        )

        with (
            patch("scholarbridge_ml.api_routes.extract_single_document", return_value=extracted),
            patch(
                "scholarbridge_ml.api_routes.analyze_student_resume",
                return_value=StudentResumeProfile(name="Asha Rao"),
            ) as analyze,
        ):
            response = self.client.post(
                "/students/analyze-resume",
                files={"file": ("scanned_resume.pdf", b"%PDF-1.7 synthetic", "application/pdf")},
            )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["extraction_metadata"]["extraction_method"], "pymupdf_tesseract_ocr")
        analyze.assert_called_once_with(scanned_text)

    def test_endpoint_rejects_non_pdf_and_unreadable_pdf(self) -> None:
        non_pdf = self.client.post(
            "/students/analyze-resume",
            files={"file": ("resume.txt", b"resume", "text/plain")},
        )
        malformed_pdf = self.client.post(
            "/students/analyze-resume",
            files={"file": ("resume.pdf", b"%PDF-not really a PDF", "application/pdf")},
        )

        self.assertEqual(non_pdf.status_code, 415)
        self.assertEqual(malformed_pdf.status_code, 422)

    def test_endpoint_maps_provider_failure_to_gateway_error(self) -> None:
        resume_text = "A sufficiently readable synthetic student resume. " * 8
        with patch(
            "scholarbridge_ml.api_routes.analyze_student_resume",
            side_effect=StudentResumeProviderError("provider unavailable"),
        ):
            response = self.client.post(
                "/students/analyze-resume",
                files={
                    "file": (
                        "resume.pdf",
                        create_test_pdf_bytes(resume_text),
                        "application/pdf",
                    )
                },
            )

        self.assertEqual(response.status_code, 502)
        self.assertEqual(
            response.json()["detail"],
            "Resume analysis could not produce a valid profile draft.",
        )

    def test_endpoint_enforces_configured_file_size_limit(self) -> None:
        with patch("scholarbridge_ml.api_routes.MAX_STUDENT_RESUME_SIZE", 5):
            response = self.client.post(
                "/students/analyze-resume",
                files={"file": ("resume.pdf", b"%PDF-1.7", "application/pdf")},
            )

        self.assertEqual(response.status_code, 413)


if __name__ == "__main__":
    unittest.main()
