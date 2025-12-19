"""
PrintChakra Backend - Print Routes

Route registration for print feature.
"""

from flask import Blueprint

print_bp = Blueprint("print", __name__, url_prefix="/print")

# Import route modules to register endpoints
from app.features.print.routes import jobs
from app.features.print.routes import queue
from app.features.print.routes import config

__all__ = ["print_bp"]
