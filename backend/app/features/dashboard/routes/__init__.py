"""
PrintChakra Backend - Dashboard Routes Package

Organizes dashboard routes by functionality.
"""

from flask import Blueprint

# Create main dashboard blueprint
dashboard_bp = Blueprint('dashboard', __name__)

# Import route modules to register routes
from app.features.dashboard.routes import health
from app.features.dashboard.routes import files
from app.features.dashboard.routes import system

__all__ = ['dashboard_bp']
