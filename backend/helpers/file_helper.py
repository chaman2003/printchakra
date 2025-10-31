"""
Simple File Helper
-----------------
Easy functions for working with files and directories.
"""

import os
import uuid
from datetime import datetime


def create_directories(*paths):
    """
    Create directories if they don't exist.
    
    Args:
        *paths: One or more directory paths to create
    """
    for path in paths:
        if not os.path.exists(path):
            os.makedirs(path, exist_ok=True)


def generate_filename(prefix="file", extension="jpg"):
    """
    Generate a unique filename with timestamp and random ID.
    
    Args:
        prefix: Start of filename (default: "file")
        extension: File extension without dot (default: "jpg")
    
    Returns:
        Unique filename like "file_20251031_123456_abc123.jpg"
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    return f"{prefix}_{timestamp}_{unique_id}.{extension}"


def get_file_info(filepath):
    """
    Get basic information about a file.
    
    Args:
        filepath: Path to file
    
    Returns:
        Dictionary with file info or None if file doesn't exist
    """
    if not os.path.exists(filepath):
        return None
    
    stat = os.stat(filepath)
    return {
        'name': os.path.basename(filepath),
        'size': stat.st_size,
        'modified': datetime.fromtimestamp(stat.st_mtime),
        'created': datetime.fromtimestamp(stat.st_ctime),
        'extension': os.path.splitext(filepath)[1]
    }


def list_files_in_directory(directory, extension=None):
    """
    List all files in a directory.
    
    Args:
        directory: Directory path
        extension: Filter by extension (optional, e.g., '.jpg')
    
    Returns:
        List of filenames
    """
    if not os.path.exists(directory):
        return []
    
    files = []
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            if extension is None or filename.endswith(extension):
                files.append(filename)
    
    return sorted(files, reverse=True)  # Newest first


def delete_file_safely(filepath):
    """
    Delete a file if it exists.
    
    Args:
        filepath: Path to file to delete
    
    Returns:
        True if deleted, False if file didn't exist or error occurred
    """
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    except Exception:
        return False


def get_base_name(filename):
    """
    Get filename without extension.
    
    Args:
        filename: Full filename
    
    Returns:
        Filename without extension
    """
    return os.path.splitext(filename)[0]


def ensure_directory_exists(filepath):
    """
    Create directory for a file path if it doesn't exist.
    
    Args:
        filepath: Full file path
    """
    directory = os.path.dirname(filepath)
    if directory and not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)
