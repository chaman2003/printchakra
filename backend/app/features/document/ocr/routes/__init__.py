"""
PrintChakra Backend - Document OCR Routes

OCR-specific routes for document text extraction.
"""

from flask import Blueprint

ocr_bp = Blueprint("ocr", __name__, url_prefix="/ocr")

# Import route modules
from app.features.document.ocr.routes import extraction
from app.features.document.ocr.routes import batch
from app.features.document.ocr.routes import status

__all__ = ["ocr_bp"]
