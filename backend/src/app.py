"""Application factory and feature registration for PrintChakra backend."""

import sys
from typing import Dict, Tuple

from flask import Flask
from flask_socketio import SocketIO

if sys.platform == "win32":  # pragma: no cover - console fix specific to Windows
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass

from config.settings import Config
from middleware import RequestLogger, configure_cors, register_error_handlers
from modules.document.converter import FileConverter
from src.api import register_feature_blueprints
from utils.file_utils import ensure_directory
from utils.logger import setup_logger

logger = setup_logger(__name__)


def create_app(config_class=Config) -> Tuple[Flask, SocketIO]:
    """Create and configure Flask application instance."""

    app = Flask(__name__)
    app.config.from_object(config_class)

    configure_cors(app)
    socketio = SocketIO(app, cors_allowed_origins="*", logger=False, engineio_logger=False)
    register_error_handlers(app)
    RequestLogger(app)

    ensure_directory(app.config["UPLOAD_FOLDER"])
    ensure_directory(app.config["PROCESSED_FOLDER"])
    ensure_directory(app.config["CONVERTED_FOLDER"])

    services: Dict[str, object] = {}
    register_feature_blueprints(
        app,
        services=services,
        modules={
            "scanner": None,
            "printer": None,
            "converter": FileConverter(),
        },
    )

    for key, value in services.items():
        setattr(app, f"{key}_service", value)

    app.socketio = socketio

    logger.info("PrintChakra application initialized successfully")
    logger.info("Upload folder: %s", app.config["UPLOAD_FOLDER"])
    logger.info("Processed folder: %s", app.config["PROCESSED_FOLDER"])
    logger.info("Converted folder: %s", app.config["CONVERTED_FOLDER"])

    return app, socketio
