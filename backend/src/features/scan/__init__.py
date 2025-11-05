"""Scan feature registration helpers."""

from .routes import create_blueprint
from .service import ScanService

__all__ = ["ScanService", "register_scan_feature", "create_blueprint"]


def register_scan_feature(app, *, scanner_module, file_service):
    """Register scan blueprint and return configured service."""
    service = ScanService(scanner_module)
    blueprint = create_blueprint(service, file_service)
    app.register_blueprint(blueprint, url_prefix="/api/scan")
    return service
