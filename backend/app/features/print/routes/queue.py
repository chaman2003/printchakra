"""
PrintChakra Backend - Print Queue Routes

Print queue management endpoints.
"""

import logging
from flask import jsonify, request
from app.features.print.routes import print_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@print_bp.route("/queue", methods=["GET", "OPTIONS"])
def get_print_queue():
    """Get the current print queue."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        printer_name = request.args.get("printer")
        
        from app.features.print.services.printer_service import PrinterService
        
        printer_service = PrinterService()
        queue = printer_service.get_queue(printer_name)
        
        return jsonify({
            "success": True,
            "queue": queue,
            "total": len(queue)
        })
    
    except ImportError:
        return jsonify({
            "success": True,
            "queue": [],
            "total": 0,
            "note": "Printer service not available"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/queue/clear", methods=["POST", "OPTIONS"])
def clear_print_queue():
    """Clear the print queue."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        printer_name = data.get("printer")
        
        from app.features.print.services.printer_service import PrinterService
        
        printer_service = PrinterService()
        result = printer_service.clear_queue(printer_name)
        
        if result:
            logger.info(f"[OK] Print queue cleared for: {printer_name or 'all printers'}")
            return jsonify({"success": True, "message": "Queue cleared"})
        else:
            return jsonify({"success": False, "error": "Failed to clear queue"}), 400
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Printer service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/queue/pause", methods=["POST", "OPTIONS"])
def pause_print_queue():
    """Pause the print queue."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        printer_name = data.get("printer")
        
        from app.features.print.services.printer_service import PrinterService
        
        printer_service = PrinterService()
        result = printer_service.pause_queue(printer_name)
        
        if result:
            logger.info(f"[OK] Print queue paused for: {printer_name or 'all printers'}")
            return jsonify({"success": True, "message": "Queue paused"})
        else:
            return jsonify({"success": False, "error": "Failed to pause queue"}), 400
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Printer service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/queue/resume", methods=["POST", "OPTIONS"])
def resume_print_queue():
    """Resume the print queue."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json() or {}
        printer_name = data.get("printer")
        
        from app.features.print.services.printer_service import PrinterService
        
        printer_service = PrinterService()
        result = printer_service.resume_queue(printer_name)
        
        if result:
            logger.info(f"[OK] Print queue resumed for: {printer_name or 'all printers'}")
            return jsonify({"success": True, "message": "Queue resumed"})
        else:
            return jsonify({"success": False, "error": "Failed to resume queue"}), 400
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Printer service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/queue/reorder", methods=["POST", "OPTIONS"])
def reorder_print_queue():
    """Reorder items in the print queue."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data or "order" not in data:
            return jsonify({"success": False, "error": "No order provided"}), 400
        
        order = data.get("order", [])
        printer_name = data.get("printer")
        
        from app.features.print.services.printer_service import PrinterService
        
        printer_service = PrinterService()
        result = printer_service.reorder_queue(printer_name, order)
        
        if result:
            logger.info(f"[OK] Print queue reordered for: {printer_name or 'default'}")
            return jsonify({"success": True, "message": "Queue reordered"})
        else:
            return jsonify({"success": False, "error": "Failed to reorder queue"}), 400
    
    except ImportError:
        return jsonify({
            "success": False,
            "error": "Printer service not available"
        }), 503
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@print_bp.route("/queue/stats", methods=["GET", "OPTIONS"])
def get_queue_stats():
    """Get print queue statistics."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        from app.features.print.services.printer_service import PrinterService
        
        printer_service = PrinterService()
        stats = printer_service.get_queue_stats()
        
        return jsonify({
            "success": True,
            "stats": stats
        })
    
    except ImportError:
        return jsonify({
            "success": True,
            "stats": {
                "pending": 0,
                "printing": 0,
                "completed": 0,
                "failed": 0,
                "total": 0
            },
            "note": "Printer service not available"
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
