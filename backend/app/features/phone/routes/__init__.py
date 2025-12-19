"""
PrintChakra Backend - Phone Routes

Route registration for phone feature.
"""

from flask import Blueprint

phone_bp = Blueprint("phone", __name__, url_prefix="/phone")

# Import route modules to register endpoints
from app.features.phone.routes import upload
from app.features.phone.routes import capture
from app.features.phone.routes import quality

__all__ = ["phone_bp"]
