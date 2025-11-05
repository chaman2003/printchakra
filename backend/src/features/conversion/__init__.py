"""Conversion feature registration helpers."""

from .routes import create_blueprint
from .service import ConversionService

__all__ = ["ConversionService", "register_conversion_feature", "create_blueprint"]


def register_conversion_feature(app, *, converter_module, converted_dir: str, file_service):
    """Register conversion blueprint and return configured service."""
    service = ConversionService(converter_module, converted_dir=converted_dir)
    blueprint = create_blueprint(service, file_service)
    app.register_blueprint(blueprint, url_prefix="/api/convert")
    return service
