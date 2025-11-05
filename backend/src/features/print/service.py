"""Print feature service layer."""

from typing import Any, Dict, List

from models.print_config import PrintConfig


class PrintService:
    """Service responsible for orchestrating printer module interactions."""

    def __init__(self, printer_module=None):
        self.printer = printer_module

    def get_available_printers(self) -> List[str]:
        try:
            if not self.printer:
                return []
            return self.printer.get_printers()
        except Exception:  # noqa: BLE001
            return []

    def print_document(self, filepath: str, config: PrintConfig) -> Dict[str, Any]:
        try:
            if not self.printer:
                return {"success": False, "error": "Printer module not configured"}

            result = self.printer.print_file(
                filepath=filepath,
                printer_name=config.printer_name,
                copies=config.copies,
                paper_size=config.paper_size,
                orientation=config.orientation,
                color_mode=config.color_mode,
                duplex=config.duplex,
                pages=config.pages,
            )
            return {"success": True, "result": result}
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "error": str(exc)}

    def get_printer_status(self, printer_name: str) -> Dict[str, Any]:
        try:
            if not self.printer:
                return {"success": False, "error": "Printer module not configured"}

            status = self.printer.get_status(printer_name)
            return {"success": True, "status": status}
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "error": str(exc)}
