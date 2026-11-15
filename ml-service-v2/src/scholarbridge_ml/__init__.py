"""ScholarBridge ML Service package."""

from scholarbridge_ml.document_extractor import (
    CombinedDocumentsResult,
    DocumentMetadata,
    ExtractedDocument,
    combine_documents,
    extract_single_document,
)

__all__ = [
    "CombinedDocumentsResult",
    "DocumentMetadata",
    "ExtractedDocument",
    "combine_documents",
    "extract_single_document",
]
