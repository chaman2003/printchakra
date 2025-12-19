"""
PrintChakra Backend - Features Package

This package contains feature modules organized by frontend UI functionality.
Each feature module maps to a corresponding frontend page or major component.

Features:
- dashboard: Main dashboard functionality (file listing, health, system info)
- phone: Phone upload and camera functionality
- document: Document management, thumbnails, conversion, OCR
- print: Print job submission and printer management
- voice: Voice AI, transcription, TTS, chat
- connection: Connection validation (WiFi, camera, printer, services)
"""

# Import blueprints from each feature
from app.features.dashboard import dashboard_bp
from app.features.phone import phone_bp
from app.features.document import document_bp, ocr_bp
from app.features.print import print_bp
from app.features.voice import voice_bp
from app.features.connection import connection_bp

__all__ = [
    'dashboard_bp',
    'phone_bp',
    'document_bp',
    'ocr_bp',
    'print_bp',
    'voice_bp',
    'connection_bp',
]


def register_all_blueprints(app, url_prefix: str = "/api"):
    """
    Register all feature blueprints with the Flask app.
    
    Args:
        app: Flask application instance
        url_prefix: Base URL prefix for all routes (default: /api)
    """
    # Dashboard routes at root
    app.register_blueprint(dashboard_bp, url_prefix=url_prefix)
    
    # Phone routes under /phone
    app.register_blueprint(phone_bp, url_prefix=f"{url_prefix}/phone")
    
    # Document routes under /document
    app.register_blueprint(document_bp, url_prefix=f"{url_prefix}/document")
    
    # OCR routes under /ocr
    app.register_blueprint(ocr_bp, url_prefix=f"{url_prefix}/ocr")
    
    # Print routes under /print
    app.register_blueprint(print_bp, url_prefix=f"{url_prefix}/print")
    
    # Voice routes under /voice
    app.register_blueprint(voice_bp, url_prefix=f"{url_prefix}/voice")
    
    # Connection routes under /connection
    app.register_blueprint(connection_bp, url_prefix=f"{url_prefix}/connection")
