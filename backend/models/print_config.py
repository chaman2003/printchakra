"""
Print configuration model
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class PrintConfig:
    """Print configuration"""

    printer_name: Optional[str] = None
    copies: int = 1
    paper_size: str = "A4"
    orientation: str = "portrait"  # 'portrait', 'landscape'
    color_mode: str = "color"  # 'color', 'grayscale', 'bw'
    quality: str = "normal"  # 'draft', 'normal', 'high'
    duplex: bool = False
    collate: bool = True
    pages: Optional[List[int]] = None
    scale: int = 100

    @classmethod
    def from_dict(cls, data: dict):
        """Create from dictionary"""
        return cls(
            printer_name=data.get("printerName"),
            copies=data.get("copies", 1),
            paper_size=data.get("paperSize", "A4"),
            orientation=data.get("orientation", "portrait"),
            color_mode=data.get("colorMode", "color"),
            quality=data.get("quality", "normal"),
            duplex=data.get("duplex", False),
            collate=data.get("collate", True),
            pages=data.get("pages"),
            scale=data.get("scale", 100),
        )
