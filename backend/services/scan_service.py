"""
Scan service
Handles scanner operations
"""

from typing import Any, Dict, Optional

from models.scan_config import ScanConfig


class ScanService:
    """Service for scanning operations"""

    def __init__(self, scanner_module):
        """
        Initialize scan service

        Args:
            scanner_module: Scanner module instance
        """
        self.scanner = scanner_module

    def get_available_scanners(self) -> list:
        """
        Get list of available scanners

        Returns:
            List of scanner names
        """
        try:
            return self.scanner.get_available_scanners()
        except Exception as e:
            return []

    def scan_document(self, config: ScanConfig, output_path: str) -> Dict[str, Any]:
        """
        Scan document with configuration

        Args:
            config: Scan configuration
            output_path: Output file path

        Returns:
            Scan result dictionary
        """
        try:
            result = self.scanner.scan(
                output_path=output_path,
                resolution=config.resolution,
                color_mode=config.color_mode,
                paper_size=config.paper_size,
                orientation=config.orientation,
            )

            return {"success": True, "filepath": output_path, "result": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def preview_scan(self, scanner_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Get scan preview

        Args:
            scanner_name: Scanner name (optional)

        Returns:
            Preview result dictionary
        """
        try:
            preview = self.scanner.preview(scanner_name)
            return {"success": True, "preview": preview}
        except Exception as e:
            return {"success": False, "error": str(e)}
