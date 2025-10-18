"""
Section 5: Export & Output Module
PDF export, A4 resizing, and native printing
"""

import cv2
import numpy as np
import os
import platform
import subprocess
from typing import Tuple, Optional, List
from PIL import Image
try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from reportlab.lib.pagesizes import A4, letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False


class ExportModule:
    """
    Handles document export and printing
    """
    
    # Standard page sizes (width, height) in pixels at 300 DPI
    PAGE_SIZES = {
        'A4': (2480, 3508),      # 210mm x 297mm
        'Letter': (2550, 3300),   # 8.5" x 11"
        'Legal': (2550, 4200),    # 8.5" x 14"
        'A3': (3508, 4961),       # 297mm x 420mm
    }
    
    def __init__(self):
        """Initialize export module"""
        self.default_dpi = 300
    
    def resize_to_page(self, image: np.ndarray, 
                      page_size: str = 'A4',
                      maintain_aspect: bool = True,
                      padding: int = 50) -> np.ndarray:
        """
        Resize image to fit standard page size
        
        Args:
            image: Input image
            page_size: Target page size ('A4', 'Letter', etc.)
            maintain_aspect: Whether to maintain aspect ratio
            padding: Padding in pixels
            
        Returns:
            Resized image
        """
        # Get target dimensions
        target_width, target_height = self.PAGE_SIZES.get(page_size, self.PAGE_SIZES['A4'])
        
        # Apply padding
        target_width -= 2 * padding
        target_height -= 2 * padding
        
        # Get current dimensions
        height, width = image.shape[:2]
        
        if maintain_aspect:
            # Calculate scaling factor
            scale = min(target_width / width, target_height / height)
            new_width = int(width * scale)
            new_height = int(height * scale)
        else:
            new_width = target_width
            new_height = target_height
        
        # Resize image
        resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
        
        # Create page canvas
        if len(image.shape) == 3:
            canvas = np.ones((target_height + 2 * padding, target_width + 2 * padding, 3), 
                            dtype=np.uint8) * 255
        else:
            canvas = np.ones((target_height + 2 * padding, target_width + 2 * padding), 
                            dtype=np.uint8) * 255
        
        # Center image on canvas
        y_offset = (canvas.shape[0] - new_height) // 2
        x_offset = (canvas.shape[1] - new_width) // 2
        
        if len(image.shape) == 3:
            canvas[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized
        else:
            canvas[y_offset:y_offset+new_height, x_offset:x_offset+new_width] = resized
        
        return canvas
    
    def export_to_pdf_pymupdf(self, images: List[str], output_path: str) -> bool:
        """
        Export images to PDF using PyMuPDF
        
        Args:
            images: List of image file paths
            output_path: Output PDF path
            
        Returns:
            Success boolean
        """
        if not HAS_PYMUPDF:
            print("PyMuPDF not installed. Use: pip install PyMuPDF")
            return False
        
        try:
            # Create PDF document
            pdf = fitz.open()
            
            for img_path in images:
                # Open image
                img_doc = fitz.open(img_path)
                
                # Convert image to PDF page
                pdf_bytes = img_doc.convert_to_pdf()
                img_pdf = fitz.open("pdf", pdf_bytes)
                
                # Insert page
                pdf.insert_pdf(img_pdf)
            
            # Save PDF
            pdf.save(output_path)
            pdf.close()
            
            return True
        except Exception as e:
            print(f"PDF export error: {str(e)}")
            return False
    
    def export_to_pdf_reportlab(self, images: List[str], output_path: str,
                               page_size: str = 'A4') -> bool:
        """
        Export images to PDF using ReportLab
        
        Args:
            images: List of image file paths
            output_path: Output PDF path
            page_size: Page size ('A4' or 'Letter')
            
        Returns:
            Success boolean
        """
        if not HAS_REPORTLAB:
            print("ReportLab not installed. Use: pip install reportlab")
            return False
        
        try:
            # Get page dimensions
            if page_size == 'A4':
                page_width, page_height = A4
            else:
                page_width, page_height = letter
            
            # Create PDF
            c = canvas.Canvas(output_path, pagesize=(page_width, page_height))
            
            for img_path in images:
                # Open image to get dimensions
                img = Image.open(img_path)
                img_width, img_height = img.size
                
                # Calculate scaling to fit page (with margins)
                margin = 0.5 * inch
                max_width = page_width - 2 * margin
                max_height = page_height - 2 * margin
                
                scale = min(max_width / img_width, max_height / img_height)
                scaled_width = img_width * scale
                scaled_height = img_height * scale
                
                # Center image on page
                x = (page_width - scaled_width) / 2
                y = (page_height - scaled_height) / 2
                
                # Draw image
                c.drawImage(img_path, x, y, width=scaled_width, height=scaled_height)
                
                # Add new page for next image
                c.showPage()
            
            # Save PDF
            c.save()
            
            return True
        except Exception as e:
            print(f"PDF export error: {str(e)}")
            return False
    
    def export_to_pdf(self, images: List[str], output_path: str, 
                     method: str = 'auto', page_size: str = 'A4') -> bool:
        """
        Export images to PDF using available library
        
        Args:
            images: List of image file paths
            output_path: Output PDF path
            method: 'pymupdf', 'reportlab', or 'auto'
            page_size: Target page size
            
        Returns:
            Success boolean
        """
        if method == 'pymupdf' or (method == 'auto' and HAS_PYMUPDF):
            return self.export_to_pdf_pymupdf(images, output_path)
        
        elif method == 'reportlab' or (method == 'auto' and HAS_REPORTLAB):
            return self.export_to_pdf_reportlab(images, output_path, page_size)
        
        else:
            print("No PDF library available. Install PyMuPDF or ReportLab.")
            return False
    
    def print_file_windows(self, file_path: str, printer_name: Optional[str] = None) -> bool:
        """
        Print file on Windows using win32 API
        
        Args:
            file_path: File to print
            printer_name: Specific printer name (optional)
            
        Returns:
            Success boolean
        """
        if platform.system() != 'Windows':
            return False
        
        try:
            import win32print
            import win32api
            
            if printer_name is None:
                printer_name = win32print.GetDefaultPrinter()
            
            # Print file
            win32api.ShellExecute(
                0,
                "print",
                file_path,
                f'/d:"{printer_name}"',
                ".",
                0
            )
            
            return True
        except Exception as e:
            print(f"Windows print error: {str(e)}")
            return False
    
    def print_file_unix(self, file_path: str, printer_name: Optional[str] = None) -> bool:
        """
        Print file on Unix/Linux using lp command
        
        Args:
            file_path: File to print
            printer_name: Specific printer name (optional)
            
        Returns:
            Success boolean
        """
        if platform.system() not in ['Linux', 'Darwin']:
            return False
        
        try:
            cmd = ['lp']
            
            if printer_name:
                cmd.extend(['-d', printer_name])
            
            cmd.append(file_path)
            
            subprocess.run(cmd, check=True)
            
            return True
        except Exception as e:
            print(f"Unix print error: {str(e)}")
            return False
    
    def print_file(self, file_path: str, printer_name: Optional[str] = None) -> bool:
        """
        Print file using native OS print service
        
        Args:
            file_path: File to print
            printer_name: Specific printer name (optional)
            
        Returns:
            Success boolean
        """
        system = platform.system()
        
        if system == 'Windows':
            return self.print_file_windows(file_path, printer_name)
        
        elif system in ['Linux', 'Darwin']:
            return self.print_file_unix(file_path, printer_name)
        
        else:
            print(f"Printing not supported on {system}")
            return False
    
    def get_available_printers(self) -> List[str]:
        """
        Get list of available printers
        
        Returns:
            List of printer names
        """
        system = platform.system()
        printers = []
        
        try:
            if system == 'Windows':
                import win32print
                printers = [printer[2] for printer in win32print.EnumPrinters(2)]
            
            elif system in ['Linux', 'Darwin']:
                result = subprocess.run(['lpstat', '-p'], 
                                      capture_output=True, 
                                      text=True)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    printers = [line.split()[1] for line in lines if line.startswith('printer')]
        except Exception as e:
            print(f"Error getting printers: {str(e)}")
        
        return printers
    
    def create_print_ready_image(self, image_path: str, 
                                output_path: str,
                                page_size: str = 'A4',
                                dpi: int = 300) -> bool:
        """
        Create print-ready image with proper sizing and DPI
        
        Args:
            image_path: Source image path
            output_path: Output image path
            page_size: Target page size
            dpi: Target DPI
            
        Returns:
            Success boolean
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                return False
            
            # Resize to page size
            resized = self.resize_to_page(img, page_size, maintain_aspect=True)
            
            # Convert to PIL for DPI setting
            if len(resized.shape) == 3:
                pil_img = Image.fromarray(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB))
            else:
                pil_img = Image.fromarray(resized)
            
            # Save with DPI information
            pil_img.save(output_path, dpi=(dpi, dpi), quality=95)
            
            return True
        except Exception as e:
            print(f"Error creating print-ready image: {str(e)}")
            return False
