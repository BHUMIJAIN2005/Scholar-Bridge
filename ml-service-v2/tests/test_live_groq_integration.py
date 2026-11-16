import os
import unittest
import pytest

from scholarbridge_ml.professor_analyzer import (
    analyze_professor_documents,
    get_groq_client,
)


class TestLiveGroqIntegration(unittest.TestCase):
    @pytest.mark.skipif(
        os.getenv("RUN_LIVE_GROQ_TESTS", "").lower() != "true"
        or not os.getenv("GROQ_API_KEY"),
        reason="Set RUN_LIVE_GROQ_TESTS=true to opt in to an external Groq API request.",
    )
    def test_live_groq_analysis(self):
        """Optional live test executing an actual request against the Groq API when a real key is present."""
        sample_academic_text = (
            "=== CV ===\n"
            "Dr. Vikram Sen, Professor at MITS Gwalior.\n"
            "Research Focus: Deep Reinforcement Learning for Autonomous Drone Navigation.\n"
            "Published in IEEE Robotics and Automation Letters (RA-L 2024).\n"
            "Methodologies: PPO, Actor-Critic, PyTorch, ROS, Gazebo simulation.\n"
            "Stated requirements: Looking for pre-final year undergraduate students skilled in Python and ROS."
        )

        result = analyze_professor_documents(combined_text=sample_academic_text)

        self.assertEqual(result.status, "success")
        self.assertFalse(result.no_research_content)
        self.assertIsNotNone(result.research_profile)
        self.assertGreater(len(result.research_profile.research_interests), 0)
        self.assertIsNotNone(result.layman_summary)
        self.assertTrue(len(result.layman_summary.tldr) > 0)


if __name__ == "__main__":
    unittest.main()
