"""
PrintChakra Backend - Print Routes

Routes for print operations including printer management,
job submission, and queue control.
"""

import os
import sys
import json
import subprocess
from flask import Blueprint, request, jsonify, current_app
from app.core.config import get_data_dirs
from app.core.middleware.cors import create_options_response

print_bp = Blueprint('print', __name__)


# =============================================================================
# PRINTER STATUS & QUEUE ENDPOINTS
# =============================================================================

@print_bp.route("/queues", methods=["GET", "OPTIONS"])
def get_printer_queues():
    """Get all printer queues with job information."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.printer_service import PrinterService
        
        service = PrinterService()
        queues = service.get_printer_queues()
        
        return jsonify({
            "success": True,
            "printers": queues,
            "count": len(queues)
        })
    
    except Exception as e:
        current_app.logger.error(f"Failed to get printer queues: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/cancel-job", methods=["POST", "OPTIONS"])
def cancel_print_job():
    """Cancel a print job."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        printer_name = data.get("printer")
        job_id = data.get("jobId")
        
        if not printer_name or not job_id:
            return jsonify({"error": "Printer name and job ID required"}), 400
        
        from app.features.print.services.printer_service import PrinterService
        
        service = PrinterService()
        service.cancel_job(printer_name, job_id)
        
        return jsonify({
            "success": True,
            "message": f"Job {job_id} cancelled"
        })
    
    except Exception as e:
        current_app.logger.error(f"Failed to cancel job: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/clear-queue", methods=["POST", "OPTIONS"])
def clear_print_queue():
    """Clear all jobs from a printer queue."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        printer_name = data.get("printer")
        
        if not printer_name:
            return jsonify({"error": "Printer name required"}), 400
        
        from app.features.print.services.printer_service import PrinterService
        
        service = PrinterService()
        cleared = service.clear_queue(printer_name)
        
        return jsonify({
            "success": True,
            "message": f"Cleared {cleared} jobs from {printer_name}"
        })
    
    except Exception as e:
        current_app.logger.error(f"Failed to clear queue: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/diagnostics", methods=["GET", "POST", "OPTIONS"])
def printer_diagnostics():
    """Get printer diagnostics or run diagnostic tests."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.printer_service import PrinterService
        
        service = PrinterService()
        
        if request.method == "GET":
            diagnostics = service.get_diagnostics()
            return jsonify({"success": True, "diagnostics": diagnostics})
        else:
            # POST - run diagnostic test
            data = request.get_json() or {}
            test_type = data.get("test", "status")
            result = service.run_diagnostic(test_type)
            return jsonify({"success": True, "result": result})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# PRINT JOB SUBMISSION ENDPOINTS
# =============================================================================

@print_bp.route("/", methods=["POST", "OPTIONS"])
def trigger_print():
    """
    Trigger print command.
    
    Expects JSON: { "type": "blank" | "test" }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    dirs = get_data_dirs()
    
    try:
        data = request.get_json() if request.is_json else {}
        print_type = data.get("type", "blank")
        
        from app.features.print.services.print_job_service import PrintJobService
        
        service = PrintJobService()
        
        if print_type == "test":
            result = service.test_printer()
            return jsonify(result)
        
        elif print_type == "blank":
            result = service.print_blank_page()
            
            # Notify phone to capture
            try:
                from app.core import socketio
                from datetime import datetime
                socketio.emit("capture_now", {
                    "message": "Capture the printed document",
                    "timestamp": datetime.now().isoformat()
                })
            except Exception as socket_error:
                current_app.logger.warning(f"Socket.IO error: {socket_error}")
            
            return jsonify(result)
        
        else:
            return jsonify({
                "status": "error",
                "message": 'Invalid print type. Use "blank" or "test"'
            }), 400
    
    except Exception as e:
        current_app.logger.error(f"Print error: {e}")
        return jsonify({"error": str(e)}), 500


@print_bp.route("/document", methods=["POST", "OPTIONS"])
def print_document():
    """
    Print a single document by filename.
    
    Converts images to PDF before printing for better compatibility.
    Expects JSON: { "filename": "document.jpg", "copies": 1 }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() if request.is_json else {}
        filename = data.get("filename")
        copies = int(data.get("copies", 1))
        
        if not filename:
            return jsonify({"success": False, "error": "No filename provided"}), 400
        
        from app.features.print.services.print_job_service import PrintJobService
        
        service = PrintJobService()
        result = service.print_document(filename, copies)
        
        return jsonify(result)
    
    except Exception as e:
        current_app.logger.error(f"Print document error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/batch", methods=["POST", "OPTIONS"])
def print_batch():
    """
    Print multiple documents.
    
    Expects JSON: { 
        "files": ["doc1.jpg", "doc2.jpg"], 
        "copies": 1,
        "merge": false  
    }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        files = data.get("files", [])
        copies = int(data.get("copies", 1))
        merge = data.get("merge", False)
        
        if not files:
            return jsonify({"success": False, "error": "No files provided"}), 400
        
        from app.features.print.services.print_job_service import PrintJobService
        
        service = PrintJobService()
        
        if merge:
            result = service.print_merged_documents(files, copies)
        else:
            result = service.print_documents(files, copies)
        
        return jsonify(result)
    
    except Exception as e:
        current_app.logger.error(f"Batch print error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/pdf", methods=["POST", "OPTIONS"])
def print_pdf():
    """
    Print a PDF file directly.
    
    Expects JSON: { "filename": "document.pdf", "pages": "all", "copies": 1 }
    """
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        filename = data.get("filename")
        pages = data.get("pages", "all")
        copies = int(data.get("copies", 1))
        
        if not filename:
            return jsonify({"success": False, "error": "No filename provided"}), 400
        
        from app.features.print.services.print_job_service import PrintJobService
        
        service = PrintJobService()
        result = service.print_pdf(filename, pages, copies)
        
        return jsonify(result)
    
    except Exception as e:
        current_app.logger.error(f"PDF print error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


# =============================================================================
# PRINT CONFIGURATION ENDPOINTS
# =============================================================================

@print_bp.route("/config", methods=["GET", "OPTIONS"])
def get_print_config():
    """Get current print configuration."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.printer_service import PrinterService
        
        service = PrinterService()
        config = service.get_print_config()
        
        return jsonify({"success": True, "config": config})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/config", methods=["POST"])
def update_print_config():
    """Update print configuration."""
    try:
        data = request.get_json() or {}
        
        from app.features.print.services.printer_service import PrinterService
        
        service = PrinterService()
        config = service.update_print_config(data)
        
        return jsonify({"success": True, "config": config})
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
