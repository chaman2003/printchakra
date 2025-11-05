"""File management feature service layer."""

import os
from typing import List, Optional

from models.file_info import FileInfo
from utils.file_utils import ensure_directory, get_file_info, sanitize_filename


class FileService:
    """Service responsible for file CRUD operations and metadata access."""

    def __init__(self, upload_dir: str, processed_dir: str):
        self.upload_dir = upload_dir
        self.processed_dir = processed_dir
        ensure_directory(upload_dir)
        ensure_directory(processed_dir)

    def list_files(self) -> List[FileInfo]:
        files: List[FileInfo] = []

        if not os.path.exists(self.upload_dir):
            return files

        for filename in os.listdir(self.upload_dir):
            filepath = os.path.join(self.upload_dir, filename)
            if not os.path.isfile(filepath):
                continue

            info = get_file_info(filepath)
            if not info:
                continue

            text_file = os.path.join(
                self.processed_dir,
                f"{os.path.splitext(filename)[0]}.txt",
            )
            has_text = os.path.exists(text_file)

            files.append(
                FileInfo(
                    filename=filename,
                    size=info["size"],
                    created=info["created"],
                    has_text=has_text,
                )
            )

        files.sort(key=lambda x: x.created, reverse=True)
        return files

    def save_file(self, file_data, filename: str) -> str:
        safe_filename = sanitize_filename(filename)
        filepath = os.path.join(self.upload_dir, safe_filename)

        if os.path.exists(filepath):
            name, ext = os.path.splitext(safe_filename)
            counter = 1
            while os.path.exists(filepath):
                safe_filename = f"{name}_{counter}{ext}"
                filepath = os.path.join(self.upload_dir, safe_filename)
                counter += 1

        file_data.save(filepath)
        return safe_filename

    def delete_file(self, filename: str) -> bool:
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)

        text_file = os.path.join(self.processed_dir, f"{os.path.splitext(filename)[0]}.txt")
        if os.path.exists(text_file):
            os.remove(text_file)

        return True

    def get_file_path(self, filename: str) -> Optional[str]:
        filepath = os.path.join(self.upload_dir, filename)
        return filepath if os.path.exists(filepath) else None

    def file_exists(self, filename: str) -> bool:
        return os.path.exists(os.path.join(self.upload_dir, filename))
