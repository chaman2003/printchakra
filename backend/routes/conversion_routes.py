"""
Conversion routes
API endpoints for file conversion operations
"""

from flask import Blueprint, request, jsonify, send_from_directory
import os

conversion_bp = Blueprint('conversion', __name__)

# Service will be injected by app
conversion_service = None
file_service = None


def init_conversion_routes(conv_svc, file_svc):
    """Initialize conversion routes with services"""
    global conversion_service, file_service
    conversion_service = conv_svc
    file_service = file_svc


@conversion_bp.route('/formats', methods=['GET'])
def get_supported_formats():
    """Get list of supported conversion formats"""
    try:
        formats = conversion_service.get_supported_formats()
        return jsonify({'formats': formats})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@conversion_bp.route('/execute', methods=['POST'])
def convert_file():
    """Convert file to specified format"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        filename = data.get('filename')
        output_format = data.get('format')
        
        if not filename or not output_format:
            return jsonify({'error': 'Filename and format required'}), 400
        
        # Get file path
        filepath = file_service.get_file_path(filename)
        if not filepath:
            return jsonify({'error': 'File not found'}), 404
        
        # Convert file
        result = conversion_service.convert_file(filepath, output_format)
        
        if result['success']:
            return jsonify({
                'success': True,
                'output_filename': result['output_name'],
                'message': 'Conversion completed successfully'
            })
        else:
            return jsonify({'error': result.get('error')}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@conversion_bp.route('/batch', methods=['POST'])
def batch_convert():
    """Convert multiple files to specified format"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        filenames = data.get('filenames', [])
        output_format = data.get('format')
        
        if not filenames or not output_format:
            return jsonify({'error': 'Filenames and format required'}), 400
        
        # Get file paths
        input_paths = []
        for filename in filenames:
            filepath = file_service.get_file_path(filename)
            if filepath:
                input_paths.append(filepath)
        
        if not input_paths:
            return jsonify({'error': 'No valid files found'}), 404
        
        # Batch convert
        result = conversion_service.batch_convert(input_paths, output_format)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@conversion_bp.route('/list', methods=['GET'])
def list_converted():
    """List all converted files"""
    try:
        files = conversion_service.list_converted_files()
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@conversion_bp.route('/download/<filename>', methods=['GET'])
def download_converted(filename):
    """Download converted file"""
    try:
        filepath = os.path.join(conversion_service.converted_dir, filename)
        if os.path.exists(filepath):
            return send_from_directory(
                conversion_service.converted_dir,
                filename,
                as_attachment=True
            )
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
