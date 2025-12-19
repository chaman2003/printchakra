"""
PrintChakra Backend - Orchestration Command Routes

Voice and text command execution endpoints.
"""

import logging
from flask import jsonify, request
from app.features.orchestration.routes import orchestration_bp
from app.core.middleware.cors import create_options_response

logger = logging.getLogger(__name__)


@orchestration_bp.route("/command", methods=["POST", "OPTIONS"])
def execute_command():
    """Execute an orchestration command."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        command = data.get("command")
        parameters = data.get("parameters", {})
        source = data.get("source", "api")  # api, voice, ui
        
        if not command:
            return jsonify({"success": False, "error": "No command provided"}), 400
        
        logger.info(f"Executing command: {command} (source: {source})")
        
        # Parse and execute command
        result = execute_orchestration_command(command, parameters)
        
        return jsonify({
            "success": result.get("success", False),
            "command": command,
            "result": result
        })
    
    except Exception as e:
        logger.error(f"Command execution error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/command/parse", methods=["POST", "OPTIONS"])
def parse_command():
    """Parse a natural language command into structured format."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        data = request.get_json()
        
        if not data or "text" not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data.get("text")
        
        # Parse natural language command
        parsed = parse_natural_language_command(text)
        
        return jsonify({
            "success": True,
            "original": text,
            "parsed": parsed
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/commands", methods=["GET", "OPTIONS"])
def list_available_commands():
    """List all available orchestration commands."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        commands = [
            {
                "name": "print",
                "description": "Print a document",
                "parameters": ["document", "printer", "copies", "color", "duplex"],
                "examples": ["print the document", "print 2 copies"]
            },
            {
                "name": "scan",
                "description": "Scan a document",
                "parameters": ["format", "resolution", "color"],
                "examples": ["scan document", "scan to PDF"]
            },
            {
                "name": "ocr",
                "description": "Extract text from document",
                "parameters": ["document", "language"],
                "examples": ["extract text", "OCR this document"]
            },
            {
                "name": "convert",
                "description": "Convert document format",
                "parameters": ["document", "target_format"],
                "examples": ["convert to PDF", "make this a PDF"]
            },
            {
                "name": "list_files",
                "description": "List documents",
                "parameters": ["folder", "type"],
                "examples": ["list documents", "show my files"]
            },
            {
                "name": "list_printers",
                "description": "List available printers",
                "parameters": [],
                "examples": ["list printers", "what printers are available"]
            },
            {
                "name": "status",
                "description": "Get system status",
                "parameters": ["service"],
                "examples": ["system status", "is the printer ready"]
            }
        ]
        
        return jsonify({
            "success": True,
            "commands": commands,
            "total": len(commands)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@orchestration_bp.route("/command/history", methods=["GET", "OPTIONS"])
def get_command_history():
    """Get command execution history."""
    if request.method == "OPTIONS":
        return create_options_response()
    
    try:
        limit = request.args.get("limit", 50, type=int)
        
        # In a full implementation, this would query a database
        history = []
        
        return jsonify({
            "success": True,
            "history": history,
            "total": len(history)
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def execute_orchestration_command(command: str, parameters: dict) -> dict:
    """Execute a specific orchestration command."""
    command = command.lower().strip()
    
    if command == "print":
        return execute_print_command(parameters)
    elif command == "scan":
        return execute_scan_command(parameters)
    elif command == "ocr":
        return execute_ocr_command(parameters)
    elif command == "convert":
        return execute_convert_command(parameters)
    elif command == "list_files":
        return execute_list_files_command(parameters)
    elif command == "list_printers":
        return execute_list_printers_command(parameters)
    elif command == "status":
        return execute_status_command(parameters)
    else:
        return {
            "success": False,
            "error": f"Unknown command: {command}"
        }


def execute_print_command(params: dict) -> dict:
    """Execute print command."""
    document = params.get("document")
    if not document:
        return {"success": False, "error": "No document specified"}
    
    return {
        "success": True,
        "action": "print",
        "document": document,
        "message": f"Print job queued for {document}"
    }


def execute_scan_command(params: dict) -> dict:
    """Execute scan command."""
    return {
        "success": True,
        "action": "scan",
        "message": "Ready to scan. Please place document on scanner."
    }


def execute_ocr_command(params: dict) -> dict:
    """Execute OCR command."""
    document = params.get("document")
    if not document:
        return {"success": False, "error": "No document specified"}
    
    return {
        "success": True,
        "action": "ocr",
        "document": document,
        "message": f"OCR started for {document}"
    }


def execute_convert_command(params: dict) -> dict:
    """Execute convert command."""
    document = params.get("document")
    target_format = params.get("target_format", "pdf")
    
    if not document:
        return {"success": False, "error": "No document specified"}
    
    return {
        "success": True,
        "action": "convert",
        "document": document,
        "format": target_format,
        "message": f"Converting {document} to {target_format}"
    }


def execute_list_files_command(params: dict) -> dict:
    """Execute list files command."""
    return {
        "success": True,
        "action": "list_files",
        "message": "Listing files..."
    }


def execute_list_printers_command(params: dict) -> dict:
    """Execute list printers command."""
    return {
        "success": True,
        "action": "list_printers",
        "message": "Listing printers..."
    }


def execute_status_command(params: dict) -> dict:
    """Execute status command."""
    return {
        "success": True,
        "action": "status",
        "message": "System is running"
    }


def parse_natural_language_command(text: str) -> dict:
    """Parse natural language into structured command."""
    text_lower = text.lower()
    
    # Simple keyword-based parsing
    if any(word in text_lower for word in ["print", "printing"]):
        return {
            "command": "print",
            "confidence": 0.9,
            "parameters": {}
        }
    elif any(word in text_lower for word in ["scan", "scanning"]):
        return {
            "command": "scan",
            "confidence": 0.9,
            "parameters": {}
        }
    elif any(word in text_lower for word in ["ocr", "extract", "text"]):
        return {
            "command": "ocr",
            "confidence": 0.8,
            "parameters": {}
        }
    elif any(word in text_lower for word in ["convert", "pdf"]):
        return {
            "command": "convert",
            "confidence": 0.8,
            "parameters": {"target_format": "pdf"}
        }
    elif any(word in text_lower for word in ["list", "files", "documents"]):
        return {
            "command": "list_files",
            "confidence": 0.8,
            "parameters": {}
        }
    elif any(word in text_lower for word in ["printers", "printer list"]):
        return {
            "command": "list_printers",
            "confidence": 0.8,
            "parameters": {}
        }
    elif any(word in text_lower for word in ["status", "health"]):
        return {
            "command": "status",
            "confidence": 0.8,
            "parameters": {}
        }
    else:
        return {
            "command": None,
            "confidence": 0.0,
            "parameters": {},
            "message": "Could not parse command"
        }
