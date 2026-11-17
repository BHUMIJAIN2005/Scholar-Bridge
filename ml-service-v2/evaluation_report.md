# ScholarBridge Classifier — arXiv Proxy Evaluation

**Collected/evaluated:** 2026-11-17T05:57:51+05:30  
**Artifact:** `models/tfidf_classifier.joblib` (loaded without fitting or modification)  
**Status:** Proxy-label evaluation. This is **not a verified model-training-independent holdout**, and should not be described as scientifically validated.

## Dataset and method

Collected 160 actual arXiv records from the public Atom API (`https://export.arxiv.org/api/query`), with title, abstract, arXiv identifier, original primary category, full source categories, publication timestamp and source URL preserved in `data/independent_test_dataset.csv`. The record set contains 20 items per target class. Items were selected reproducibly from the newest eligible API results by ascending SHA-256 digest of `ScholarBridge-Arxiv-Sample-v1-2026-11-17|<source_id>` within each target class. Six examples below were separately selected with the same hash method using the `|sample|` namespace, independent of model correctness.

The existing `data/training_abstracts.csv` has 40 rows, five original labels (8 each), and no paper identifiers or titles. No exact normalized abstract overlap was found. No selected abstract was empty or under 250 normalized characters (minimum: 553 characters). Near duplicates with normalized-string similarity at least 0.90 were excluded. Dataset checks: 160 records; 160 unique IDs; 160 unique normalized abstracts; 0 excluded records; class counts {"AI and Machine Learning": 20, "Computer Vision and Imaging": 20, "Cybersecurity and Privacy": 20, "Human-Computer Interaction and Social Computing": 20, "NLP and Information Retrieval": 20, "Robotics and Control": 20, "Signal Processing and Audio": 20, "Software Engineering and Systems": 20}.

The actual model training corpus and training date are not documented. The artifact file timestamp is 2026-11-16T00:38:23+05:30; arXiv returned no papers in `cs.CV` submitted after that timestamp’s date. Therefore independence from the fitted model’s unseen training data cannot be guaranteed. This dataset is independent of the tracked CSV only. Its labels are arXiv primary-category **proxy labels**, not manually verified ScholarBridge categories.

### Source-category mapping

Mapping uses the project’s `models/category_map.json`, with conservative source-code selection. Papers count only if their original *primary* category is in this table and maps to the exact runtime label. Broader/ambiguous categories such as `physics.soc-ph`, `eess.SY`, and `math.OC` were excluded rather than forced into a class.

| ScholarBridge target | Included arXiv primary categories | Mapping rationale |
|---|---|---|
| AI and Machine Learning | cs.AI, cs.LG, stat.ML | Direct arXiv AI, learning, and statistical ML primary subjects. |
| Computer Vision and Imaging | cs.CV, eess.IV | Direct computer vision and image/video processing subjects. |
| Cybersecurity and Privacy | cs.CR, cs.CY | Direct computer security and cybersecurity subjects. |
| Human-Computer Interaction and Social Computing | cs.HC, cs.SI | Direct HCI and social computing subjects; broader sociology category excluded. |
| NLP and Information Retrieval | cs.CL, cs.IR, cs.DL | Direct computational linguistics, information retrieval, and digital libraries subjects. |
| Robotics and Control | cs.RO | Robotics primary subject only; broad systems/control and optimization subjects excluded as ambiguous. |
| Signal Processing and Audio | eess.SP, eess.AS, cs.SD | Direct signal processing, audio, and sound subjects. |
| Software Engineering and Systems | cs.SE, cs.DC, cs.DB, cs.NI, cs.PF, cs.OS | Direct software engineering and systems subjects covering distributed systems, databases, networks, performance, and operating systems. |
### Predictive scores

Model labels and evaluation targets matched exactly: **True**. Predictions were not renamed. Metrics use the unmodified model outputs and proxy target labels; precision/recall/F1 use `zero_division=0`.

| Metric | Score |
|---|---:|
| Accuracy | 0.6500 |
| Weighted precision | 0.6818 |
| Weighted recall | 0.6500 |
| Weighted F1 | 0.6564 |
| Macro precision | 0.6818 |
| Macro recall | 0.6500 |
| Macro F1 | 0.6564 |

### Per-class metrics

| Category | Precision | Recall | F1 | Support |
|---|---:|---:|---:|---:|
| AI and Machine Learning | 0.4194 | 0.6500 | 0.5098 | 20 |
| Computer Vision and Imaging | 0.7895 | 0.7500 | 0.7692 | 20 |
| Cybersecurity and Privacy | 0.7143 | 0.5000 | 0.5882 | 20 |
| Human-Computer Interaction and Social Computing | 0.6667 | 0.5000 | 0.5714 | 20 |
| NLP and Information Retrieval | 0.5000 | 0.6500 | 0.5652 | 20 |
| Robotics and Control | 0.7895 | 0.7500 | 0.7692 | 20 |
| Signal Processing and Audio | 0.7000 | 0.7000 | 0.7000 | 20 |
| Software Engineering and Systems | 0.8750 | 0.7000 | 0.7778 | 20 |

