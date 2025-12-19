"""
PrintChakra Backend - Dashboard Health Routes

Health check and status endpoints.
"""

from flask import jsonify
from app.features.dashboard.routes import dashboard_bp


@dashboard_bp.route("/", methods=["GET"])
def index():
    """Root endpoint - API info."""
    return jsonify({
        "service": "PrintChakra Backend",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "files": "/files",
            "system": "/system/*",
            "phone": "/phone/*",
            "document": "/document/*",
            "ocr": "/ocr/*",
            "print": "/print/*",
            "voice": "/voice/*",
            "connection": "/connection/*",
            "orchestrate": "/orchestrate/*"
        }
    })


@dashboard_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({
        "status": "healthy",
        "service": "PrintChakra Backend",
        "modules": {
            "core": True,
            "features": True,
            "sockets": True
        }
    })


@dashboard_bp.route("/ping", methods=["GET"])
def ping():
    """Simple ping endpoint."""
    return jsonify({"pong": True})
