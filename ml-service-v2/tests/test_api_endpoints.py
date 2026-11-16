import io
import json
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "src"))

from main import app
from scholarbridge_ml.storage import storage
import fitz


def create_test_pdf_bytes(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(fitz.Point(50, 72), text, fontsize=11)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


class TestApiEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        storage.clear()

    def test_existing_health_endpoint(self):
        """Verify existing /health endpoint is intact and functional."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("categorization_model", data)

    def test_existing_categorize_endpoint(self):
        """Verify existing /categorize endpoint is intact and functional."""
        response = self.client.post("/categorize", json={"text": "Deep learning convolutional neural networks for computer vision."})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("category", data)
        self.assertIn("confidence", data)

    def test_existing_recommend_endpoint(self):
        """Verify existing /recommend endpoint is intact and functional."""
        payload = {
            "skills": "Python, Machine Learning",
            "interests": "Computer Vision",
            "experience": "Built image classification models",
            "openings": [
                {
                    "id": "opening_1",
                    "title": "Computer Vision Researcher",
                    "description": "Work on deep neural network architectures",
                    "required_skills": "Python, PyTorch",
                }
            ],
            "top_k": 1,
        }
        response = self.client.post("/recommend", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("recommendations", data)
        self.assertEqual(len(data["recommendations"]), 1)

    @patch("scholarbridge_ml.api_routes.analyze_professor_documents")
    def test_analyze_documents_endpoint(self, mock_analyzer):
        """Test 1: Upload documents for analysis -> returns draft for review without confirming."""
        from scholarbridge_ml.professor_analyzer import (
            ProfessorAnalysisResult,
            ResearchProfile,
            StatedRequirements,
            LaymanSummary,
        )

        mock_analyzer.return_value = ProfessorAnalysisResult(
            draft_id="draft_test_123",
            status="success",
            no_research_content=False,
            research_profile=ResearchProfile(
                research_interests=["Medical Image Segmentation"],
                research_domains=["Computer Vision", "Healthcare AI"],
                methods=["U-Net", "PyTorch"],
                publications=["Clinical Segmentation with CNNs"],
                contributions=["Novel loss function for MRI segmentations"],
                embedding_text="Professor researching medical imaging using U-Net and PyTorch.",
            ),
            stated_requirements=StatedRequirements(
                preferred_skills=["PyTorch", "OpenCV"],
                preferred_years=["3rd Year", "4th Year"],
                notes="Undergraduate researchers welcome",
            ),
            layman_summary=LaymanSummary(
                tldr="We build AI models to read medical scans accurately.",
                why_it_matters="Helps doctors diagnose diseases faster.",
                key_insight="U-Net architectures capture fine cellular boundaries.",
                analogy="Like having a tireless magnifying glass for MRIs.",
                glossary=[{"term": "Segmentation", "definition": "Outlining organs in images"}],
            ),
            warnings=[],
        )

        sample_pdf = create_test_pdf_bytes("Curriculum Vitae: Dr. Jane Doe. Extensive research in medical image segmentation and computer vision.")
        files = [("files", ("jane_doe_cv.pdf", sample_pdf, "application/pdf"))]

        response = self.client.post("/professor/analyze-documents", files=files)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("draft_id", data)
        self.assertEqual(data["status"], "success")
        self.assertFalse(data["no_research_content"])
        self.assertEqual(data["research_profile"]["methods"], ["U-Net", "PyTorch"])
        self.assertIn("tldr", data["layman_summary"])

        # CRITICAL: Verify that the professor profile is NOT yet confirmed or saved in confirmed storage!
        confirmed_profile = storage.get_confirmed_profile("prof_jane")
        self.assertIsNone(confirmed_profile)

    def test_confirm_research_profile_and_embedding_generation(self):
        """Test 2: Confirm research profile generates normalized 384-dim embedding and persists."""
        prof_id = "prof_jane_101"
        payload = {
            "research_profile": {
                "research_interests": ["Medical Image Segmentation", "Federated Learning"],
                "research_domains": ["Computer Vision", "Healthcare AI"],
                "methods": ["U-Net", "PyTorch", "Differential Privacy"],
                "publications": ["Privacy-Preserving Medical Segmentation (2024)"],
                "contributions": ["Federated hospital learning framework"],
                "embedding_text": "Professor researching federated learning and medical image segmentation using PyTorch and U-Net.",
            },
            "stated_requirements": {
                "preferred_skills": ["PyTorch", "Python"],
                "preferred_years": ["3rd Year", "4th Year"],
                "notes": "Looking for enthusiastic research interns",
            },
            "layman_summary": {
                "tldr": "We develop privacy-first algorithms for hospital MRI analysis.",
                "why_it_matters": "Improves healthcare without sharing private records.",
                "key_insight": "Differential privacy keeps training collaborative yet secure.",
                "analogy": "Like multiple chefs combining recipes without revealing secret ingredients.",
                "glossary": [{"term": "Federated Learning", "definition": "Training across decentralized devices"}],
            },
        }

        response = self.client.put(f"/professor/{prof_id}/research-profile/confirm", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["professor_id"], prof_id)
        self.assertTrue(data["is_confirmed"])
        self.assertEqual(data["status"], "confirmed")

        # Verify embedding was generated with 384 dimensions and normalized
        embedding = storage.get_professor_embedding(prof_id)
        self.assertIsNotNone(embedding)
        self.assertEqual(len(embedding), 384)
        import numpy as np
        norm = np.linalg.norm(embedding)
        self.assertAlmostEqual(float(norm), 1.0, places=4)

        # Verify profile is now retrievable via GET
        get_resp = self.client.get(f"/professor/{prof_id}/research-profile")
        self.assertEqual(get_resp.status_code, 200)
        get_data = get_resp.json()
        self.assertEqual(get_data["professor_id"], prof_id)
        self.assertEqual(get_data["research_profile"]["methods"], ["U-Net", "PyTorch", "Differential Privacy"])

    def test_match_students_for_professor_endpoint(self):
        """Test 3: Match students for confirmed professor returns explainable ranked candidates."""
        prof_id = "prof_vision"
        # First confirm professor
        confirm_payload = {
            "research_profile": {
                "research_interests": ["Computer Vision", "Medical Image Segmentation"],
                "research_domains": ["Artificial Intelligence"],
                "methods": ["PyTorch", "OpenCV"],
                "publications": ["Vision Transformers for Lesion Detection"],
                "contributions": ["Novel attention mechanism"],
                "embedding_text": "Professor investigating computer vision and medical image segmentation using PyTorch.",
            }
        }
        self.client.put(f"/professor/{prof_id}/research-profile/confirm", json=confirm_payload)

        # Now call match-students
        match_resp = self.client.post(f"/professor/{prof_id}/match-students", json={"top_k": 5})
        self.assertEqual(match_resp.status_code, 200)
        match_data = match_resp.json()

        self.assertIn("matches", match_data)
        self.assertGreater(match_data["count"], 0)
        top_student = match_data["matches"][0]

        # Verify explainability fields
        self.assertIn("match_score", top_student)
        self.assertIn("research_similarity_score", top_student)
        self.assertIn("why_matched", top_student)
        self.assertNotIn("probability", top_student["why_matched"].lower())

    def test_opportunity_lifecycle_and_matching(self):
        """Test 4: Create opportunity, list opportunities, and match students to specific opportunity."""
        prof_id = "prof_nlp"
        # Confirm professor
        self.client.put(f"/professor/{prof_id}/research-profile/confirm", json={
            "research_profile": {
                "research_interests": ["Natural Language Processing"],
                "research_domains": ["Artificial Intelligence"],
                "methods": ["Transformers", "Python"],
                "publications": ["Low-Resource Machine Translation"],
                "contributions": ["Multilingual alignment"],
                "embedding_text": "Professor in NLP and transformers.",
            }
        })

        # Create opportunity
        opp_payload = {
            "professor_id": prof_id,
            "title": "Indic NLP Research Assistant",
            "description": "Developing cross-lingual transformer models for Indian regional languages.",
            "research_domains": ["Natural Language Processing"],
            "required_skills": ["Python", "Transformers", "PyTorch"],
            "preferred_years": ["3rd Year", "4th Year"],
            "eligibility_criteria": ["Familiarity with HuggingFace"],
        }

        create_resp = self.client.post("/opportunities", json=opp_payload)
        self.assertEqual(create_resp.status_code, 200)
        opp_data = create_resp.json()
        opp_id = opp_data["opportunity_id"]
        self.assertEqual(opp_data["title"], "Indic NLP Research Assistant")

        # GET /opportunities
        get_opps_resp = self.client.get("/opportunities")
        self.assertEqual(get_opps_resp.status_code, 200)
        opps_list = get_opps_resp.json()
        self.assertTrue(any(o["opportunity_id"] == opp_id for o in opps_list))

        # POST /opportunities/{opportunity_id}/match-students
        opp_match_resp = self.client.post(f"/opportunities/{opp_id}/match-students", json={"top_k": 5})
        self.assertEqual(opp_match_resp.status_code, 200)
        opp_match_data = opp_match_resp.json()
        self.assertEqual(opp_match_data["opportunity_id"], opp_id)
        self.assertGreater(opp_match_data["count"], 0)

    def test_student_opportunity_feed(self):
        """Test 5: Student opportunity feed returns ranked openings with visible eligibility gaps."""
        # Ensure an opportunity exists
        self.client.post("/opportunities", json={
            "professor_id": "prof_nlp",
            "title": "Quantum ML Research Opening",
            "description": "Quantum algorithms and variational circuits.",
            "research_domains": ["Quantum Computing"],
            "required_skills": ["Qiskit", "Python"],
            "preferred_years": ["4th Year"],
            "eligibility_criteria": ["Linear algebra coursework"],
        })

        # Fetch feed for demo student_101
        feed_resp = self.client.get("/students/student_101/opportunities")
        self.assertEqual(feed_resp.status_code, 200)
        feed_data = feed_resp.json()

        self.assertEqual(feed_data["student_id"], "student_101")
        self.assertIn("feed", feed_data)
        if feed_data["feed"]:
            item = feed_data["feed"][0]
            self.assertIn("match_score", item)
            self.assertIn("relevance_score", item)
            self.assertIn("matching_reasons", item)
            self.assertIn("eligibility_gaps", item)

    @patch("scholarbridge_ml.api_routes.get_shared_encoder")
    def test_student_profile_sync_generates_embedding_for_professor_matches(self, mock_encoder_getter):
        import numpy as np

        encoder = MagicMock()
        encoder.encode.return_value = np.ones((1, 384), dtype=np.float32)
        mock_encoder_getter.return_value = encoder

        sync_response = self.client.put(
            "/students/6/profile",
            json={
                "id": "6",
                "name": "Authenticated Student",
                "department": "Computer Science",
                "academic_year": "3rd Year",
                "skills": "Python, ML",
                "skill_tags": ["Python", "ML"],
                "interests": ["Machine Learning"],
                "projects": [{"title": "Project", "description": "A test project"}],
                "papers": [],
            },
        )
        self.assertEqual(sync_response.status_code, 200)
        self.assertEqual(sync_response.json(), {"student_id": "6", "embedding_dimensions": 384})
        stored_student = storage.get_student("6")
        self.assertIsNotNone(stored_student)
        self.assertEqual(len(stored_student.embedding), 384)

        match_response = self.client.post("/students/6/match-professors")
        self.assertEqual(match_response.status_code, 200)
        match_data = match_response.json()
        self.assertEqual(match_data["student_id"], "6")
        self.assertEqual(match_data["count"], 4)
        self.assertTrue(all(match["is_demo"] for match in match_data["matches"]))
        self.assertTrue(all(match["professor_name"].startswith("[TEST DATA]") for match in match_data["matches"]))
        self.assertGreater(match_data["matches"][0]["match_score"], 0)
        self.assertIn("Machine Learning", match_data["matches"][0]["shared_research_interests"])
        for professor_id in ("-1001", "-1002", "-1003", "-1004"):
            professor = storage.get_confirmed_profile(professor_id)
            self.assertIsNotNone(professor)
            self.assertTrue(professor.is_confirmed)
            self.assertTrue(professor.is_demo)
            self.assertEqual(len(storage.get_professor_embedding(professor_id)), 384)

    def test_student_profile_sync_rejects_mismatched_ids(self):
        response = self.client.put(
            "/students/6/profile",
            json={"id": "7", "name": "Student"},
        )
        self.assertEqual(response.status_code, 400)

    @patch("scholarbridge_ml.api_routes.get_shared_encoder")
    def test_student_profile_sync_reuses_unchanged_embedding_and_refreshes_changes(self, mock_encoder_getter):
        import numpy as np

        encoder = MagicMock()
        encoder.encode.return_value = np.ones((1, 384), dtype=np.float32)
        mock_encoder_getter.return_value = encoder
        profile = {
            "id": "resume-student",
            "name": "Student",
            "academic_year": "3rd Year",
            "skills": "Python",
            "skill_tags": ["Python"],
            "interests": ["NLP"],
            "projects": [{"title": "Parser", "technologies": ["Python"]}],
            "resume_details": {
                "education": [{"degree": "BSc", "university": "Example University"}],
                "achievements": ["Dean's list"],
            },
        }

        first = self.client.put("/students/resume-student/profile", json=profile)
        unchanged = self.client.put("/students/resume-student/profile", json=profile)
        changed_profile = {
            **profile,
            "resume_details": {
                **profile["resume_details"],
                "achievements": ["Dean's list", "Research award"],
            },
        }
        changed = self.client.put("/students/resume-student/profile", json=changed_profile)

        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(unchanged.status_code, 200, unchanged.text)
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(encoder.encode.call_count, 2)
        self.assertEqual(
            storage.get_student("resume-student").resume_details["achievements"],
            ["Dean's list", "Research award"],
        )


if __name__ == "__main__":
    unittest.main()
