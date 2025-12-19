"""
PrintChakra Backend - Document Routes

Route registration for document feature.
"""

from flask import Blueprint

document_bp = Blueprint("document", __name__, url_prefix="/document")

# Import route modules to register endpoints
from app.features.document.routes import files
from app.features.document.routes import thumbnails
from app.features.document.routes import conversion

__all__ = ["document_bp"]
