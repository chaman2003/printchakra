"""
Document model
Represents a document with its pages and metadata
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional


@dataclass
class DocumentPage:
    """Represents a single page in a document"""

    page_number: int
    thumbnail_url: Optional[str] = None
    full_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


@dataclass
class Document:
    """Represents a document with metadata"""

    filename: str
    size: int
    created: str
    has_text: bool
    thumbnail_url: Optional[str] = None
    pages: Optional[List[DocumentPage]] = None
    processing: bool = False
    processing_step: Optional[int] = None

    def to_dict(self):
        """Convert document to dictionary"""
        result = {
            "filename": self.filename,
            "size": self.size,
            "created": self.created,
            "has_text": self.has_text,
            "processing": self.processing,
        }

        if self.thumbnail_url:
            result["thumbnailUrl"] = self.thumbnail_url
        if self.pages:
            result["pages"] = [
                {
                    "pageNumber": page.page_number,
                    "thumbnailUrl": page.thumbnail_url,
                    "fullUrl": page.full_url,
                }
                for page in self.pages
            ]
        if self.processing_step is not None:
            result["processing_step"] = self.processing_step

        return result
