from io import BytesIO

import pdfplumber


def extract_pdf_text(content: bytes) -> str:
    with pdfplumber.open(BytesIO(content)) as pdf:
        return "\n".join(page.extract_text() or "" for page in pdf.pages).strip()