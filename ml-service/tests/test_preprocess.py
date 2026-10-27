from utils.preprocess import preprocess_text


def test_preprocess_normalizes_case_punctuation_and_whitespace():
    assert preprocess_text("  Neural-Networks,  LEARN! ") == "neural networks learn"