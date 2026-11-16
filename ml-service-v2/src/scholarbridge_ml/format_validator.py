
import fitz
import pdfplumber
import re
from pathlib import Path


def check_ieee_format(
    pdf_path: str,
    max_pages: int = 6,
    require_two_columns: bool = True,
    required_sections: list[str] | None = None,
) -> dict:

    errors = []
    warnings = []

    required_sections = required_sections or [
        "abstract",
        "introduction",
        "conclusion",
        "references",
    ]

    path = Path(pdf_path)

    if not path.is_file():
        return {
            "passed": False,
            "errors": ["PDF file not found."],
            "warnings": [],
            "page_count": 0,
            "detected_fonts": [],
            "detected_sections": [],
        }

    try:
        with fitz.open(path) as document:
            page_count = len(document)
            full_text = "\n".join(page.get_text() for page in document)

            if page_count > max_pages:
                errors.append(
                    f"Page count {page_count} exceeds the limit of {max_pages}."
                )

            if page_count == 0:
                errors.append("The PDF contains no pages.")

            if not full_text.strip():
                errors.append(
                    "No extractable text found. The PDF may contain scanned pages."
                )

            detected_fonts = set()
            column_results = []

            for page in document:
                blocks = page.get_text("blocks")

                text_blocks = [
                    block for block in blocks
                    if len(block) >= 5
                    and isinstance(block[4], str)
                    and block[4].strip()
                ]

                left = 0
                right = 0
                page_width = page.rect.width

                for block in text_blocks:
                    x0, _, x1, _, text = block[:5]

                    if x1 - x0 > page_width * 0.75:
                        continue

                    center = (x0 + x1) / 2

                    if center < page_width * 0.5:
                        left += 1
                    else:
                        right += 1

                column_results.append(left > 0 and right > 0)

                for block in page.get_text("dict")["blocks"]:
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if span.get("text", "").strip():
                                detected_fonts.add(span.get("font", "Unknown"))

        if require_two_columns and column_results:
            if not any(column_results):
                errors.append(
                    "Two-column layout could not be detected."
                )
            elif not all(column_results):
                warnings.append(
                    "Some pages may not follow the expected two-column layout."
                )

        if not detected_fonts:
            warnings.append("Could not reliably detect PDF font information.")

        with pdfplumber.open(path) as pdf:
            font_names = set()
            font_sizes = []

            for page in pdf.pages:
                for char in page.chars:
                    font_names.add(char.get("fontname", "Unknown"))
                    size = char.get("size")

                    if size is not None:
                        font_sizes.append(float(size))

        if font_names:
            if not any(
                "times" in font.lower()
                for font in font_names
            ):
                warnings.append(
                    "Times-style fonts were not detected. "
                    "Verify against the selected conference template."
                )

        normalized_text = re.sub(
            r"\s+",
            " ",
            full_text.lower()
        )

        detected_sections = []

        for section in required_sections:
            pattern = (
                r"\b"
                + re.escape(section)
                + r"\b"
            )

            if re.search(pattern, normalized_text):
                detected_sections.append(section)
            else:
                warnings.append(
                    f"Required section not detected: {section}."
                )

        return {
            "passed": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "page_count": page_count,
            "detected_fonts": sorted(detected_fonts),
            "detected_sections": detected_sections,
        }

    except Exception as exc:
        return {
            "passed": False,
            "errors": [f"PDF validation failed: {str(exc)}"],
            "warnings": [],
            "page_count": 0,
            "detected_fonts": [],
            "detected_sections": [],
        }
