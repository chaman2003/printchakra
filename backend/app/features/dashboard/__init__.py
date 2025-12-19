"""
PrintChakra Backend - Dashboard Feature

Provides dashboard-related functionality including system info,
health checks, and file listing.
"""

from app.features.dashboard.routes import dashboard_bp
from app.features.dashboard.services.system_service import SystemService

__all__ = ['dashboard_bp', 'SystemService']
