"""
PrintChakra Backend - Connection Routes

Route registration for connection feature.
"""

from flask import Blueprint

connection_bp = Blueprint("connection", __name__, url_prefix="/connection")

# Import route modules to register endpoints
from app.features.connection.routes import wifi
from app.features.connection.routes import camera
from app.features.connection.routes import printer
from app.features.connection.routes import services

__all__ = ["connection_bp"]
