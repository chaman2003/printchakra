"""
PrintChakra Backend - Thumbnail Service

Service for generating thumbnails for images and PDFs.
"""

import os
import io
from PIL import Image
from flask import current_app
from app.core.config import get_data_dirs


class ThumbnailService:
    """Service for generating document thumbnails."""
    
    def __init__(self, max_size: tuple = (300, 300)):
        """
        Initialize thumbnail service.
        
        Args:
            max_size: Maximum thumbnail dimensions (width, height)
        """
        self.max_size = max_size
        self.dirs = get_data_dirs()
    
    def generate_thumbnail(self, file_path: str) -> bytes:
        """
        Generate thumbnail for a file.
        
        Args:
            file_path: Path to the source file
            
        Returns:
            JPEG thumbnail data as bytes, or None if failed
        """
        try:
            extension = os.path.splitext(file_path)[1].lower()
            
            if extension == '.pdf':
                return self._generate_pdf_thumbnail(file_path)
            elif extension in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp']:
                return self._generate_image_thumbnail(file_path)
            else:
                current_app.logger.warning(f"Unsupported file type: {extension}")
                return None
        
        except Exception as e:
            current_app.logger.error(f"Thumbnail generation failed: {e}")
            return None
    
    def _generate_image_thumbnail(self, file_path: str) -> bytes:
        """Generate thumbnail for an image file."""
        try:
            with Image.open(file_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'P', 'LA'):
                    # Create white background for transparent images
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                    img = background
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Create thumbnail
                img.thumbnail(self.max_size, Image.Resampling.LANCZOS)
                
                # Save to bytes
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85, optimize=True)
                buffer.seek(0)
                
                return buffer.read()
        
        except Exception as e:
            current_app.logger.error(f"Image thumbnail failed: {e}")
            return None
    
    def _generate_pdf_thumbnail(self, file_path: str, page: int = 0) -> bytes:
        """Generate thumbnail for first page of a PDF."""
        try:
            return self._render_pdf_page(file_path, page)
        except Exception as e:
            current_app.logger.error(f"PDF thumbnail failed: {e}")
            return None
    
    def generate_pdf_page_thumbnail(self, file_path: str, page: int) -> bytes:
        """
        Generate thumbnail for a specific PDF page.
        
        Args:
            file_path: Path to the PDF file
            page: Page number (0-indexed)
            
        Returns:
            JPEG thumbnail data as bytes, or None if failed
        """
        return self._render_pdf_page(file_path, page)
    
    def _render_pdf_page(self, file_path: str, page: int = 0) -> bytes:
        """
        Render a PDF page to an image.
        
        Uses pdf2image with poppler for rendering.
        """
        try:
            from pdf2image import convert_from_path
            
            # Get poppler path
            poppler_path = self._get_poppler_path()
            
            # Convert specific page
            images = convert_from_path(
                file_path,
                first_page=page + 1,  # pdf2image uses 1-indexed pages
                last_page=page + 1,
                dpi=150,
                poppler_path=poppler_path
            )
            
            if not images:
                return None
            
            # Create thumbnail
            img = images[0]
            img.thumbnail(self.max_size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if necessary
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Save to bytes
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85, optimize=True)
            buffer.seek(0)
            
            return buffer.read()
        
        except ImportError:
            current_app.logger.error("pdf2image not installed")
            return None
        except Exception as e:
            current_app.logger.error(f"PDF page render failed: {e}")
            return None
    
    def _get_poppler_path(self) -> str:
        """Get poppler binary path for PDF rendering."""
        # Try environment variable first
        poppler_path = os.environ.get('POPPLER_PATH')
        if poppler_path and os.path.exists(poppler_path):
            return poppler_path
        
        # Try common locations
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'public', 'poppler', 'poppler-24.08.0', 'Library', 'bin'),
            r'C:\Program Files\poppler\bin',
            r'C:\Program Files (x86)\poppler\bin',
            '/usr/bin',
            '/usr/local/bin',
        ]
        
        for path in possible_paths:
            abs_path = os.path.abspath(path)
            if os.path.exists(abs_path):
                return abs_path
        
        return None
    
    def get_pdf_page_count(self, file_path: str) -> int:
        """Get the number of pages in a PDF."""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(file_path)
            return len(reader.pages)
        except Exception as e:
            current_app.logger.error(f"Could not get page count: {e}")
            return 0
