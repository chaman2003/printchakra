"""
OCR service
Handles OCR operations
"""

import os
from typing import Any, Dict, Optional

import pytesseract
from PIL import Image


class OCRService:
    """Service for OCR operations"""

    def __init__(self, processed_dir: str):
        """
        Initialize OCR service

        Args:
            processed_dir: Directory for processed text files
        """
        self.processed_dir = processed_dir
        os.makedirs(processed_dir, exist_ok=True)

    def extract_text(self, image_path: str, lang: str = "eng") -> str:
        """
        Extract text from image using OCR

        Args:
            image_path: Path to image file
            lang: OCR language (default: 'eng')

        Returns:
            Extracted text
        """
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image, lang=lang)
            return text.strip()
        except Exception as e:
            raise Exception(f"OCR failed: {str(e)}")

    def save_text(self, filename: str, text: str) -> str:
        """
        Save extracted text to file

        Args:
            filename: Original filename
            text: Extracted text

        Returns:
            Path to saved text file
        """
        # Create text filename
        base_name = os.path.splitext(filename)[0]
        text_filename = f"{base_name}.txt"
        text_path = os.path.join(self.processed_dir, text_filename)

        # Save text
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(text)

        return text_path

    def load_text(self, filename: str) -> Optional[str]:
        """
        Load processed text for file

        Args:
            filename: Original filename

        Returns:
            Extracted text or None
        """
        base_name = os.path.splitext(filename)[0]
        text_filename = f"{base_name}.txt"
        text_path = os.path.join(self.processed_dir, text_filename)

        if not os.path.exists(text_path):
            return None

        try:
            with open(text_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return None

    def process_file(self, filepath: str, filename: str, lang: str = "eng") -> Dict[str, Any]:
        """
        Process file with OCR and save results

        Args:
            filepath: Path to file
            filename: Original filename
            lang: OCR language

        Returns:
            Processing result dictionary
        """
        try:
            # Extract text
            text = self.extract_text(filepath, lang=lang)

            # Save text
            text_path = self.save_text(filename, text)

            return {
                "success": True,
                "text": text,
                "text_path": text_path,
                "has_text": len(text) > 0,
            }
        except Exception as e:
            return {"success": False, "error": str(e), "has_text": False}
