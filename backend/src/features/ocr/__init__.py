"""OCR feature registration helpers."""

from .routes import create_blueprint
from .service import OCRService

__all__ = ["OCRService", "register_ocr_feature", "create_blueprint"]


def register_ocr_feature(app, *, processed_dir: str, file_service):
    """Register OCR blueprint and return configured service."""
    service = OCRService(processed_dir=processed_dir)
    blueprint = create_blueprint(service, file_service)
    app.register_blueprint(blueprint, url_prefix="/api/ocr")
    return service
