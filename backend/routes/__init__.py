"""
Routes package
API route blueprints
"""

from .conversion_routes import conversion_bp
from .file_routes import file_bp
from .ocr_routes import ocr_bp
from .print_routes import print_bp
from .scan_routes import scan_bp

__all__ = [
    "file_bp",
    "scan_bp",
    "print_bp",
    "ocr_bp",
    "conversion_bp",
]


def register_routes(app):
    """
    Register all route blueprints with app

    Args:
        app: Flask application instance
    """
    app.register_blueprint(file_bp, url_prefix="/api/files")
    app.register_blueprint(scan_bp, url_prefix="/api/scan")
    app.register_blueprint(print_bp, url_prefix="/api/print")
    app.register_blueprint(ocr_bp, url_prefix="/api/ocr")
    app.register_blueprint(conversion_bp, url_prefix="/api/convert")
