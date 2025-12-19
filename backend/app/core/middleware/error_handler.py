"""
PrintChakra Backend - Error Handlers

Centralized error handling for the Flask application.
"""

import traceback
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


def register_error_handlers(app: Flask) -> None:
    """
    Register error handlers with the Flask application.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def handle_bad_request(e):
        """Handle malformed requests (often from ngrok proxy)."""
        return jsonify({"error": "Bad request"}), 400
    
    @app.errorhandler(404)
    def handle_not_found(e):
        """Handle resource not found errors."""
        return jsonify({"error": "Resource not found"}), 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(e):
        """Handle method not allowed errors."""
        return jsonify({"error": "Method not allowed"}), 405
    
    @app.errorhandler(413)
    def handle_request_entity_too_large(e):
        """Handle file too large errors."""
        return jsonify({
            "error": "File too large",
            "max_size_mb": app.config.get('MAX_CONTENT_LENGTH', 50*1024*1024) / (1024*1024)
        }), 413
    
    @app.errorhandler(500)
    def handle_internal_error(e):
        """Handle internal server errors."""
        return jsonify({
            "error": "Internal server error",
            "details": str(e) if app.debug else None
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle uncaught exceptions."""
        # Log the full traceback
        app.logger.error(f"Unhandled exception: {str(e)}")
        app.logger.error(traceback.format_exc())
        
        # Return appropriate response
        if isinstance(e, HTTPException):
            return jsonify({"error": e.description}), e.code
        
        return jsonify({
            "error": "An unexpected error occurred",
            "details": str(e) if app.debug else None
        }), 500
    
    # Configure Flask to trap bad request errors
    app.config["TRAP_BAD_REQUEST_ERRORS"] = True
