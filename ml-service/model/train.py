import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from utils.preprocess import preprocess_text


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "training_abstracts.csv"
MODEL_DIR = ROOT / "model"


def train_model(data_path: Path = DATA_PATH, model_dir: Path = MODEL_DIR) -> dict:
    data = pd.read_csv(data_path).dropna(subset=["text", "category"])
    data["text"] = data["text"].astype(str).map(preprocess_text)
    data["category"] = data["category"].astype(str).str.strip()
    counts = data["category"].value_counts()
    if len(counts) < 2 or counts.min() < 2:
        raise ValueError("Training data needs at least two examples for each of two or more categories.")

    train_texts, test_texts, train_labels, test_labels = train_test_split(
        data["text"],
        data["category"],
        test_size=0.2,
        random_state=42,
        stratify=data["category"],
    )
    model = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english", min_df=1)),
            ("classifier", MultinomialNB(alpha=0.25)),
        ]
    )
    model.fit(train_texts, train_labels)
    predictions = model.predict(test_texts)
    labels = sorted(data["category"].unique())
    report = classification_report(test_labels, predictions, labels=labels, output_dict=True, zero_division=0)
    metrics = {
        "dataset": DATA_PATH.name,
        "dataset_rows": int(len(data)),
        "train_rows": int(len(train_texts)),
        "test_rows": int(len(test_texts)),
        "random_state": 42,
        "accuracy": float(accuracy_score(test_labels, predictions)),
        "labels": labels,
        "classification_report": report,
        "confusion_matrix": confusion_matrix(test_labels, predictions, labels=labels).tolist(),
    }

    model_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_dir / "classifier.joblib")
    (model_dir / "evaluation.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return metrics


if __name__ == "__main__":
    result = train_model()
    print(json.dumps(result, indent=2))