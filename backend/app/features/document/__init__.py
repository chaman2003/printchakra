"""
PrintChakra Backend - Document Feature

Provides document management functionality including:
- Document storage and retrieval
- Thumbnail generation
- PDF page extraction
- File conversion
- OCR text extraction
"""

from app.features.document.routes import document_bp
from app.features.document.ocr.routes import ocr_bp

__all__ = ['document_bp', 'ocr_bp']
