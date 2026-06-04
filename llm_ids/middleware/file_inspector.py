from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Any

import fitz
from PIL import Image
import pytesseract
from pytesseract import TesseractNotFoundError


_PDF_EXTENSIONS = {".pdf"}
_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp"}


def _is_hidden_color(color: int | None) -> bool:
    if color is None:
        return False

    red = (color >> 16) & 0xFF
    green = (color >> 8) & 0xFF
    blue = color & 0xFF
    return red >= 245 and green >= 245 and blue >= 245


def extract_pdf_text(file_bytes: bytes) -> str:
    combined_text: list[str] = []

    with fitz.open(stream=file_bytes, filetype="pdf") as document:
        for page in document:
            page_data = page.get_text("dict")
            for block in page_data.get("blocks", []):
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        span_text = span.get("text", "")
                        if span_text:
                            combined_text.append(span_text)

    return "\n".join(combined_text).strip()


def _extract_pdf_text_with_metadata(file_bytes: bytes) -> tuple[str, bool]:
    combined_text: list[str] = []
    hidden_text_found = False

    with fitz.open(stream=file_bytes, filetype="pdf") as document:
        for page in document:
            page_data = page.get_text("dict")
            for block in page_data.get("blocks", []):
                if block.get("type") != 0:
                    continue
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        span_text = span.get("text", "")
                        if not span_text:
                            continue

                        combined_text.append(span_text)

                        if _is_hidden_color(span.get("color")):
                            hidden_text_found = True

    return "\n".join(combined_text).strip(), hidden_text_found


def extract_image_text(file_bytes: bytes) -> str:
    with Image.open(BytesIO(file_bytes)) as image:
        try:
            return pytesseract.image_to_string(image).strip()
        except TesseractNotFoundError as exc:
            raise RuntimeError(
                "Tesseract OCR executable is not installed or not available on PATH."
            ) from exc


def inspect_file(file_bytes: bytes, filename: str) -> dict[str, Any]:
    file_extension = Path(filename).suffix.lower()

    if file_extension in _PDF_EXTENSIONS:
        extracted_text, hidden_text_found = _extract_pdf_text_with_metadata(file_bytes)
        return {
            "extracted_text": extracted_text,
            "hidden_text_found": hidden_text_found,
            "file_type": "pdf",
        }

    if file_extension in _IMAGE_EXTENSIONS:
        extracted_text = extract_image_text(file_bytes)
        return {
            "extracted_text": extracted_text,
            "hidden_text_found": False,
            "file_type": "image",
        }

    raise ValueError(f"Unsupported file type: {file_extension or 'unknown'}")