"""
File routes
API endpoints for file operations
"""

from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
import os

file_bp = Blueprint('files', __name__)

# Service will be injected by app
file_service = None


def init_file_routes(service):
    """Initialize file routes with service"""
    global file_service
    file_service = service


@file_bp.route('/', methods=['GET'])
def list_files():
    """List all uploaded files"""
    try:
        files = file_service.list_files()
        return jsonify({
            'files': [f.to_dict() for f in files]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@file_bp.route('/upload', methods=['POST'])
def upload_file():
    """Upload a new file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file
        filename = file_service.save_file(file, file.filename)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'message': 'File uploaded successfully'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@file_bp.route('/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a file"""
    try:
        success = file_service.delete_file(filename)
        if success:
            return jsonify({
                'success': True,
                'message': 'File deleted successfully'
            })
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@file_bp.route('/<filename>', methods=['GET'])
def get_file(filename):
    """Download a file"""
    try:
        filepath = file_service.get_file_path(filename)
        if filepath and os.path.exists(filepath):
            return send_from_directory(
                os.path.dirname(filepath),
                filename,
                as_attachment=True
            )
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@file_bp.route('/<filename>/exists', methods=['GET'])
def check_file_exists(filename):
    """Check if file exists"""
    try:
        exists = file_service.file_exists(filename)
        return jsonify({'exists': exists})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
