"""
OCR routes
API endpoints for OCR operations
"""

from flask import Blueprint, request, jsonify

ocr_bp = Blueprint('ocr', __name__)

# Service will be injected by app
ocr_service = None
file_service = None


def init_ocr_routes(ocr_svc, file_svc):
    """Initialize OCR routes with services"""
    global ocr_service, file_service
    ocr_service = ocr_svc
    file_service = file_svc


@ocr_bp.route('/<filename>', methods=['GET'])
def get_ocr_text(filename):
    """Get OCR text for file"""
    try:
        text = ocr_service.load_text(filename)
        
        if text is not None:
            return jsonify({
                'filename': filename,
                'text': text,
                'has_text': len(text) > 0
            })
        else:
            return jsonify({'error': 'No OCR text found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ocr_bp.route('/process', methods=['POST'])
def process_ocr():
    """Process file with OCR"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        filename = data.get('filename')
        if not filename:
            return jsonify({'error': 'No filename provided'}), 400
        
        # Get file path
        filepath = file_service.get_file_path(filename)
        if not filepath:
            return jsonify({'error': 'File not found'}), 404
        
        # Get language (optional)
        lang = data.get('language', 'eng')
        
        # Process OCR
        result = ocr_service.process_file(filepath, filename, lang=lang)
        
        if result['success']:
            return jsonify({
                'success': True,
                'text': result['text'],
                'has_text': result['has_text'],
                'message': 'OCR completed successfully'
            })
        else:
            return jsonify({'error': result.get('error')}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@ocr_bp.route('/batch', methods=['POST'])
def batch_ocr():
    """Process multiple files with OCR"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        filenames = data.get('filenames', [])
        if not filenames:
            return jsonify({'error': 'No filenames provided'}), 400
        
        lang = data.get('language', 'eng')
        
        results = []
        errors = []
        
        for filename in filenames:
            filepath = file_service.get_file_path(filename)
            if not filepath:
                errors.append({'filename': filename, 'error': 'File not found'})
                continue
            
            result = ocr_service.process_file(filepath, filename, lang=lang)
            if result['success']:
                results.append({
                    'filename': filename,
                    'has_text': result['has_text']
                })
            else:
                errors.append({
                    'filename': filename,
                    'error': result.get('error', 'Unknown error')
                })
        
        return jsonify({
            'success': len(errors) == 0,
            'processed': len(results),
            'failed': len(errors),
            'results': results,
            'errors': errors
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
