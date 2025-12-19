"""
PrintChakra Backend - Dashboard File Routes

File listing and management endpoints.
"""

import os
from datetime import datetime
from flask import jsonify, request, current_app
from app.features.dashboard.routes import dashboard_bp
from app.core.config import get_data_dirs


@dashboard_bp.route("/files", methods=["GET", "OPTIONS"])
def list_files():
    """List all processed files with metadata."""
    if request.method == "OPTIONS":
        from app.core.middleware.cors import create_options_response
        return create_options_response()
    
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    
    try:
        files = []
        
        if os.path.exists(PROCESSED_DIR):
            for filename in os.listdir(PROCESSED_DIR):
                file_path = os.path.join(PROCESSED_DIR, filename)
                
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    
                    # Get file extension
                    ext = os.path.splitext(filename)[1].lower()
                    
                    # Determine file type
                    if ext in ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tiff', '.webp']:
                        file_type = 'image'
                    elif ext == '.pdf':
                        file_type = 'pdf'
                    else:
                        file_type = 'other'
                    
                    files.append({
                        "filename": filename,
                        "size": stat.st_size,
                        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "type": file_type,
                        "extension": ext
                    })
        
        # Sort by creation date (newest first)
        files.sort(key=lambda x: x["created"], reverse=True)
        
        return jsonify({
            "success": True,
            "files": files,
            "count": len(files),
            "directory": PROCESSED_DIR
        })
    
    except Exception as e:
        current_app.logger.error(f"Error listing files: {e}")
        return jsonify({"success": False, "error": str(e), "files": []}), 500


@dashboard_bp.route("/files/stats", methods=["GET"])
def get_file_stats():
    """Get file statistics."""
    dirs = get_data_dirs()
    
    stats = {
        "processed": {"count": 0, "size": 0},
        "uploads": {"count": 0, "size": 0},
        "converted": {"count": 0, "size": 0},
        "ocr_results": {"count": 0, "size": 0},
    }
    
    dir_mapping = {
        "processed": dirs.get('PROCESSED_DIR'),
        "uploads": dirs.get('UPLOAD_DIR'),
        "converted": dirs.get('CONVERTED_DIR'),
        "ocr_results": dirs.get('OCR_DATA_DIR'),
    }
    
    for key, dir_path in dir_mapping.items():
        if dir_path and os.path.exists(dir_path):
            for filename in os.listdir(dir_path):
                file_path = os.path.join(dir_path, filename)
                if os.path.isfile(file_path):
                    stats[key]["count"] += 1
                    stats[key]["size"] += os.path.getsize(file_path)
    
    # Calculate totals
    stats["total"] = {
        "count": sum(s["count"] for s in stats.values() if isinstance(s, dict)),
        "size": sum(s["size"] for s in stats.values() if isinstance(s, dict))
    }
    
    return jsonify({"success": True, "stats": stats})


@dashboard_bp.route("/files/recent", methods=["GET"])
def get_recent_files():
    """Get recently modified files."""
    dirs = get_data_dirs()
    PROCESSED_DIR = dirs['PROCESSED_DIR']
    
    limit = request.args.get('limit', 10, type=int)
    
    try:
        files = []
        
        if os.path.exists(PROCESSED_DIR):
            for filename in os.listdir(PROCESSED_DIR):
                file_path = os.path.join(PROCESSED_DIR, filename)
                if os.path.isfile(file_path):
                    stat = os.stat(file_path)
                    files.append({
                        "filename": filename,
                        "modified": stat.st_mtime,
                        "size": stat.st_size
                    })
        
        # Sort by modified time and limit
        files.sort(key=lambda x: x["modified"], reverse=True)
        files = files[:limit]
        
        # Format timestamps
        for f in files:
            f["modified"] = datetime.fromtimestamp(f["modified"]).isoformat()
        
        return jsonify({"success": True, "files": files})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
