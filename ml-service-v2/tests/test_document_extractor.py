import io
import unittest
from unittest.mock import patch, MagicMock
import fitz  # PyMuPDF

from scholarbridge_ml.document_extractor import (
    extract_single_document,
    combine_documents,
    ExtractedDocument,
)


def create_test_pdf(text: str) -> bytes:
    """Helper to generate an in-memory PDF with the provided text."""
    doc = fitz.open()
    page = doc.new_page()
    # Insert text into page
    point = fitz.Point(50, 72)
    page.insert_text(point, text, fontsize=11)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


class TestDocumentExtractor(unittest.TestCase):
    def test_normal_text_pdf_extraction(self):
        """Test 1: Normal text-based CV extraction with pdfplumber (>= 200 chars)."""
        sample_cv_text = (
            "CURRICULUM VITAE - Dr. Aris Thorne\n"
            "Department of Computer Science and Engineering, MITS Gwalior.\n"
            "Research Focus: Deep Learning, Computer Vision, Medical Image Segmentation.\n"
            "Over 12 years of academic research and mentorship in convolutional neural networks, "
            "transformer architectures for multimodal imaging, and real-time inference optimization. "
            "Published more than 25 peer-reviewed papers in IEEE Transactions and CVPR."
        )
        self.assertGreater(len(sample_cv_text), 200)

        pdf_bytes = create_test_pdf(sample_cv_text)
        extracted = extract_single_document(pdf_bytes, "thorne_cv.pdf", document_type="cv")

        self.assertEqual(extracted.filename, "thorne_cv.pdf")
        self.assertEqual(extracted.document_type, "cv")
        self.assertEqual(extracted.extraction_method, "pdfplumber")
        self.assertEqual(extracted.status, "success")
        self.assertIn("Medical Image Segmentation", extracted.text)
        self.assertGreaterEqual(extracted.extracted_char_count, 200)
        self.assertEqual(len(extracted.warnings), 0)

    @patch("scholarbridge_ml.document_extractor.extract_text_with_ocr")
    def test_scanned_pdf_ocr_fallback(self, mock_ocr):
        """Test 2: Scanned PDF OCR fallback when pdfplumber extracts fewer than 200 characters."""
        # Mock OCR output when scanned PDF has insufficient digital text
        mock_ocr.return_value = (
            "Scanned Research Paper on Graph Neural Networks and Knowledge Graph Embeddings. "
            "We propose a novel relational graph convolutional network architecture to predict molecular properties. "
            "Experimental results on benchmark datasets demonstrate a 15% increase in AUC-ROC.",
            []
        )

        short_text = "Scan page 1"  # < 200 characters
        pdf_bytes = create_test_pdf(short_text)

        extracted = extract_single_document(pdf_bytes, "scanned_paper.pdf", document_type="paper")

        mock_ocr.assert_called_once()
        self.assertEqual(extracted.extraction_method, "pymupdf_tesseract_ocr")
        self.assertEqual(extracted.status, "ocr_fallback")
        self.assertIn("Graph Neural Networks", extracted.text)
        self.assertGreater(extracted.extracted_char_count, 100)

    def test_multiple_document_combining_preserves_boundaries(self):
        """Test 3: Multiple document uploads preserving boundaries (=== CV ===, === Paper 1 ===, === Paper 2 ===)."""
        cv_doc = ExtractedDocument(
            filename="prof_cv.pdf",
            document_type="cv",
            text="Professor Jane Doe CV: Expert in Natural Language Processing and LLMs.",
            extraction_method="pdfplumber",
            extracted_char_count=68,
            status="success",
            warnings=[],
        )

        paper1 = ExtractedDocument(
            filename="paper_attention.pdf",
            document_type="paper",
            text="Attention Is What You Need: Efficient Transformers for Low-Resource Languages.",
            extraction_method="pdfplumber",
            extracted_char_count=77,
            status="success",
            warnings=[],
        )

        paper2 = ExtractedDocument(
            filename="paper_speech.pdf",
            document_type="paper",
            text="Speech-to-Text Multi-task Learning using Self-Supervised Acoustic Representations.",
            extraction_method="pdfplumber",
            extracted_char_count=82,
            status="success",
            warnings=[],
        )

        combined = combine_documents([cv_doc, paper1, paper2])

        self.assertTrue(combined.has_readable_content)
        self.assertIn("=== CV ===", combined.combined_text)
        self.assertIn("=== Paper 1 ===", combined.combined_text)
        self.assertIn("=== Paper 2 ===", combined.combined_text)
        self.assertIn("paper_attention.pdf", combined.combined_text)
        self.assertIn("paper_speech.pdf", combined.combined_text)
        self.assertEqual(len(combined.documents_metadata), 3)
        self.assertEqual(combined.total_char_count, 68 + 77 + 82)

    def test_insufficient_or_unreadable_documents(self):
        """Test 4: Insufficient or unreadable documents return warnings and are not silently discarded."""
        empty_pdf = create_test_pdf("")
        with patch("scholarbridge_ml.document_extractor.extract_text_with_ocr", return_value=("", ["OCR failed to read"])):
            extracted = extract_single_document(empty_pdf, "blank.pdf", document_type="cv")

        self.assertEqual(extracted.status, "warning")
        self.assertEqual(extracted.extracted_char_count, 0)
        self.assertGreater(len(extracted.warnings), 0)
        self.assertTrue(any("unreadable" in w.lower() for w in extracted.warnings))

        # Combining with unreadable document retains metadata and records explicit warning
        combined = combine_documents([extracted])
        self.assertEqual(len(combined.documents_metadata), 1)
        self.assertEqual(combined.documents_metadata[0].filename, "blank.pdf")
        self.assertIn("WARNING", combined.combined_text)
        self.assertFalse(combined.has_readable_content)


if __name__ == "__main__":
    unittest.main()
