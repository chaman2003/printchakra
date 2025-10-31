"""
Scan configuration model
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ScanConfig:
    """Scanner configuration"""
    resolution: int = 300
    color_mode: str = 'color'  # 'color', 'grayscale', 'bw'
    paper_size: str = 'A4'
    orientation: str = 'portrait'  # 'portrait', 'landscape'
    auto_detect: bool = True
    enhance: bool = True
    ocr: bool = True
    
    @classmethod
    def from_dict(cls, data: dict):
        """Create from dictionary"""
        return cls(
            resolution=data.get('resolution', 300),
            color_mode=data.get('colorMode', 'color'),
            paper_size=data.get('paperSize', 'A4'),
            orientation=data.get('orientation', 'portrait'),
            auto_detect=data.get('autoDetect', True),
            enhance=data.get('enhance', True),
            ocr=data.get('ocr', True),
        )
