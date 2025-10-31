"""
File info model
Represents file metadata
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class FileInfo:
    """File information"""
    filename: str
    size: int
    created: str
    has_text: bool
    processing: bool = False
    processing_step: Optional[int] = None
    
    def to_dict(self):
        """Convert to dictionary"""
        result = {
            'filename': self.filename,
            'size': self.size,
            'created': self.created,
            'has_text': self.has_text,
            'processing': self.processing,
        }
        if self.processing_step is not None:
            result['processing_step'] = self.processing_step
        return result
