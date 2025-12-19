"""
PrintChakra Backend - Print Jobs Routes

Print job management endpoints.
"""

import os
import logging
from flask import jsonify, request
from werkzeug.utils import secure_filename
from app.features.print.routes import print_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data")


@print_bp.route("/job", methods=["POST", "OPTIONS"])
def create_print_job():
    """Create a new print job."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        document_id = data.get("document_id")
        printer_name = data.get("printer")
        copies = data.get("copies", 1)
        color = data.get("color", True)
        duplex = data.get("duplex", False)
        page_range = data.get("page_range")
        
        if not document_id:
            return jsonify({"success": False, "error": "No document ID provided"}), 400
        
        if not printer_name:
            return jsonify({"success": False, "error": "No printer specified"}), 400
        
        # Find document
        filename = secure_filename(document_id)
        document_path = None
        
        for folder in ["uploads", "pdfs", "processed", "converted"]:
            filepath = os.path.join(DATA_DIR, folder, filename)
            if os.path.exists(filepath):
                document_path = filepath
                break
        
        if not document_path:
            return jsonify({"success": False, "error": "Document not found"}), 404
        
        # Create print job
        try:
            from app.features.print.services.print_job_service import PrintJobService
            
            job_service = PrintJobService()
            job = job_service.create_job(
                document_path=document_path,
                printer_name=printer_name,
                copies=copies,
                color=color,
                duplex=duplex,
                page_range=page_range
            )
            
            logger.info(f"[OK] Print job created: {job['id']}")
            
            return jsonify({
                "success": True,
                "job": job
            })
        
        except ImportError:
            # Fallback without service
            import uuid
            from datetime import datetime
            
            job_id = str(uuid.uuid4())
            job = {
                "id": job_id,
                "document": document_id,
                "printer": printer_name,
                "copies": copies,
                "color": color,
                "duplex": duplex,
                "page_range": page_range,
                "status": "queued",
                "created": datetime.now().isoformat()
            }
            
            return jsonify({
                "success": True,
                "job": job,
                "note": "Job created (service unavailable)"
            })
    
    except Exception as e:
        logger.error(f"Create job error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/job/<job_id>", methods=["GET", "OPTIONS"])
def get_print_job(job_id):
    """Get print job status."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.print_job_service import PrintJobService
        
        job_service = PrintJobService()
        job = job_service.get_job(job_id)
        
        if not job:
            return jsonify({"success": False, "error": "Job not found"}), 404
        
        return jsonify({
            "success": True,
            "job": job
        })
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Print job service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/job/<job_id>/cancel", methods=["POST", "OPTIONS"])
def cancel_print_job(job_id):
    """Cancel a print job."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.print_job_service import PrintJobService
        
        job_service = PrintJobService()
        result = job_service.cancel_job(job_id)
        
        if result:
            logger.info(f"[OK] Print job cancelled: {job_id}")
            return jsonify({"success": True, "message": "Job cancelled"})
        else:
            return jsonify({"success": False, "error": "Failed to cancel job"}), 400
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Print job service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/jobs", methods=["GET", "OPTIONS"])
def list_print_jobs():
    """List all print jobs."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        status_filter = request.args.get("status")
        limit = request.args.get("limit", 50, type=int)
        
        from app.features.print.services.print_job_service import PrintJobService
        
        job_service = PrintJobService()
        jobs = job_service.list_jobs(status=status_filter, limit=limit)
        
        return jsonify({
            "success": True,
            "jobs": jobs,
            "total": len(jobs)
        })
    
    except ImportError:
        return jsonify({
            "success": True,
            "jobs": [],
            "total": 0,
            "note": "Print job service not available"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/job/<job_id>/retry", methods=["POST", "OPTIONS"])
def retry_print_job(job_id):
    """Retry a failed print job."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.print_job_service import PrintJobService
        
        job_service = PrintJobService()
        job = job_service.retry_job(job_id)
        
        if job:
            logger.info(f"[OK] Print job retried: {job_id}")
            return jsonify({
                "success": True,
                "job": job
            })
        else:
            return jsonify({"success": False, "error": "Failed to retry job"}), 400
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Print job service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
