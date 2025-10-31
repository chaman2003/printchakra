"""
Print service
Handles printing operations
"""

from typing import Any, Dict, List, Optional

from models.print_config import PrintConfig


class PrintService:
    """Service for printing operations"""

    def __init__(self, printer_module):
        """
        Initialize print service

        Args:
            printer_module: Printer module instance
        """
        self.printer = printer_module

    def get_available_printers(self) -> List[str]:
        """
        Get list of available printers

        Returns:
            List of printer names
        """
        try:
            return self.printer.get_printers()
        except Exception as e:
            return []

    def print_document(self, filepath: str, config: PrintConfig) -> Dict[str, Any]:
        """
        Print document with configuration

        Args:
            filepath: Path to file to print
            config: Print configuration

        Returns:
            Print result dictionary
        """
        try:
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
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_printer_status(self, printer_name: str) -> Dict[str, Any]:
        """
        Get printer status

        Args:
            printer_name: Printer name

        Returns:
            Status dictionary
        """
        try:
            status = self.printer.get_status(printer_name)
            return {"success": True, "status": status}
        except Exception as e:
            return {"success": False, "error": str(e)}
