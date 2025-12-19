"""
PrintChakra Backend - Storage Manager

Handles file storage operations for uploaded and processed files.
"""

import os
import shutil
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


class StorageManager:
    """
    Manages file storage for the application.
    
    Handles:
    - File saving and retrieval
    - Directory management
    - File cleanup and maintenance
    """
    
    def __init__(self, base_dir: str):
        """
        Initialize storage manager.
        
        Args:
            base_dir: Base directory for all file storage
        """
        self.base_dir = base_dir
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Ensure all required directories exist."""
        subdirs = ['uploads', 'processed', 'text', 'pdfs', 'converted', 'ocr_results']
        for subdir in subdirs:
            path = os.path.join(self.base_dir, subdir)
            os.makedirs(path, exist_ok=True)
    
    def save_file(self, file_data: bytes, filename: str, subdir: str = 'uploads') -> str:
        """
        Save file data to storage.
        
        Args:
            file_data: Binary file data
            filename: Name for the file
            subdir: Subdirectory to save in
            
        Returns:
            Full path to saved file
        """
        dir_path = os.path.join(self.base_dir, subdir)
        os.makedirs(dir_path, exist_ok=True)
        
        file_path = os.path.join(dir_path, filename)
        
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        logger.info(f"Saved file: {file_path}")
        return file_path
    
    def get_file(self, filename: str, subdir: str = 'processed') -> Optional[str]:
        """
        Get path to a file if it exists.
        
        Args:
            filename: Name of the file
            subdir: Subdirectory to look in
            
        Returns:
            Full path if file exists, None otherwise
        """
        file_path = os.path.join(self.base_dir, subdir, filename)
        
        if os.path.exists(file_path):
            return file_path
        return None
    
    def delete_file(self, filename: str, subdir: str = 'processed') -> bool:
        """
        Delete a file from storage.
        
        Args:
            filename: Name of the file
            subdir: Subdirectory containing the file
            
        Returns:
            True if deleted successfully
        """
        file_path = os.path.join(self.base_dir, subdir, filename)
        
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted file: {file_path}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False
    
    def list_files(self, subdir: str = 'processed') -> List[Dict[str, Any]]:
        """
        List all files in a subdirectory.
        
        Args:
            subdir: Subdirectory to list
            
        Returns:
            List of file information dictionaries
        """
        dir_path = os.path.join(self.base_dir, subdir)
        files = []
        
        if not os.path.exists(dir_path):
            return files
        
        for filename in os.listdir(dir_path):
            file_path = os.path.join(dir_path, filename)
            if os.path.isfile(file_path):
                stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "path": file_path,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })
        
        return files
    
    def move_file(
        self,
        filename: str,
        from_subdir: str,
        to_subdir: str,
        new_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Move a file between subdirectories.
        
        Args:
            filename: Name of the file
            from_subdir: Source subdirectory
            to_subdir: Destination subdirectory
            new_filename: Optional new name for the file
            
        Returns:
            New path if successful, None otherwise
        """
        source_path = os.path.join(self.base_dir, from_subdir, filename)
        
        if not os.path.exists(source_path):
            return None
        
        dest_dir = os.path.join(self.base_dir, to_subdir)
        os.makedirs(dest_dir, exist_ok=True)
        
        dest_filename = new_filename or filename
        dest_path = os.path.join(dest_dir, dest_filename)
        
        try:
            shutil.move(source_path, dest_path)
            logger.info(f"Moved file: {source_path} -> {dest_path}")
            return dest_path
        except Exception as e:
            logger.error(f"Failed to move file: {e}")
            return None
    
    def cleanup_old_files(self, subdir: str, max_age_days: int = 7) -> int:
        """
        Delete files older than specified age.
        
        Args:
            subdir: Subdirectory to clean
            max_age_days: Maximum age in days
            
        Returns:
            Number of files deleted
        """
        dir_path = os.path.join(self.base_dir, subdir)
        deleted_count = 0
        
        if not os.path.exists(dir_path):
            return 0
        
        cutoff_time = datetime.now().timestamp() - (max_age_days * 24 * 60 * 60)
        
        for filename in os.listdir(dir_path):
            file_path = os.path.join(dir_path, filename)
            if os.path.isfile(file_path):
                if os.stat(file_path).st_mtime < cutoff_time:
                    try:
                        os.remove(file_path)
                        deleted_count += 1
                        logger.info(f"Cleaned up old file: {file_path}")
                    except Exception as e:
                        logger.warning(f"Failed to clean up file: {e}")
        
        return deleted_count
    
    def get_storage_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics.
        
        Returns:
            Dictionary with storage statistics
        """
        stats = {
            "total_size": 0,
            "directories": {},
        }
        
        subdirs = ['uploads', 'processed', 'text', 'pdfs', 'converted', 'ocr_results']
        
        for subdir in subdirs:
            dir_path = os.path.join(self.base_dir, subdir)
            dir_stats = {
                "file_count": 0,
                "total_size": 0,
            }
            
            if os.path.exists(dir_path):
                for filename in os.listdir(dir_path):
                    file_path = os.path.join(dir_path, filename)
                    if os.path.isfile(file_path):
                        size = os.stat(file_path).st_size
                        dir_stats["file_count"] += 1
                        dir_stats["total_size"] += size
            
            stats["directories"][subdir] = dir_stats
            stats["total_size"] += dir_stats["total_size"]
        
        return stats
