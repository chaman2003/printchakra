"""
File Format Converter Module
Supports conversion between various formats: JPG, PNG, PDF, DOCX
"""

import os
import io
from PIL import Image
import img2pdf
from docx import Document
from docx.shared import Inches
import fitz  # PyMuPDF
from typing import List, Tuple, Optional
import traceback


class FileConverter:
    """Handle file format conversions"""
    
    SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'pdf', 'docx']
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """Get lowercase file extension without dot"""
        return os.path.splitext(filename)[1].lower().lstrip('.')
    
    @staticmethod
    def is_supported_format(format: str) -> bool:
        """Check if format is supported"""
        return format.lower() in FileConverter.SUPPORTED_FORMATS
    
    @staticmethod
    def convert_image_to_pdf(input_path: str, output_path: str) -> Tuple[bool, str]:
        """
        Convert image (JPG/PNG) to PDF
        Uses img2pdf for better quality and smaller file size
        """
        try:
            # Open and validate image
            with Image.open(input_path) as img:
                # Convert RGBA to RGB if needed
                if img.mode == 'RGBA':
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    rgb_img.paste(img, mask=img.split()[3])
                    temp_path = input_path + '_temp.jpg'
                    rgb_img.save(temp_path, 'JPEG', quality=95)
                    input_to_convert = temp_path
                else:
                    input_to_convert = input_path
            
            # Convert to PDF
            with open(output_path, 'wb') as f:
                f.write(img2pdf.convert(input_to_convert))
            
            # Cleanup temp file
            if input_to_convert != input_path and os.path.exists(input_to_convert):
                os.remove(input_to_convert)
            
            print(f"✅ Converted image to PDF: {output_path}")
            return True, f"Successfully converted to PDF"
        
        except Exception as e:
            error_msg = f"Image to PDF conversion failed: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            return False, error_msg
    
    @staticmethod
    def convert_image_to_docx(input_path: str, output_path: str) -> Tuple[bool, str]:
        """Convert image (JPG/PNG) to DOCX"""
        try:
            # Create Word document
            doc = Document()
            
            # Get image dimensions
            with Image.open(input_path) as img:
                width, height = img.size
                aspect_ratio = height / width
            
            # Add image to document (max 6 inches wide)
            max_width = 6.0
            doc_width = min(max_width, width / 96)  # 96 DPI
            doc.add_picture(input_path, width=Inches(doc_width))
            
            # Add filename as caption
            filename = os.path.basename(input_path)
            doc.add_paragraph(f"Image: {filename}", style='Caption')
            
            # Save document
            doc.save(output_path)
            
            print(f"✅ Converted image to DOCX: {output_path}")
            return True, f"Successfully converted to DOCX"
        
        except Exception as e:
            error_msg = f"Image to DOCX conversion failed: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            return False, error_msg
    
    @staticmethod
    def convert_image_format(input_path: str, output_path: str, target_format: str) -> Tuple[bool, str]:
        """Convert between image formats (JPG ↔ PNG)"""
        try:
            with Image.open(input_path) as img:
                # Convert RGBA to RGB for JPEG
                if target_format.lower() in ['jpg', 'jpeg'] and img.mode in ('RGBA', 'LA', 'P'):
                    rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    rgb_img.paste(img, mask=img.split()[3] if img.mode == 'RGBA' else None)
                    img = rgb_img
                
                # Save in target format
                if target_format.lower() in ['jpg', 'jpeg']:
                    img.save(output_path, 'JPEG', quality=95, optimize=True)
                elif target_format.lower() == 'png':
                    img.save(output_path, 'PNG', optimize=True)
                else:
                    img.save(output_path, target_format.upper())
            
            print(f"✅ Converted image format: {output_path}")
            return True, f"Successfully converted to {target_format.upper()}"
        
        except Exception as e:
            error_msg = f"Image format conversion failed: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            return False, error_msg
    
    @staticmethod
    def convert_pdf_to_images(input_path: str, output_dir: str, format: str = 'jpg') -> Tuple[bool, str, List[str]]:
        """
        Convert PDF to images (one image per page)
        Returns: (success, message, list of output files)
        """
        try:
            output_files = []
            
            # Open PDF
            pdf_document = fitz.open(input_path)
            base_name = os.path.splitext(os.path.basename(input_path))[0]
            
            # Convert each page
            for page_num in range(len(pdf_document)):
                page = pdf_document[page_num]
                
                # Render page to image (300 DPI)
                zoom = 2  # 2x zoom = ~200 DPI
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat)
                
                # Save image
                output_filename = f"{base_name}_page{page_num + 1}.{format}"
                output_path = os.path.join(output_dir, output_filename)
                
                if format.lower() == 'png':
                    pix.save(output_path)
                else:
                    # Convert to PIL Image for JPEG
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    img.save(output_path, 'JPEG', quality=95)
                
                output_files.append(output_filename)
                print(f"✅ Converted page {page_num + 1} to {format.upper()}")
            
            pdf_document.close()
            
            message = f"Successfully converted {len(output_files)} pages to {format.upper()}"
            return True, message, output_files
        
        except Exception as e:
            error_msg = f"PDF to image conversion failed: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            return False, error_msg, []
    
    @staticmethod
    def convert_file(input_path: str, output_path: str, source_format: str, target_format: str) -> Tuple[bool, str]:
        """
        Main conversion dispatcher
        Returns: (success, message)
        """
        source_format = source_format.lower()
        target_format = target_format.lower()
        
        # Check if conversion is needed
        if source_format == target_format:
            return False, "Source and target formats are the same"
        
        # Check if formats are supported
        if not FileConverter.is_supported_format(source_format):
            return False, f"Unsupported source format: {source_format}"
        if not FileConverter.is_supported_format(target_format):
            return False, f"Unsupported target format: {target_format}"
        
        # Image to PDF
        if source_format in ['jpg', 'jpeg', 'png'] and target_format == 'pdf':
            return FileConverter.convert_image_to_pdf(input_path, output_path)
        
        # Image to DOCX
        elif source_format in ['jpg', 'jpeg', 'png'] and target_format == 'docx':
            return FileConverter.convert_image_to_docx(input_path, output_path)
        
        # Image format conversion (JPG ↔ PNG)
        elif source_format in ['jpg', 'jpeg', 'png'] and target_format in ['jpg', 'jpeg', 'png']:
            return FileConverter.convert_image_format(input_path, output_path, target_format)
        
        # PDF to image
        elif source_format == 'pdf' and target_format in ['jpg', 'jpeg', 'png']:
            output_dir = os.path.dirname(output_path)
            success, message, files = FileConverter.convert_pdf_to_images(input_path, output_dir, target_format)
            if success and files:
                # For single page PDFs, rename the first file to match output_path
                if len(files) == 1:
                    first_file = os.path.join(output_dir, files[0])
                    if first_file != output_path:
                        os.rename(first_file, output_path)
            return success, message
        
        # Unsupported conversion
        else:
            return False, f"Conversion from {source_format} to {target_format} is not supported"
    
    @staticmethod
    def batch_convert(input_files: List[str], output_dir: str, target_format: str) -> Tuple[int, int, List[dict]]:
        """
        Batch convert multiple files
        Returns: (success_count, fail_count, results)
        """
        results = []
        success_count = 0
        fail_count = 0
        
        for input_file in input_files:
            try:
                # Get source format
                source_format = FileConverter.get_file_extension(input_file)
                
                # Generate output filename
                base_name = os.path.splitext(os.path.basename(input_file))[0]
                output_filename = f"{base_name}.{target_format}"
                output_path = os.path.join(output_dir, output_filename)
                
                # Convert
                success, message = FileConverter.convert_file(
                    input_file, output_path, source_format, target_format
                )
                
                if success:
                    success_count += 1
                    results.append({
                        'input': os.path.basename(input_file),
                        'output': output_filename,
                        'success': True,
                        'message': message
                    })
                else:
                    fail_count += 1
                    results.append({
                        'input': os.path.basename(input_file),
                        'output': None,
                        'success': False,
                        'message': message
                    })
            
            except Exception as e:
                fail_count += 1
                results.append({
                    'input': os.path.basename(input_file),
                    'output': None,
                    'success': False,
                    'message': str(e)
                })
        
        return success_count, fail_count, results
    
    @staticmethod
    def merge_images_to_pdf(input_files: List[str], output_path: str) -> Tuple[bool, str]:
        """
        Merge multiple images into a single PDF
        Args:
            input_files: List of image file paths
            output_path: Output PDF file path
        Returns:
            (success, message)
        """
        try:
            if not input_files:
                return False, "No input files provided"
            
            print(f"\n🔄 Merging {len(input_files)} images into single PDF...")
            
            # Prepare images for conversion
            converted_images = []
            temp_files = []
            
            for input_file in input_files:
                try:
                    # Open and process image
                    with Image.open(input_file) as img:
                        # Convert RGBA to RGB if needed
                        if img.mode == 'RGBA':
                            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                            rgb_img.paste(img, mask=img.split()[3])
                            temp_path = input_file + '_temp.jpg'
                            rgb_img.save(temp_path, 'JPEG', quality=95)
                            converted_images.append(temp_path)
                            temp_files.append(temp_path)
                        else:
                            converted_images.append(input_file)
                except Exception as e:
                    print(f"⚠️ Skipping {input_file}: {e}")
                    continue
            
            if not converted_images:
                return False, "No valid images to merge"
            
            # Convert all images to single PDF
            with open(output_path, 'wb') as f:
                f.write(img2pdf.convert(converted_images))
            
            # Cleanup temp files
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            print(f"✅ Merged {len(converted_images)} images into PDF: {output_path}")
            return True, f"Successfully merged {len(converted_images)} images into single PDF"
        
        except Exception as e:
            error_msg = f"PDF merge failed: {str(e)}"
            print(f"❌ {error_msg}")
            traceback.print_exc()
            
            # Cleanup temp files on error
            for temp_file in temp_files:
                if os.path.exists(temp_file):
                    try:
                        os.remove(temp_file)
                    except:
                        pass
            
            return False, error_msg
