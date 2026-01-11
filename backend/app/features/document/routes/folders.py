"""
PrintChakra Backend - Folder Management Routes

Create, list, rename, and delete folders for organizing documents.
"""

import os
import shutil
import logging
from flask import jsonify, request
from werkzeug.utils import secure_filename
from app.features.document.routes import document_bp
from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


def _get_processed_dir():
    """Get processed directory path."""
    dirs = get_data_dirs()
    return dirs["PROCESSED_DIR"]


def _validate_folder_name(name):
    """Validate and sanitize folder name."""
    if not name or not name.strip():
        return None, "Folder name cannot be empty"
    name = name.strip()
    # Block path traversal
    if ".." in name or "/" in name or "\\" in name:
        return None, "Invalid folder name"
    safe = secure_filename(name)
    if not safe:
        return None, "Invalid folder name"
    return safe, None


@document_bp.route("/folders", methods=["GET", "OPTIONS"])
def list_folders():
    """List all folders in the processed directory."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        base = _get_processed_dir()
        folders = []

        if os.path.exists(base):
            for entry in sorted(os.listdir(base)):
                path = os.path.join(base, entry)
                if os.path.isdir(path):
                    # Count files inside
                    file_count = sum(1 for f in os.listdir(path) if os.path.isfile(os.path.join(path, f)))
                    folders.append({
                        "name": entry,
                        "file_count": file_count,
                    })

        return jsonify({"success": True, "folders": folders})

    except Exception as e:
        logger.error(f"List folders error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/folders", methods=["POST", "OPTIONS"])
def create_folder():
    """Create a new folder."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        name, err = _validate_folder_name(data.get("name", ""))
        if err:
            return jsonify({"success": False, "error": err}), 400

        base = _get_processed_dir()
        folder_path = os.path.join(base, name)

        if os.path.exists(folder_path):
            return jsonify({"success": False, "error": "Folder already exists"}), 409

        os.makedirs(folder_path, exist_ok=True)
        logger.info(f"[OK] Folder created: {name}")

        return jsonify({"success": True, "folder": {"name": name, "file_count": 0}})

    except Exception as e:
        logger.error(f"Create folder error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/folders/<folder_name>", methods=["PUT", "OPTIONS"])
def rename_folder(folder_name):
    """Rename a folder."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400

        old_name, err = _validate_folder_name(folder_name)
        if err:
            return jsonify({"success": False, "error": err}), 400

        new_name, err = _validate_folder_name(data.get("name", ""))
        if err:
            return jsonify({"success": False, "error": err}), 400

        base = _get_processed_dir()
        old_path = os.path.join(base, old_name)
        new_path = os.path.join(base, new_name)

        if not os.path.exists(old_path):
            return jsonify({"success": False, "error": "Folder not found"}), 404

        if os.path.exists(new_path):
            return jsonify({"success": False, "error": "A folder with that name already exists"}), 409

        os.rename(old_path, new_path)
        logger.info(f"[OK] Folder renamed: {old_name} -> {new_name}")

        return jsonify({"success": True, "folder": {"name": new_name}})

    except Exception as e:
        logger.error(f"Rename folder error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/folders/<folder_name>", methods=["DELETE", "OPTIONS"])
def delete_folder(folder_name):
    """Delete a folder and all its contents."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        name, err = _validate_folder_name(folder_name)
        if err:
            return jsonify({"success": False, "error": err}), 400

        base = _get_processed_dir()
        folder_path = os.path.join(base, name)

        if not os.path.exists(folder_path):
            return jsonify({"success": False, "error": "Folder not found"}), 404

        shutil.rmtree(folder_path)
        logger.info(f"[OK] Folder deleted: {name}")

        return jsonify({"success": True, "message": f"Folder '{name}' deleted"})

    except Exception as e:
        logger.error(f"Delete folder error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/folders/<folder_name>/files", methods=["GET", "OPTIONS"])
def list_folder_files(folder_name):
    """List files in a specific folder."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        name, err = _validate_folder_name(folder_name)
        if err:
            return jsonify({"success": False, "error": err}), 400

        base = _get_processed_dir()
        folder_path = os.path.join(base, name)

        if not os.path.exists(folder_path):
            return jsonify({"success": False, "error": "Folder not found"}), 404

        from datetime import datetime
        files = []
        for filename in os.listdir(folder_path):
            filepath = os.path.join(folder_path, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                ext = os.path.splitext(filename)[1].lower()
                files.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "type": "image" if ext in [".jpg", ".jpeg", ".png", ".bmp", ".gif", ".tiff", ".webp"] else ("pdf" if ext == ".pdf" else "other"),
                    "extension": ext,
                    "folder": name,
                })

        files.sort(key=lambda x: x["created"], reverse=True)

        return jsonify({"success": True, "files": files, "count": len(files), "folder": name})

    except Exception as e:
        logger.error(f"List folder files error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@document_bp.route("/folders/<folder_name>/move", methods=["POST", "OPTIONS"])
def move_file_to_folder(folder_name):
    """Move a file into a folder (or out of a folder to root)."""
    if request.method == "OPTIONS":
        return create_options_response()

    try:
        data = request.get_json()
        if not data or "filename" not in data:
            return jsonify({"success": False, "error": "No filename provided"}), 400

        filename = secure_filename(data["filename"])
        if not filename:
            return jsonify({"success": False, "error": "Invalid filename"}), 400

        base = _get_processed_dir()

        if folder_name == "_root":
            # Move file from a folder back to root
            source_folder = data.get("source_folder")
            if not source_folder:
                return jsonify({"success": False, "error": "source_folder required when moving to root"}), 400
            sf, err = _validate_folder_name(source_folder)
            if err:
                return jsonify({"success": False, "error": err}), 400
            src = os.path.join(base, sf, filename)
            dst = os.path.join(base, filename)
        else:
            name, err = _validate_folder_name(folder_name)
            if err:
                return jsonify({"success": False, "error": err}), 400

            folder_path = os.path.join(base, name)
            if not os.path.exists(folder_path):
                return jsonify({"success": False, "error": "Folder not found"}), 404

            # Try finding file in root or other folders
            src = os.path.join(base, filename)
            if not os.path.exists(src):
                # Search in subfolders
                source_folder = data.get("source_folder")
                if source_folder:
                    sf, _ = _validate_folder_name(source_folder)
                    if sf:
                        src = os.path.join(base, sf, filename)

            dst = os.path.join(folder_path, filename)

        if not os.path.exists(src):
            return jsonify({"success": False, "error": "File not found"}), 404

        if os.path.exists(dst):
            return jsonify({"success": False, "error": "File already exists in destination"}), 409

        shutil.move(src, dst)
        logger.info(f"[OK] File moved: {filename} -> {folder_name}")

        return jsonify({"success": True, "message": f"File moved to {folder_name}"})

    except Exception as e:
        logger.error(f"Move file error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
