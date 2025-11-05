"""File feature registration helpers."""

from .routes import create_blueprint
from .service import FileService

__all__ = ["FileService", "register_file_feature", "create_blueprint"]


def register_file_feature(app, *, upload_dir: str, processed_dir: str) -> FileService:
    """Register file blueprint and return configured service."""
    service = FileService(upload_dir=upload_dir, processed_dir=processed_dir)
    blueprint = create_blueprint(service)
    app.register_blueprint(blueprint, url_prefix="/api/files")
    return service
