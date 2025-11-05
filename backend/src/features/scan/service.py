"""Scan feature service layer."""

from typing import Any, Dict, Optional

from models.scan_config import ScanConfig


class ScanService:
    """Service responsible for delegating scanner operations."""

    def __init__(self, scanner_module=None):
        self.scanner = scanner_module

    def get_available_scanners(self) -> list:
        try:
            if not self.scanner:
                return []
            return self.scanner.get_available_scanners()
        except Exception:  # noqa: BLE001
            return []

    def scan_document(self, config: ScanConfig, output_path: str) -> Dict[str, Any]:
        try:
            if not self.scanner:
                return {"success": False, "error": "Scanner module not configured"}

            result = self.scanner.scan(
                output_path=output_path,
                resolution=config.resolution,
                color_mode=config.color_mode,
                paper_size=config.paper_size,
                orientation=config.orientation,
            )
            return {"success": True, "filepath": output_path, "result": result}
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "error": str(exc)}

    def preview_scan(self, scanner_name: Optional[str] = None) -> Dict[str, Any]:
        try:
            if not self.scanner:
                return {"success": False, "error": "Scanner module not configured"}

            preview = self.scanner.preview(scanner_name)
            return {"success": True, "preview": preview}
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "error": str(exc)}