### Confusion matrix

Counts, with rows=actual and columns=predicted, in model class order:

| Actual \ Predicted | AI and Machine Learning | Computer Vision and Imaging | Cybersecurity and Privacy | Human-Computer Interaction and Social Computing | NLP and Information Retrieval | Robotics and Control | Signal Processing and Audio | Software Engineering and Systems |
|---|---|---|---|---|---|---|---|---|
| AI and Machine Learning | 13 | 0 | 0 | 1 | 4 | 1 | 1 | 0 |
| Computer Vision and Imaging | 0 | 15 | 0 | 0 | 4 | 1 | 0 | 0 |
| Cybersecurity and Privacy | 5 | 1 | 10 | 1 | 2 | 0 | 1 | 0 |
| Human-Computer Interaction and Social Computing | 3 | 1 | 3 | 10 | 1 | 0 | 1 | 1 |
| NLP and Information Retrieval | 2 | 0 | 1 | 2 | 13 | 0 | 1 | 1 |
| Robotics and Control | 2 | 1 | 0 | 0 | 0 | 15 | 2 | 0 |
| Signal Processing and Audio | 3 | 1 | 0 | 0 | 1 | 1 | 14 | 0 |
| Software Engineering and Systems | 3 | 0 | 0 | 1 | 1 | 1 | 0 | 14 |

Heatmap: `confusion_matrix.png`.

### Six reproducibly selected records

| arXiv ID | Title | Ground truth | Prediction | Correct | Confidence |
|---|---|---|---|---:|---:|
| [2611.18409v1](https://arxiv.org/abs/2611.18409v1) | Fuse-PINN: Combining Finite Element Methods and Physics-Informed Neural Networks to enable massively parallel simulations of non-linear PDEs | AI and Machine Learning | AI and Machine Learning | yes | 0.4603 |
| [2611.18030v1](https://arxiv.org/abs/2611.18030v1) | PerfArena: Ranking LLMs by Code Performance | Software Engineering and Systems | Software Engineering and Systems | yes | 0.4825 |
| [2611.15394v1](https://arxiv.org/abs/2611.15394v1) | Tracking What Works: Social Engineering Lures as Signatures for Victim-Centric Infostealer Campaign Discovery | Human-Computer Interaction and Social Computing | Human-Computer Interaction and Social Computing | yes | 0.3466 |
| [2611.18553v1](https://arxiv.org/abs/2611.18553v1) | WeightBench: Evaluating Language Models as Weight-Space Programmers | AI and Machine Learning | NLP and Information Retrieval | no | 0.3076 |
| [2611.17581v1](https://arxiv.org/abs/2611.17581v1) | Beyond Source Code: Evaluating Natural Language Specifications for LLM-Based C-to-Rust Translation | Software Engineering and Systems | NLP and Information Retrieval | no | 0.3440 |
| [2611.17788v1](https://arxiv.org/abs/2611.17788v1) | RAG-FGO: Dynamic Optimization of Query-Rewriting Agents for Generative RAG | NLP and Information Retrieval | NLP and Information Retrieval | yes | 0.1999 |

## Performance

The existing model was loaded once; load time was **166.60 ms**. Direct `predict_proba` latency was measured for 30 calls with zero explicit warm-up calls (first call included), on one collected abstract:

- Mean: **0.6408 ms**
- Median: **0.2577 ms**
- P95 (NumPy linear percentile): **0.4427 ms**
- First call: **11.3449 ms**

These are classification-only local timings. They exclude PDF extraction and HTTP overhead.

Complete document-processing latency through `/categorize/pdf` was **NOT MEASURED**: the arXiv PDF download failed because DNS resolution was unavailable (`nodename nor servname provided, or not known`). Therefore the reported timings below cover classification only; no PDF extraction or HTTP latency is inferred.

## API verification

`POST /categorize` was exercised through FastAPI `TestClient` with actual collected abstracts. Valid input: HTTP 200; missing text: 422; empty text: 422; whitespace-only text: 422; integer text: 422; four additional valid requests: 200, 200, 200, 200. The valid response contained category and confidence fields: True / True. `POST /categorize/pdf` was not exercised because the required source PDF could not be downloaded (DNS failure).

## Interpretation and limitations

Treat these values as **arXiv-category proxy agreement**, not verified performance on manually labeled papers. The selected records are disjoint from the tracked training CSV, but classifier-training provenance is missing, so training-data leakage cannot be ruled out. ArXiv subject categories are broader metadata labels; the mapping is documented and exact against the existing target map, but is not equivalent to human expert annotation. Presentation claims should use those qualifications.

Detailed machine-readable results, source IDs, exclusions, class supports, sample selection, and latency measurements are in `evaluation_results.json`.
