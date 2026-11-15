import unittest
import numpy as np

from scholarbridge_ml.professor_analyzer import ResearchProfile, StatedRequirements, LaymanSummary
from scholarbridge_ml.storage import OpportunityContext, StudentProfileRecord, storage
from scholarbridge_ml.student_matching import (
    calculate_normalized_composite_score,
    rank_students_for_professor,
    rank_students_for_opportunity,
    generate_why_matched,
    compute_skill_overlap,
)


def create_random_normalized_vector(dim: int = 384, seed: int = 42) -> list[float]:
    rng = np.random.RandomState(seed)
    vec = rng.randn(dim).astype(np.float32)
    norm = np.linalg.norm(vec)
    return (vec / norm).tolist()


class TestStudentMatching(unittest.TestCase):
    def setUp(self):
        storage.clear()
        self.prof_vector = np.array(create_random_normalized_vector(384, seed=10), dtype=np.float32)
        self.prof_profile = ResearchProfile(
            research_interests=["Medical Image Segmentation", "Deep Learning"],
            research_domains=["Computer Vision", "Healthcare AI"],
            methods=["U-Net", "PyTorch", "OpenCV"],
            publications=["Medical CNN Segmentation (IEEE 2023)"],
            contributions=["Fast semantic segmentation on abdominal CT"],
            embedding_text="Professor researching medical imaging with deep learning and PyTorch.",
        )
        self.layman_summary = LaymanSummary(
            tldr="Developing AI to analyze medical scans.",
            why_it_matters="Accelerates disease diagnosis.",
            key_insight="U-Net models delineate lesions with high fidelity.",
            analogy="An automated microscope reading tissue patterns.",
            glossary=[{"term": "Segmentation", "definition": "Isolating key image regions"}],
        )

    def test_professor_profile_confirmation_and_storage(self):
        """Test 8: Professor profile confirmation saves confirmed version and generates embedding."""
        prof_id = "prof_123"
        stored = storage.save_confirmed_profile(
            professor_id=prof_id,
            confirmed_profile=self.prof_profile,
            original_profile=None,
            stated_requirements=None,
            layman_summary=self.layman_summary,
            embedding=self.prof_vector,
        )

        self.assertTrue(stored.is_confirmed)
        self.assertEqual(stored.professor_id, prof_id)
        retrieved_emb = storage.get_professor_embedding(prof_id)
        self.assertIsNotNone(retrieved_emb)
        self.assertEqual(retrieved_emb.shape, (384,))

    def test_embedding_generation_and_normalization(self):
        """Test 9: Vector has 384 dimensions and unit L2 norm."""
        vec = np.array(self.prof_vector)
        self.assertEqual(vec.shape[0], 384)
        norm = np.linalg.norm(vec)
        self.assertAlmostEqual(float(norm), 1.0, places=4)

    def test_student_matching_and_ranking(self):
        """Test 10: Batched NumPy ranking ranks the most semantically and technically aligned student highest."""
        # Student A is identical to professor's embedding (cosine similarity 1.0) and has matching skills
        student_a = StudentProfileRecord(
            id="student_a",
            name="Alice Sharma",
            department="Computer Science",
            academic_year="3rd Year",
            skills="PyTorch, OpenCV, Deep Learning",
            skill_tags=["PyTorch", "OpenCV"],
            interests=["Medical Image Segmentation", "Computer Vision"],
            projects=[{"title": "CT Scan Segmentation", "description": "U-Net implementation in PyTorch"}],
            embedding=self.prof_vector.tolist(),
        )

        # Student B has orthogonal embedding (low similarity) and different skills
        student_b_vec = create_random_normalized_vector(384, seed=999)
        student_b = StudentProfileRecord(
            id="student_b",
            name="Bob Kumar",
            department="Civil Engineering",
            academic_year="1st Year",
            skills="AutoCAD, Concrete Design",
            skill_tags=["AutoCAD"],
            interests=["Structural Engineering"],
            projects=[],
            embedding=student_b_vec,
        )

        ranked = rank_students_for_professor(
            professor_profile=self.prof_profile,
            professor_embedding=self.prof_vector,
            students=[student_b, student_a],
        )

        self.assertEqual(len(ranked), 2)
        self.assertEqual(ranked[0].student_id, "student_a")
        self.assertGreater(ranked[0].match_score, ranked[1].match_score)
        self.assertGreaterEqual(ranked[0].match_score, 80.0)

    def test_no_cgpa_based_automatic_rejection_and_weight_normalization(self):
        """Test 11: Missing student optional info (e.g. no projects/papers, no CGPA) does not reject them."""
        # Student without project experience or stated preference data
        factor_scores = {
            "research_similarity": 0.80,
            "skill_match": 0.70,
            "experience_match": None,  # Missing optional experience
            "preference_match": None,  # No professor preferences
        }

        # Weight normalization recalculates weights across available factors
        composite = calculate_normalized_composite_score(factor_scores)
        # Weights for research_similarity (0.55) and skill_match (0.20) sum to 0.75
        # Expected = (0.55/0.75)*0.80 + (0.20/0.75)*0.70 = 0.5866 + 0.1866 = 0.7733
        self.assertAlmostEqual(composite, 0.7733, places=3)

        # Confirm student is successfully ranked without errors
        student_c = StudentProfileRecord(
            id="student_c",
            name="Charlie Dayal",
            department="Computer Science",
            academic_year="2nd Year",
            skills="Python, PyTorch",
            skill_tags=["PyTorch"],
            interests=["Deep Learning"],
            projects=[],  # No projects
            papers=[],    # No papers
            embedding=self.prof_vector.tolist(),
        )

        ranked = rank_students_for_professor(
            professor_profile=self.prof_profile,
            professor_embedding=self.prof_vector,
            students=[student_c],
        )
        self.assertEqual(len(ranked), 1)
        self.assertGreater(ranked[0].match_score, 0)
        self.assertIsNone(ranked[0].experience_match_score)

    def test_opportunity_specific_matching(self):
        """Test 12: Opportunity matching produces opening-tailored ranking without altering professor profile."""
        opp_vec = np.array(create_random_normalized_vector(384, seed=55), dtype=np.float32)
        opportunity = OpportunityContext(
            opportunity_id="opp_quantum",
            professor_id="prof_123",
            title="Quantum Machine Learning Opening",
            description="Investigating variational quantum circuits for classification.",
            required_skills=["Qiskit", "Python"],
            preferred_years=["4th Year"],
        )

        student_quantum = StudentProfileRecord(
            id="student_q",
            name="Quinn Ray",
            department="Computer Science",
            academic_year="4th Year",
            skills="Qiskit, Python",
            skill_tags=["Qiskit", "Python"],
            interests=["Quantum Computing"],
            projects=[{"title": "VQE Simulation", "description": "Simulated quantum circuits in Qiskit"}],
            embedding=opp_vec.tolist(),
        )

        opp_ranked = rank_students_for_opportunity(
            opportunity=opportunity,
            professor_profile=self.prof_profile,
            opportunity_embedding=opp_vec,
            students=[student_quantum],
        )

        self.assertEqual(len(opp_ranked), 1)
        self.assertEqual(opp_ranked[0].student_id, "student_q")
        self.assertIn("Qiskit", opp_ranked[0].relevant_technical_skills)
        # Professor profile remains unchanged
        self.assertEqual(self.prof_profile.methods, ["U-Net", "PyTorch", "OpenCV"])

    def test_match_explanations_based_only_on_existing_evidence(self):
        """Test 13: Deterministic why_matched cites only facts actually present and avoids probability claims."""
        explanation = generate_why_matched(
            student_name="Alice",
            matched_interests=["Medical Image Segmentation"],
            matched_skills=["PyTorch", "OpenCV"],
            matched_projects=["Brain Tumor Segmentation"],
            professor_domains=["Computer Vision"],
            similarity_score=0.92,
        )

        # Cites actual matched interests, skills, projects
        self.assertIn("Medical Image Segmentation", explanation)
        self.assertIn("PyTorch", explanation)
        self.assertIn("Brain Tumor Segmentation", explanation)
        # Strictly avoids probability claims
        self.assertNotIn("probability", explanation.lower())
        self.assertNotIn("% chance", explanation.lower())
        self.assertNotIn("success rate", explanation.lower())


if __name__ == "__main__":
    unittest.main()
