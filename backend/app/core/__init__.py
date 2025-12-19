"""
PrintChakra Backend - Core Package

This module provides the Flask application factory and core configuration.
"""

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

# Global extensions (initialized later)
socketio = SocketIO()
cors = CORS()


def create_app(config_name: str = "development") -> Flask:
    """
    Application factory for creating Flask app instances.
    
    Args:
        config_name: Configuration environment name
        
    Returns:
        Configured Flask application
    """
    app = Flask(__name__)
    
    # Load configuration
    from app.core.config import get_config
    app.config.from_object(get_config(config_name))
    
    # Initialize extensions
    _init_extensions(app)
    
    # Register blueprints
    _register_blueprints(app)
    
    # Register socket handlers
    _register_socket_handlers()
    
    # Setup error handlers
    _setup_error_handlers(app)
    
    return app


def _init_extensions(app: Flask) -> None:
    """Initialize Flask extensions."""
    from app.core.extensions import init_cors, init_socketio
    
    init_cors(app)
    init_socketio(app, socketio)


def _register_blueprints(app: Flask) -> None:
    """Register all feature blueprints."""
    # Dashboard routes
    try:
        from app.features.dashboard.routes import dashboard_bp
        app.register_blueprint(dashboard_bp)
    except ImportError as e:
        app.logger.warning(f"Could not load dashboard routes: {e}")
    
    # Phone capture routes
    try:
        from app.features.phone.routes import phone_bp
        app.register_blueprint(phone_bp, url_prefix='/phone')
    except ImportError as e:
        app.logger.warning(f"Could not load phone routes: {e}")
    
    # Document routes
    try:
        from app.features.document.routes import document_bp
        app.register_blueprint(document_bp, url_prefix='/document')
    except ImportError as e:
        app.logger.warning(f"Could not load document routes: {e}")
    
    # OCR routes
    try:
        from app.features.document.ocr.routes import ocr_bp
        app.register_blueprint(ocr_bp, url_prefix='/ocr')
    except ImportError as e:
        app.logger.warning(f"Could not load OCR routes: {e}")
    
    # Print routes
    try:
        from app.features.print.routes import print_bp
        app.register_blueprint(print_bp, url_prefix='/print')
    except ImportError as e:
        app.logger.warning(f"Could not load print routes: {e}")
    
    # Voice routes
    try:
        from app.features.voice.routes import voice_bp
        app.register_blueprint(voice_bp, url_prefix='/voice')
    except ImportError as e:
        app.logger.warning(f"Could not load voice routes: {e}")
    
    # Orchestration routes
    try:
        from app.features.orchestration.routes import orchestration_bp
        app.register_blueprint(orchestration_bp, url_prefix='/orchestrate')
    except ImportError as e:
        app.logger.warning(f"Could not load orchestration routes: {e}")
    
    # Connection routes
    try:
        from app.features.connection.routes import connection_bp
        app.register_blueprint(connection_bp, url_prefix='/connection')
    except ImportError as e:
        app.logger.warning(f"Could not load connection routes: {e}")


def _register_socket_handlers() -> None:
    """Register Socket.IO event handlers."""
    try:
        from app.sockets.handlers import register_handlers
        register_handlers(socketio)
    except ImportError as e:
        print(f"Could not load socket handlers: {e}")


def _setup_error_handlers(app: Flask) -> None:
    """Setup application error handlers."""
    try:
        from app.core.middleware.error_handler import register_error_handlers
        register_error_handlers(app)
    except ImportError:
        # Fallback error handlers
        @app.errorhandler(400)
        def handle_bad_request(e):
            from flask import jsonify
            return jsonify({"error": "Bad request"}), 400
        
        @app.errorhandler(404)
        def handle_not_found(e):
            from flask import jsonify
            return jsonify({"error": "Not found"}), 404
        
        @app.errorhandler(500)
        def handle_internal_error(e):
            from flask import jsonify
            return jsonify({"error": "Internal server error"}), 500
