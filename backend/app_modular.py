"""
PrintChakra Backend Application (Modularized)
Main application entry point using modular architecture
"""

from flask import Flask
from flask_socketio import SocketIO
import os
import sys

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Import configuration
from config.settings import Config

# Import utilities
from utils.logger import setup_logger
from utils.file_utils import ensure_directory

# Import middleware
from middleware import register_error_handlers, configure_cors, RequestLogger

# Import services
from services import FileService, ScanService, PrintService, OCRService, ConversionService

# Import routes
from routes import register_routes
from routes.file_routes import init_file_routes
from routes.scan_routes import init_scan_routes
from routes.print_routes import init_print_routes
from routes.ocr_routes import init_ocr_routes
from routes.conversion_routes import init_conversion_routes

# Import existing modules (legacy)
from modules import scanning, storage, file_converter

# Setup logger
logger = setup_logger(__name__)

def create_app(config_class=Config):
    """
    Application factory
    
    Args:
        config_class: Configuration class
        
    Returns:
        Flask application instance
    """
    # Create Flask app
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Configure CORS
    configure_cors(app)
    
    # Initialize SocketIO
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        logger=False,
        engineio_logger=False
    )
    
    # Register error handlers
    register_error_handlers(app)
    
    # Initialize request logger
    RequestLogger(app)
    
    # Ensure directories exist
    ensure_directory(app.config['UPLOAD_FOLDER'])
    ensure_directory(app.config['PROCESSED_FOLDER'])
    ensure_directory(app.config['CONVERTED_FOLDER'])
    
    # Initialize services
    file_service = FileService(
        upload_dir=app.config['UPLOAD_FOLDER'],
        processed_dir=app.config['PROCESSED_FOLDER']
    )
    
    scan_service = ScanService(scanning)
    
    print_service = PrintService(None)  # Printer module not yet available
    
    ocr_service = OCRService(
        processed_dir=app.config['PROCESSED_FOLDER']
    )
    
    conversion_service = ConversionService(
        converter_module=file_converter,
        converted_dir=app.config['CONVERTED_FOLDER']
    )
    
    # Initialize route modules with services
    init_file_routes(file_service)
    init_scan_routes(scan_service)
    init_print_routes(print_service, file_service)
    init_ocr_routes(ocr_service, file_service)
    init_conversion_routes(conversion_service, file_service)
    
    # Register all routes
    register_routes(app)
    
    # Store services in app context for access
    app.file_service = file_service
    app.scan_service = scan_service
    app.print_service = print_service
    app.ocr_service = ocr_service
    app.conversion_service = conversion_service
    app.socketio = socketio
    
    logger.info("PrintChakra application initialized successfully")
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    logger.info(f"Processed folder: {app.config['PROCESSED_FOLDER']}")
    logger.info(f"Converted folder: {app.config['CONVERTED_FOLDER']}")
    
    return app, socketio


# Create application instance
app, socketio = create_app()


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    logger.info(f"Starting PrintChakra backend on port {port}")
    socketio.run(
        app,
        host='0.0.0.0',
        port=port,
        debug=True,
        allow_unsafe_werkzeug=True
    )
