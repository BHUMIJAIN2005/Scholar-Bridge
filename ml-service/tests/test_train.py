from pathlib import Path

from model.train import train_model


def test_training_writes_model_and_evaluation(tmp_path: Path):
    source = Path(__file__).resolve().parents[1] / "data" / "training_abstracts.csv"
    metrics = train_model(source, tmp_path)

    assert metrics["train_rows"] + metrics["test_rows"] == metrics["dataset_rows"]
    assert 0 <= metrics["accuracy"] <= 1
    assert (tmp_path / "classifier.joblib").is_file()
    assert (tmp_path / "evaluation.json").is_file()