import io
import logging
from typing import Literal
from pydantic import BaseModel, Field

logger = logging.getLogger("scholarbridge_ml.document_extractor")

DocumentTypeStr = Literal["cv", "paper", "publication", "other"]
ExtractionStatusStr = Literal["success", "ocr_fallback", "warning", "error"]


class DocumentMetadata(BaseModel):
    filename: str
    document_type: str
    extraction_method: str
    extracted_char_count: int
    status: str
    warnings: list[str] = Field(default_factory=list)


class ExtractedDocument(BaseModel):
    filename: str
    document_type: str
    text: str
    extraction_method: str
    extracted_char_count: int
    status: str
    warnings: list[str] = Field(default_factory=list)

    def to_metadata(self) -> DocumentMetadata:
        return DocumentMetadata(
            filename=self.filename,
            document_type=self.document_type,
            extraction_method=self.extraction_method,
            extracted_char_count=self.extracted_char_count,
            status=self.status,
            warnings=self.warnings,
        )


class CombinedDocumentsResult(BaseModel):
    combined_text: str
    documents_metadata: list[DocumentMetadata]
    total_char_count: int
    warnings: list[str] = Field(default_factory=list)
    has_readable_content: bool


def extract_text_with_pdfplumber(content: bytes) -> str:
    """Extract selectable text from PDF bytes using pdfplumber."""
    import pdfplumber

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        pages_text = []
        for idx, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                pages_text.append(page_text.strip())
        return "\n\n".join(pages_text).strip()


def extract_text_with_ocr(content: bytes, filename: str) -> tuple[str, list[str]]:
    """
    Render PDF pages to images using PyMuPDF (fitz) and run Tesseract OCR.
    Prefers PyMuPDF to avoid Poppler dependency.
    """
    logger.info("OCR fallback triggered for %s using PyMuPDF and Tesseract.", filename)
    warnings: list[str] = []
    ocr_pages: list[str] = []

    try:
        import fitz  # PyMuPDF
    except ImportError as e:
        warning_msg = f"PyMuPDF is not installed: {e}"
        logger.warning(warning_msg)
        return "", [warning_msg]

    try:
        import pytesseract
        from PIL import Image
    except ImportError as e:
        warning_msg = f"pytesseract or Pillow is not installed: {e}"
        logger.warning(warning_msg)
        return "", [warning_msg]

    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        warning_msg = f"PyMuPDF failed to parse PDF stream for '{filename}': {exc}"
        logger.warning(warning_msg)
        return "", [warning_msg]

    page_count = len(doc)
    logger.info("Rendering %d pages for OCR on '%s'", page_count, filename)

    for page_idx in range(page_count):
        try:
            page = doc.load_page(page_idx)
            # Render page at 150 DPI for reasonable OCR quality and performance
            pix = page.get_pixmap(dpi=150)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            page_text = pytesseract.image_to_string(img)
            if page_text and page_text.strip():
                ocr_pages.append(page_text.strip())
        except pytesseract.TesseractNotFoundError:
            warning_msg = (
                f"Tesseract OCR executable was not found on host. Cannot perform OCR on scanned PDF '{filename}'."
            )
            logger.warning(warning_msg)
            warnings.append(warning_msg)
            break
        except Exception as exc:
            warning_msg = f"OCR failed on page {page_idx + 1} of '{filename}': {exc}"
            logger.warning(warning_msg)
            warnings.append(warning_msg)

    doc.close()
    extracted_text = "\n\n".join(ocr_pages).strip()
    return extracted_text, warnings


