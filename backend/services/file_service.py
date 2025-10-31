"""
File service
Handles file operations and management
"""

import os
from datetime import datetime
from typing import List, Optional
from utils.file_utils import ensure_directory, get_file_info, sanitize_filename
from models.file_info import FileInfo


class FileService:
    """Service for managing files"""
    
    def __init__(self, upload_dir: str, processed_dir: str):
        """
        Initialize file service
        
        Args:
            upload_dir: Upload directory path
            processed_dir: Processed files directory path
        """
        self.upload_dir = upload_dir
        self.processed_dir = processed_dir
        ensure_directory(upload_dir)
        ensure_directory(processed_dir)
    
    def list_files(self) -> List[FileInfo]:
        """
        List all uploaded files
        
        Returns:
            List of FileInfo objects
        """
        files = []
        
        if not os.path.exists(self.upload_dir):
            return files
        
        for filename in os.listdir(self.upload_dir):
            filepath = os.path.join(self.upload_dir, filename)
            
            if os.path.isfile(filepath):
                info = get_file_info(filepath)
                if info:
                    # Check if has processed text
                    text_file = os.path.join(
                        self.processed_dir,
                        f"{os.path.splitext(filename)[0]}.txt"
                    )
                    has_text = os.path.exists(text_file)
                    
                    files.append(FileInfo(
                        filename=filename,
                        size=info['size'],
                        created=info['created'],
                        has_text=has_text,
                    ))
        
        # Sort by creation time (newest first)
        files.sort(key=lambda x: x.created, reverse=True)
        return files
    
    def save_file(self, file_data, filename: str) -> str:
        """
        Save uploaded file
        
        Args:
            file_data: File data
            filename: Original filename
            
        Returns:
            Saved filename
        """
        # Sanitize filename
        safe_filename = sanitize_filename(filename)
        filepath = os.path.join(self.upload_dir, safe_filename)
        
        # Handle duplicate names
        if os.path.exists(filepath):
            name, ext = os.path.splitext(safe_filename)
            counter = 1
            while os.path.exists(filepath):
                safe_filename = f"{name}_{counter}{ext}"
                filepath = os.path.join(self.upload_dir, safe_filename)
                counter += 1
        
        # Save file
        file_data.save(filepath)
        return safe_filename
    
    def delete_file(self, filename: str) -> bool:
        """
        Delete file and associated processed files
        
        Args:
            filename: Filename to delete
            
        Returns:
            True if successful
        """
        # Delete main file
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
        
        # Delete processed text file
        text_file = os.path.join(
            self.processed_dir,
            f"{os.path.splitext(filename)[0]}.txt"
        )
        if os.path.exists(text_file):
            os.remove(text_file)
        
        return True
    
    def get_file_path(self, filename: str) -> Optional[str]:
        """
        Get full file path
        
        Args:
            filename: Filename
            
        Returns:
            Full file path or None
        """
        filepath = os.path.join(self.upload_dir, filename)
        return filepath if os.path.exists(filepath) else None
    
    def file_exists(self, filename: str) -> bool:
        """
        Check if file exists
        
        Args:
            filename: Filename
            
        Returns:
            True if exists
        """
        return os.path.exists(os.path.join(self.upload_dir, filename))
