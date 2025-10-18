"""
Section 4: Storage System Module
Automatic file naming, compression, and cloud storage
"""

import os
import re
import cv2
import boto3
from datetime import datetime
from typing import Optional, Dict, Tuple
from PIL import Image
import hashlib


class StorageModule:
    """
    Handles file storage, naming, and compression
    """
    
    def __init__(self, base_dir: str, aws_config: Optional[Dict] = None):
        """
        Initialize storage module
        
        Args:
            base_dir: Base directory for local storage
            aws_config: Optional AWS S3 configuration
        """
        self.base_dir = base_dir
        self.aws_config = aws_config
        self.s3_client = None
        
        # Create directories
        os.makedirs(base_dir, exist_ok=True)
        
        # Initialize S3 if config provided
        if aws_config:
            self._init_s3()
    
    def _init_s3(self):
        """Initialize AWS S3 client"""
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_config.get('access_key'),
                aws_secret_access_key=self.aws_config.get('secret_key'),
                region_name=self.aws_config.get('region', 'us-east-1')
            )
        except Exception as e:
            print(f"S3 initialization error: {str(e)}")
            self.s3_client = None
    
    def generate_filename(self, text_content: str = "", 
                         prefix: str = "doc", 
                         extension: str = "jpg") -> str:
        """
        Generate automatic filename based on content analysis
        
        Args:
            text_content: Extracted text from document
            prefix: Filename prefix
            extension: File extension
            
        Returns:
            Generated filename
        """
        # Extract meaningful label from text using regex
        label = self._extract_label(text_content)
        
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create unique hash
        content_hash = hashlib.md5(text_content.encode()).hexdigest()[:8]
        
        # Construct filename
        if label:
            filename = f"{label}_{timestamp}_{content_hash}.{extension}"
        else:
            filename = f"{prefix}_{timestamp}_{content_hash}.{extension}"
        
        # Sanitize filename
        filename = self._sanitize_filename(filename)
        
        return filename
    
    def _extract_label(self, text: str) -> str:
        """
        Extract meaningful label from text using regex
        
        Args:
            text: Document text
            
        Returns:
            Extracted label or empty string
        """
        if not text:
            return ""
        
        # Common document patterns
        patterns = {
            'invoice': r'invoice[\s#:-]*(\d+)',
            'receipt': r'receipt[\s#:-]*(\d+)',
            'bill': r'bill[\s#:-]*(\d+)',
            'id': r'id[\s#:-]*(\d+)',
            'license': r'license[\s#:-]*(\d+)',
            'passport': r'passport[\s#:-]*(\w+)',
            'form': r'form[\s#:-]*(\w+)'
        }
        
        text_lower = text.lower()
        
        for doc_type, pattern in patterns.items():
            match = re.search(pattern, text_lower)
            if match:
                identifier = match.group(1)
                return f"{doc_type}_{identifier}"
        
        # Try to find any alphanumeric identifier
        match = re.search(r'[A-Z]{2,}\d{4,}', text)
        if match:
            return match.group(0).lower()
        
        return ""
    
    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to remove invalid characters
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        # Remove invalid characters
        filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
        
        # Remove multiple underscores
        filename = re.sub(r'_{2,}', '_', filename)
        
        # Limit length
        name, ext = os.path.splitext(filename)
        if len(name) > 100:
            name = name[:100]
        
        return f"{name}{ext}"
    
    def compress_image(self, image_path: str, quality: int = 85) -> Tuple[str, Dict]:
        """
        Compress image using JPEG compression
        
        Args:
            image_path: Path to source image
            quality: JPEG quality (1-100)
            
        Returns:
            Tuple of (compressed_path, compression_stats)
        """
        # Get original file size
        original_size = os.path.getsize(image_path)
        
        # Open and compress image
        img = Image.open(image_path)
        
        # Convert RGBA to RGB if necessary
        if img.mode == 'RGBA':
            img = img.convert('RGB')
        
        # Generate compressed filename
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        compressed_path = os.path.join(
            os.path.dirname(image_path),
            f"{base_name}_compressed.jpg"
        )
        
        # Save with compression
        img.save(compressed_path, 'JPEG', quality=quality, optimize=True)
        
        # Get compressed file size
        compressed_size = os.path.getsize(compressed_path)
        
        # Calculate compression ratio
        compression_ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
        
        stats = {
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': compression_ratio,
            'quality': quality
        }
        
        return compressed_path, stats
    
    def save_local(self, image_path: str, destination_dir: Optional[str] = None) -> str:
        """
        Save file locally with proper naming
        
        Args:
            image_path: Source image path
            destination_dir: Destination directory (optional)
            
        Returns:
            Saved file path
        """
        if destination_dir is None:
            destination_dir = self.base_dir
        
        # Ensure destination exists
        os.makedirs(destination_dir, exist_ok=True)
        
        # Copy file
        import shutil
        dest_path = os.path.join(destination_dir, os.path.basename(image_path))
        shutil.copy2(image_path, dest_path)
        
        return dest_path
    
    def upload_to_s3(self, file_path: str, bucket_name: str, 
                     s3_key: Optional[str] = None) -> Dict:
        """
        Upload file to AWS S3
        
        Args:
            file_path: Local file path
            bucket_name: S3 bucket name
            s3_key: S3 object key (optional, uses filename if not provided)
            
        Returns:
            Upload result dict
        """
        if not self.s3_client:
            return {
                'success': False,
                'error': 'S3 client not initialized'
            }
        
        if s3_key is None:
            s3_key = os.path.basename(file_path)
        
        try:
            self.s3_client.upload_file(file_path, bucket_name, s3_key)
            
            # Generate URL
            url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
            
            return {
                'success': True,
                'url': url,
                'bucket': bucket_name,
                'key': s3_key
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def upload_to_firebase(self, file_path: str, storage_path: str) -> Dict:
        """
        Upload file to Firebase Storage (placeholder)
        
        Args:
            file_path: Local file path
            storage_path: Firebase storage path
            
        Returns:
            Upload result dict
        """
        # Placeholder for Firebase integration
        # TODO: Implement firebase_admin SDK integration
        
        return {
            'success': False,
            'error': 'Firebase integration not implemented yet'
        }
    
    def create_thumbnail(self, image_path: str, size: Tuple[int, int] = (200, 200)) -> str:
        """
        Create thumbnail of image
        
        Args:
            image_path: Source image path
            size: Thumbnail size (width, height)
            
        Returns:
            Thumbnail path
        """
        img = Image.open(image_path)
        img.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Generate thumbnail filename
        base_name = os.path.splitext(os.path.basename(image_path))[0]
        thumb_path = os.path.join(
            os.path.dirname(image_path),
            f"{base_name}_thumb.jpg"
        )
        
        img.save(thumb_path, 'JPEG', quality=85)
        
        return thumb_path
    
    def get_file_metadata(self, file_path: str) -> Dict:
        """
        Get comprehensive file metadata
        
        Args:
            file_path: File path
            
        Returns:
            Metadata dict
        """
        if not os.path.exists(file_path):
            return {'error': 'File not found'}
        
        stats = os.stat(file_path)
        
        # Try to get image dimensions
        try:
            img = Image.open(file_path)
            width, height = img.size
            format_info = img.format
        except:
            width, height, format_info = None, None, None
        
        metadata = {
            'filename': os.path.basename(file_path),
            'size_bytes': stats.st_size,
            'size_kb': round(stats.st_size / 1024, 2),
            'size_mb': round(stats.st_size / (1024 * 1024), 2),
            'created': datetime.fromtimestamp(stats.st_ctime).isoformat(),
            'modified': datetime.fromtimestamp(stats.st_mtime).isoformat(),
            'width': width,
            'height': height,
            'format': format_info,
            'extension': os.path.splitext(file_path)[1]
        }
        
        return metadata
