"""
PrintChakra Backend - Application Entry Point

Runs the Flask application with SocketIO and HTTPS support.
"""

import os
import sys
import logging

# Add backend directory to Python path so 'app' package can be imported
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.core import create_app, socketio

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask application
app = create_app()

# Get SSL configuration from environment
ssl_cert = os.getenv('SSL_CERT', 'certs/cert.pem')
ssl_key = os.getenv('SSL_KEY', 'certs/key.pem')
local_ip = os.getenv('LOCAL_IP', '0.0.0.0')
port = int(os.getenv('PORT', 5000))

# SSL is opt-in: only enabled when USE_HTTPS=1 is set explicitly
_https_enabled = os.getenv('USE_HTTPS', '0').strip() == '1'
use_ssl = _https_enabled and os.path.exists(ssl_cert) and os.path.exists(ssl_key)

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("PrintChakra Backend Starting...")
    logger.info("=" * 60)
    
    if use_ssl:
        logger.info(f"HTTPS Mode: Enabled")
        logger.info(f"SSL Certificate: {ssl_cert}")
        logger.info(f"SSL Key: {ssl_key}")
        logger.info(f"Backend URL: https://{local_ip}:{port}")
    else:
        if _https_enabled:
            logger.warning("HTTPS requested but certificates not found; falling back to HTTP")
        else:
            logger.info("HTTPS Mode: Disabled (set USE_HTTPS=1 to enable)")
        logger.info(f"Backend URL: http://{local_ip}:{port}")
    
    logger.info("")
    logger.info("Features:")
    logger.info("  - Document Processing Pipeline")
    logger.info("  - Phone Capture (AI Edge Detection)")
    logger.info("  - PaddleOCR Text Extraction")
    logger.info("  - Voice AI Commands (Whisper)")
    logger.info("  - Print Management")
    logger.info("  - Real-time WebSocket Updates")
    logger.info("")
    logger.info("=" * 60)
    
    # Pre-load Whisper model in background (if available)
    try:
        import threading
        from app.modules.voice import load_whisper_model
        
        def preload_whisper():
            try:
                logger.info("Pre-loading Whisper model in background...")
                load_whisper_model()
                logger.info("Whisper model loaded successfully")
            except Exception as e:
                logger.warning(f"Could not pre-load Whisper model: {e}")
        
        thread = threading.Thread(target=preload_whisper, daemon=True)
        thread.start()
    except ImportError:
        logger.info("Whisper module not available - voice features disabled")
    
    # Run application with SocketIO
    try:
        socketio.run(
            app,
            host=local_ip,
            port=port,
            debug=False,
            use_reloader=False,
            ssl_context=(ssl_cert, ssl_key) if use_ssl else None,
            allow_unsafe_werkzeug=True  # For development with SocketIO
        )
    except KeyboardInterrupt:
        logger.info("\nShutting down gracefully...")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        raise
