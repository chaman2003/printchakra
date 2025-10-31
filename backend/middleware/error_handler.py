"""
Error handler middleware
Centralized error handling
"""

from flask import jsonify
from werkzeug.exceptions import HTTPException
import traceback
from utils.logger import get_logger

logger = get_logger(__name__)


def register_error_handlers(app):
    """
    Register error handlers with Flask app
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request"""
        return jsonify({
            'error': 'Bad Request',
            'message': str(error)
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found"""
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handle 500 Internal Server Error"""
        logger.error(f"Internal server error: {str(error)}")
        logger.error(traceback.format_exc())
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle all unhandled exceptions"""
        logger.error(f"Unhandled exception: {str(error)}")
        logger.error(traceback.format_exc())
        
        # Handle HTTP exceptions
        if isinstance(error, HTTPException):
            return jsonify({
                'error': error.name,
                'message': error.description
            }), error.code
        
        # Handle other exceptions
        return jsonify({
            'error': 'Internal Server Error',
            'message': str(error)
        }), 500
