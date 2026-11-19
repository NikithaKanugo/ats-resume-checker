"""
extract_text.py

Converts a raw file buffer (bytes) into a plain text string.
PDF  → pdfplumber
DOCX → mammoth
TXT  → UTF-8 decode
"""

from __future__ import annotations
import io
from typing import Literal

FileFormat = Literal["pdf", "docx", "txt", "unknown"]


class ExtractionError(Exception):
    pass


def detect_format(filename: str) -> FileFormat:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext == "pdf":
        return "pdf"
    if ext in ("docx", "doc"):
        return "docx"
    if ext == "txt":
        return "txt"
    return "unknown"


def extract_text(data: bytes, fmt: FileFormat) -> str:
    if fmt == "txt":
        return _extract_txt(data)
    if fmt == "pdf":
        return _extract_pdf(data)
    if fmt == "docx":
        return _extract_docx(data)
    raise ExtractionError(
        "Unsupported file format. Please upload a PDF, DOCX, or TXT file."
    )


# ---------------------------------------------------------------------------
# Format extractors
# ---------------------------------------------------------------------------

def _extract_txt(data: bytes) -> str:
    try:
        text = data.decode("utf-8", errors="replace").strip()
    except Exception as e:
        raise ExtractionError(f"Failed to decode text file: {e}") from e
    if not text:
        raise ExtractionError("The uploaded text file appears to be empty.")
    return text


def _extract_pdf(data: bytes) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = []
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    pages.append(t)
            text = "\n".join(pages).strip()
    except ExtractionError:
        raise
    except Exception as e:
        raise ExtractionError(f"PDF extraction failed: {e}") from e
    if not text:
        raise ExtractionError(
            "No text could be extracted from this PDF. "
            "It may be image-based or password-protected."
        )
    return text


def _extract_docx(data: bytes) -> str:
    try:
        import mammoth
        result = mammoth.extract_raw_text(io.BytesIO(data))
        text = (result.value or "").strip()
    except ExtractionError:
        raise
    except Exception as e:
        raise ExtractionError(f"DOCX extraction failed: {e}") from e
    if not text:
        raise ExtractionError(
            "No text could be extracted from this DOCX file. "
            "It may be empty or corrupted."
        )
    return text
