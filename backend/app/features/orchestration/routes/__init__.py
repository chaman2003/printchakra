"""
PrintChakra Backend - Orchestration Routes

Route registration for orchestration feature.
"""

from flask import Blueprint

orchestration_bp = Blueprint("orchestration", __name__, url_prefix="/orchestration")

# Import route modules to register endpoints
from app.features.orchestration.routes import command
from app.features.orchestration.routes import workflow
from app.features.orchestration.routes import config

__all__ = ["orchestration_bp"]
