"""OCR feature service layer."""

import os
from typing import Any, Dict, Optional

import pytesseract
from PIL import Image


class OCRService:
    """Service delivering OCR extraction and persistence support."""

    def __init__(self, processed_dir: str):
        self.processed_dir = processed_dir
        os.makedirs(processed_dir, exist_ok=True)

    def extract_text(self, image_path: str, lang: str = "eng") -> str:
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image, lang=lang)
            return text.strip()
        except Exception as exc:  # noqa: BLE001
            raise Exception(f"OCR failed: {exc}") from exc

    def save_text(self, filename: str, text: str) -> str:
        base_name = os.path.splitext(filename)[0]
        text_filename = f"{base_name}.txt"
        text_path = os.path.join(self.processed_dir, text_filename)

        with open(text_path, "w", encoding="utf-8") as file_handle:
            file_handle.write(text)

        return text_path

    def load_text(self, filename: str) -> Optional[str]:
        base_name = os.path.splitext(filename)[0]
        text_filename = f"{base_name}.txt"
        text_path = os.path.join(self.processed_dir, text_filename)

        if not os.path.exists(text_path):
            return None

        try:
            with open(text_path, "r", encoding="utf-8") as file_handle:
                return file_handle.read()
        except Exception:  # noqa: BLE001
            return None

    def process_file(self, filepath: str, filename: str, lang: str = "eng") -> Dict[str, Any]:
        try:
            text = self.extract_text(filepath, lang=lang)
            text_path = self.save_text(filename, text)
            return {
                "success": True,
                "text": text,
                "text_path": text_path,
                "has_text": len(text) > 0,
            }
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "error": str(exc), "has_text": False}
