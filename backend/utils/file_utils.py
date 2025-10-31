"""
File utilities
Common file operations
"""

import os
import re
from datetime import datetime
from typing import Optional


def ensure_directory(path: str) -> None:
    """
    Ensure directory exists, create if not

    Args:
        path: Directory path
    """
    os.makedirs(path, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to be safe for filesystem

    Args:
        filename: Original filename

    Returns:
        Sanitized filename
    """
    # Remove or replace invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', "_", filename)
    # Remove leading/trailing spaces and dots
    filename = filename.strip(". ")
    # Limit length
    if len(filename) > 255:
        name, ext = os.path.splitext(filename)
        filename = name[: 255 - len(ext)] + ext
    return filename


def get_file_info(filepath: str) -> Optional[dict]:
    """
    Get file information

    Args:
        filepath: Path to file

    Returns:
        File info dictionary or None if file doesn't exist
    """
    if not os.path.exists(filepath):
        return None

    stat = os.stat(filepath)
    return {
        "size": stat.st_size,
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "filename": os.path.basename(filepath),
    }


def get_file_extension(filename: str) -> str:
    """
    Get file extension (lowercase, without dot)

    Args:
        filename: Filename

    Returns:
        File extension
    """
    return os.path.splitext(filename)[1].lower().lstrip(".")


def is_image_file(filename: str) -> bool:
    """
    Check if file is an image

    Args:
        filename: Filename

    Returns:
        True if image file
    """
    image_extensions = {"jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"}
    return get_file_extension(filename) in image_extensions


def is_pdf_file(filename: str) -> bool:
    """
    Check if file is a PDF

    Args:
        filename: Filename

    Returns:
        True if PDF file
    """
    return get_file_extension(filename) == "pdf"
