"""
CORS configuration middleware
"""

from flask_cors import CORS


def configure_cors(app, origins=None):
    """
    Configure CORS for Flask app

    Args:
        app: Flask application instance
        origins: List of allowed origins (None = allow all)
    """
    if origins is None:
        origins = "*"

    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )
