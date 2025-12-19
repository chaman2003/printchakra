"""
PrintChakra Backend - Conversion Service

Service for converting documents between formats.
"""

import os
import io
import uuid
from datetime import datetime
from PIL import Image
from flask import current_app
from app.core.config import get_data_dirs


class ConversionService:
    """Service for file format conversions."""
    
    def __init__(self):
        """Initialize conversion service."""
        self.dirs = get_data_dirs()
    
    def convert_files(
        self,
        filenames: list,
        target_format: str = "pdf",
        merge: bool = True,
        output_name: str = "converted"
    ) -> dict:
        """
        Convert files to target format.
        
        Args:
            filenames: List of filenames to convert
            target_format: Target format (pdf, jpg, png)
            merge: Whether to merge multiple files into one
            output_name: Name for output file(s)
            
        Returns:
            Dictionary with conversion results
        """
        try:
            PROCESSED_DIR = self.dirs['PROCESSED_DIR']
            CONVERTED_DIR = self.dirs['CONVERTED_DIR']
            
            # Ensure converted directory exists
            os.makedirs(CONVERTED_DIR, exist_ok=True)
            
            # Collect file paths
            file_paths = []
            for filename in filenames:
                file_path = os.path.join(PROCESSED_DIR, filename)
                if os.path.exists(file_path):
                    file_paths.append(file_path)
            
            if not file_paths:
                return {"success": False, "error": "No valid files found"}
            
            if target_format.lower() == "pdf":
                return self._convert_to_pdf(file_paths, merge, output_name)
            elif target_format.lower() in ["jpg", "jpeg"]:
                return self._convert_to_jpeg(file_paths, output_name)
            elif target_format.lower() == "png":
                return self._convert_to_png(file_paths, output_name)
            else:
                return {"success": False, "error": f"Unsupported format: {target_format}"}
        
        except Exception as e:
            current_app.logger.error(f"Conversion error: {e}")
            return {"success": False, "error": str(e)}
    
    def _convert_to_pdf(
        self,
        file_paths: list,
        merge: bool,
        output_name: str
    ) -> dict:
        """Convert images to PDF."""
        try:
            CONVERTED_DIR = self.dirs['CONVERTED_DIR']
            
            images = []
            for file_path in file_paths:
                try:
                    img = Image.open(file_path)
                    # Convert to RGB for PDF compatibility
                    if img.mode in ('RGBA', 'P', 'LA'):
                        background = Image.new('RGB', img.size, (255, 255, 255))
                        if img.mode == 'P':
                            img = img.convert('RGBA')
                        if img.mode == 'RGBA':
                            background.paste(img, mask=img.split()[-1])
                        else:
                            background.paste(img)
                        img = background
                    elif img.mode != 'RGB':
                        img = img.convert('RGB')
                    images.append(img)
                except Exception as e:
                    current_app.logger.warning(f"Could not open {file_path}: {e}")
            
            if not images:
                return {"success": False, "error": "No valid images to convert"}
            
            output_files = []
            
            if merge:
                # Merge all images into one PDF
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                safe_name = "".join(c for c in output_name if c.isalnum() or c in "._-")
                pdf_filename = f"{safe_name}_{timestamp}.pdf"
                pdf_path = os.path.join(CONVERTED_DIR, pdf_filename)
                
                # Save first image and append others
                first_image = images[0]
                other_images = images[1:] if len(images) > 1 else []
                
                first_image.save(
                    pdf_path,
                    "PDF",
                    save_all=True,
                    append_images=other_images,
                    resolution=150.0
                )
                
                output_files.append(pdf_filename)
                
                # Close images
                for img in images:
                    img.close()
            else:
                # Convert each image to separate PDF
                for i, img in enumerate(images):
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    pdf_filename = f"{output_name}_{i+1}_{timestamp}.pdf"
                    pdf_path = os.path.join(CONVERTED_DIR, pdf_filename)
                    
                    img.save(pdf_path, "PDF", resolution=150.0)
                    output_files.append(pdf_filename)
                    img.close()
            
            return {
                "success": True,
                "format": "pdf",
                "files": output_files,
                "count": len(output_files),
                "merged": merge
            }
        
        except Exception as e:
            current_app.logger.error(f"PDF conversion error: {e}")
            return {"success": False, "error": str(e)}
    
    def _convert_to_jpeg(self, file_paths: list, output_name: str) -> dict:
        """Convert files to JPEG format."""
        try:
            CONVERTED_DIR = self.dirs['CONVERTED_DIR']
            output_files = []
            
            for i, file_path in enumerate(file_paths):
                try:
                    with Image.open(file_path) as img:
                        # Convert to RGB
                        if img.mode in ('RGBA', 'P', 'LA'):
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            if img.mode == 'RGBA':
                                background.paste(img, mask=img.split()[-1])
                            else:
                                background.paste(img)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        jpg_filename = f"{output_name}_{i+1}_{timestamp}.jpg"
                        jpg_path = os.path.join(CONVERTED_DIR, jpg_filename)
                        
                        img.save(jpg_path, "JPEG", quality=95, optimize=True)
                        output_files.append(jpg_filename)
                
                except Exception as e:
                    current_app.logger.warning(f"Could not convert {file_path}: {e}")
            
            return {
                "success": True,
                "format": "jpeg",
                "files": output_files,
                "count": len(output_files)
            }
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _convert_to_png(self, file_paths: list, output_name: str) -> dict:
        """Convert files to PNG format."""
        try:
            CONVERTED_DIR = self.dirs['CONVERTED_DIR']
            output_files = []
            
            for i, file_path in enumerate(file_paths):
                try:
                    with Image.open(file_path) as img:
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        png_filename = f"{output_name}_{i+1}_{timestamp}.png"
                        png_path = os.path.join(CONVERTED_DIR, png_filename)
                        
                        img.save(png_path, "PNG", optimize=True)
                        output_files.append(png_filename)
                
                except Exception as e:
                    current_app.logger.warning(f"Could not convert {file_path}: {e}")
            
            return {
                "success": True,
                "format": "png",
                "files": output_files,
                "count": len(output_files)
            }
        
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def convert_pdf_to_images(
        self,
        pdf_path: str,
        output_format: str = "png",
        dpi: int = 200
    ) -> dict:
        """
        Convert PDF pages to images.
        
        Args:
            pdf_path: Path to PDF file
            output_format: Output image format (png, jpg)
            dpi: Resolution for conversion
            
        Returns:
            Dictionary with conversion results
        """
        try:
            from pdf2image import convert_from_path
            
            CONVERTED_DIR = self.dirs['CONVERTED_DIR']
            poppler_path = self._get_poppler_path()
            
            # Convert PDF to images
            images = convert_from_path(
                pdf_path,
                dpi=dpi,
                poppler_path=poppler_path
            )
            
            output_files = []
            base_name = os.path.splitext(os.path.basename(pdf_path))[0]
            
            for i, img in enumerate(images):
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                ext = "jpg" if output_format.lower() in ["jpg", "jpeg"] else "png"
                filename = f"{base_name}_page{i+1}_{timestamp}.{ext}"
                output_path = os.path.join(CONVERTED_DIR, filename)
                
                if ext == "jpg":
                    if img.mode != 'RGB':
                        img = img.convert('RGB')
                    img.save(output_path, "JPEG", quality=95)
                else:
                    img.save(output_path, "PNG")
                
                output_files.append(filename)
            
            return {
                "success": True,
                "format": output_format,
                "files": output_files,
                "count": len(output_files),
                "source_pdf": os.path.basename(pdf_path)
            }
        
        except ImportError:
            return {"success": False, "error": "pdf2image not installed"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _get_poppler_path(self) -> str:
        """Get poppler binary path."""
        poppler_path = os.environ.get('POPPLER_PATH')
        if poppler_path and os.path.exists(poppler_path):
            return poppler_path
        
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'public', 'poppler', 'poppler-24.08.0', 'Library', 'bin'),
            r'C:\Program Files\poppler\bin',
            '/usr/bin',
            '/usr/local/bin',
        ]
        
        for path in possible_paths:
            abs_path = os.path.abspath(path)
            if os.path.exists(abs_path):
                return abs_path
        
        return None