def extract_single_document(
    content: bytes,
    filename: str,
    document_type: str = "paper",
) -> ExtractedDocument:
    """
    Extract text from a single PDF document.
    1. Extracts text using pdfplumber.
    2. If text contains fewer than 200 characters, attempts OCR via PyMuPDF + Tesseract.
    3. Returns ExtractedDocument with complete metadata and status.
    """
    warnings: list[str] = []
    norm_doc_type = document_type.strip().lower() if document_type else "paper"
    if norm_doc_type in ["resume", "curriculum_vitae"]:
        norm_doc_type = "cv"
    elif norm_doc_type in ["publications", "publication"]:
        norm_doc_type = "publication"
    elif norm_doc_type in ["research_paper", "paper"]:
        norm_doc_type = "paper"

    # Validate non-empty content
    if not content or len(content) == 0:
        return ExtractedDocument(
            filename=filename,
            document_type=norm_doc_type,
            text="",
            extraction_method="failed",
            extracted_char_count=0,
            status="error",
            warnings=[f"File '{filename}' is empty."],
        )

    text = ""
    extraction_method = "pdfplumber"

    # Step 1: Attempt pdfplumber extraction
    try:
        text = extract_text_with_pdfplumber(content)
    except Exception as exc:
        warning_msg = f"pdfplumber text extraction failed for '{filename}': {exc}"
        logger.warning(warning_msg)
        warnings.append(warning_msg)
        text = ""

    # Step 2: Check threshold (< 200 chars) -> OCR fallback
    if len(text.strip()) < 200:
        logger.warning(
            "Extracted only %d characters from '%s' with pdfplumber (< 200). Attempting OCR fallback.",
            len(text.strip()),
            filename,
        )
        ocr_text, ocr_warnings = extract_text_with_ocr(content, filename)
        warnings.extend(ocr_warnings)

        if len(ocr_text.strip()) > len(text.strip()):
            text = ocr_text.strip()
            extraction_method = "pymupdf_tesseract_ocr"

    char_count = len(text.strip())

    # Step 3: Determine extraction status
    if char_count >= 200:
        status: str = "ocr_fallback" if extraction_method == "pymupdf_tesseract_ocr" else "success"
    elif char_count > 0:
        status = "warning"
        warning_msg = (
            f"Document '{filename}' contains only {char_count} characters (fewer than 200 characters). "
            "Extraction may be incomplete or text quality is poor."
        )
        warnings.append(warning_msg)
    else:
        status = "warning"
        warning_msg = (
            f"Document '{filename}' is unreadable. No text could be extracted with pdfplumber or OCR."
        )
        warnings.append(warning_msg)

    return ExtractedDocument(
        filename=filename,
        document_type=norm_doc_type,
        text=text.strip(),
        extraction_method=extraction_method,
        extracted_char_count=char_count,
        status=status,
        warnings=warnings,
    )


def combine_documents(documents: list[ExtractedDocument]) -> CombinedDocumentsResult:
    """
    Combine multiple extracted documents preserving document boundaries:
    === CV ===
    [Extracted CV content]

    === Paper 1 ===
    [First research paper]

    === Paper 2 ===
    [Second research paper]

    Maintains document metadata, warnings, and readable flag.
    Does not silently discard any document.
    """
    sections: list[str] = []
    all_warnings: list[str] = []
    documents_metadata: list[DocumentMetadata] = []

    # Separate CVs from papers / publications
    cv_docs: list[ExtractedDocument] = []
    paper_docs: list[ExtractedDocument] = []

    for doc in documents:
        documents_metadata.append(doc.to_metadata())
        all_warnings.extend(doc.warnings)
        if doc.document_type == "cv":
            cv_docs.append(doc)
        else:
            paper_docs.append(doc)

    # Process CV(s)
    if cv_docs:
        for idx, cv in enumerate(cv_docs):
            header = "=== CV ===" if len(cv_docs) == 1 else f"=== CV {idx + 1}: {cv.filename} ==="
            if cv.text:
                sections.append(f"{header}\n{cv.text}")
            else:
                sections.append(f"{header}\n[WARNING: Document '{cv.filename}' could not be read]")
                all_warnings.append(f"CV document '{cv.filename}' has no readable text.")

    # Process Papers / Publications
    paper_counter = 1
    for paper in paper_docs:
        header = f"=== Paper {paper_counter} ==="
        paper_counter += 1
        if paper.text:
            sections.append(f"{header}\nTitle / File: {paper.filename}\n{paper.text}")
        else:
            sections.append(f"{header}\n[WARNING: Document '{paper.filename}' could not be read]")
            all_warnings.append(f"Paper document '{paper.filename}' has no readable text.")

    combined_text = "\n\n".join(sections).strip()
    total_char_count = sum(doc.extracted_char_count for doc in documents)
    has_readable = any(doc.extracted_char_count >= 50 for doc in documents)

    return CombinedDocumentsResult(
        combined_text=combined_text,
        documents_metadata=documents_metadata,
        total_char_count=total_char_count,
        warnings=all_warnings,
        has_readable_content=has_readable,
    )
