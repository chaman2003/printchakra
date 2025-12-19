"""
PrintChakra Backend - Document OCR Package

OCR functionality for document text extraction.
"""

from app.features.document.ocr.routes import ocr_bp
from app.features.document.ocr.paddle_ocr_service import PaddleOCRService

__all__ = ['ocr_bp', 'PaddleOCRService']
