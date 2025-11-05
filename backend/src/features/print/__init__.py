"""Print feature registration helpers."""

from .routes import create_blueprint
from .service import PrintService

__all__ = ["PrintService", "register_print_feature", "create_blueprint"]


def register_print_feature(app, *, printer_module, file_service):
    """Register print blueprint and return service instance."""
    service = PrintService(printer_module)
    blueprint = create_blueprint(service, file_service)
    app.register_blueprint(blueprint, url_prefix="/api/print")
    return service
