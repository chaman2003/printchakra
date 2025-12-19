"""
PrintChakra Backend - Connection Feature

Provides connection validation functionality including:
- Phone/camera connection validation
- Printer connection validation
- Ollama/AI service validation
- System health checks
"""

from app.features.connection.routes import connection_bp

__all__ = ['connection_bp']
