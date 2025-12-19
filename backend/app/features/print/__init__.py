"""
PrintChakra Backend - Print Feature

Provides print management functionality including:
- Printer detection and status
- Print job submission
- Print configuration
- Multi-page print workflows
"""

from app.features.print.routes import print_bp

__all__ = ['print_bp']
