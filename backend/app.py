from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import cv2
import numpy as np
from PIL import Image
import pytesseract
from datetime import datetime
import uuid
import subprocess

# Initialize Flask app
app = Flask(__name__)

# Configure CORS for frontend
CORS(app, resources={
    r"/*": {
        "origins": ["https://printchakra.vercel.app", "http://localhost:3000", "https://freezingly-nonsignificative-edison.ngrok-free.dev"],  # Allow Vercel deployment and local development
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Initialize Socket.IO with same CORS settings
socketio = SocketIO(app, cors_allowed_origins=["https://printchakra.vercel.app", "http://localhost:3000", "https://freezingly-nonsignificative-edison.ngrok-free.dev"])

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Directories for file storage
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
PROCESSED_DIR = os.path.join(BASE_DIR, 'processed')
TEXT_DIR = os.path.join(BASE_DIR, 'processed_text')
PRINT_DIR = os.path.join(BASE_DIR, 'print_scripts')

# Create directories if they don't exist
for directory in [UPLOAD_DIR, PROCESSED_DIR, TEXT_DIR, PRINT_DIR]:
    os.makedirs(directory, exist_ok=True)

# Tesseract configuration (update path if needed)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ============================================================================
# IMAGE PROCESSING FUNCTIONS
# ============================================================================

def enhance_image(image_path):
    """
    Enhance image quality using OpenCV
    - Perspective correction
    - Brightness/contrast adjustment
    - Noise reduction
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError("Could not read image")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 11, 2
    )
    
    # Denoise
    denoised = cv2.fastNlMeansDenoising(thresh, None, 10, 7, 21)
    
    # Enhance contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    enhanced = clahe.apply(denoised)
    
    return enhanced

def extract_text(image_path):
    """
    Extract text from image using Tesseract OCR
    """
    try:
        img = Image.open(image_path)
        text = pytesseract.image_to_string(img, lang='eng')
        return text.strip()
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        return ""

def process_document_image(input_path, output_path):
    """
    Complete document processing pipeline
    """
    try:
        # Enhance image
        enhanced = enhance_image(input_path)
        
        # Save processed image
        cv2.imwrite(output_path, enhanced)
        
        # Extract text
        text = extract_text(output_path)
        
        return True, text
    except Exception as e:
        print(f"Processing error: {str(e)}")
        return False, str(e)

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/')
def index():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'PrintChakra Backend',
        'version': '2.0.0',
        'endpoints': {
            'health': '/health',
            'upload': '/upload',
            'files': '/files',
            'processed': '/processed/<filename>',
            'delete': '/delete/<filename>',
            'print': '/print',
            'ocr': '/ocr/<filename>'
        }
    })

@app.route('/health')
def health():
    """Detailed health check"""
    tesseract_available = True
    try:
        pytesseract.get_tesseract_version()
    except:
        tesseract_available = False
    
    return jsonify({
        'status': 'healthy',
        'service': 'PrintChakra Backend',
        'version': '2.0.0',
        'directories': {
            'uploads': os.path.exists(UPLOAD_DIR),
            'processed': os.path.exists(PROCESSED_DIR),
            'text': os.path.exists(TEXT_DIR)
        },
        'features': {
            'tesseract_ocr': tesseract_available,
            'image_processing': True,
            'socket_io': True
        }
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle image upload and processing
    Expects: multipart/form-data with 'photo' file
    """
    if 'photo' not in request.files:
        return jsonify({'error': 'No photo provided'}), 400
    
    file = request.files['photo']
    if file.filename == '':
        return jsonify({'error': 'Empty filename'}), 400
    
    try:
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        original_ext = os.path.splitext(file.filename)[1]
        filename = f"doc_{timestamp}_{unique_id}{original_ext}"
        
        # Save uploaded file
        upload_path = os.path.join(UPLOAD_DIR, filename)
        file.save(upload_path)
        
        # Process image
        processed_filename = f"processed_{filename}"
        processed_path = os.path.join(PROCESSED_DIR, processed_filename)
        
        success, text_or_error = process_document_image(upload_path, processed_path)
        
        if success:
            # Save extracted text
            text_filename = f"{os.path.splitext(processed_filename)[0]}.txt"
            text_path = os.path.join(TEXT_DIR, text_filename)
            with open(text_path, 'w', encoding='utf-8') as f:
                f.write(text_or_error)
            
            # Notify via Socket.IO
            socketio.emit('new_file', {
                'filename': processed_filename,
                'timestamp': timestamp,
                'has_text': len(text_or_error) > 0
            })
            
            return jsonify({
                'status': 'success',
                'filename': processed_filename,
                'original': filename,
                'text_extracted': len(text_or_error) > 0,
                'text_length': len(text_or_error)
            })
        else:
            return jsonify({
                'status': 'error',
                'message': text_or_error
            }), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/files')
def list_files():
    """List all processed files"""
    try:
        files = []
        for filename in os.listdir(PROCESSED_DIR):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(PROCESSED_DIR, filename)
                file_stat = os.stat(file_path)
                
                # Check if text file exists
                text_filename = f"{os.path.splitext(filename)[0]}.txt"
                text_path = os.path.join(TEXT_DIR, text_filename)
                has_text = os.path.exists(text_path)
                
                files.append({
                    'filename': filename,
                    'size': file_stat.st_size,
                    'created': datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                    'has_text': has_text
                })
        
        # Sort by creation time (newest first)
        files.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify(files)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/processed/<filename>')
def get_processed_file(filename):
    """Serve processed image file"""
    try:
        return send_from_directory(PROCESSED_DIR, filename)
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

@app.route('/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a processed file and its associated text"""
    try:
        # Delete image file
        image_path = os.path.join(PROCESSED_DIR, filename)
        if os.path.exists(image_path):
            os.remove(image_path)
        
        # Delete text file
        text_filename = f"{os.path.splitext(filename)[0]}.txt"
        text_path = os.path.join(TEXT_DIR, text_filename)
        if os.path.exists(text_path):
            os.remove(text_path)
        
        # Delete original upload if exists
        original_filename = filename.replace('processed_', '')
        upload_path = os.path.join(UPLOAD_DIR, original_filename)
        if os.path.exists(upload_path):
            os.remove(upload_path)
        
        # Notify via Socket.IO
        socketio.emit('file_deleted', {'filename': filename})
        
        return jsonify({
            'status': 'success',
            'message': f'File {filename} deleted'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/ocr/<filename>')
def get_ocr_text(filename):
    """Get extracted OCR text for a file"""
    try:
        text_filename = f"{os.path.splitext(filename)[0]}.txt"
        text_path = os.path.join(TEXT_DIR, text_filename)
        
        if os.path.exists(text_path):
            with open(text_path, 'r', encoding='utf-8') as f:
                text = f.read()
            return jsonify({
                'filename': filename,
                'text': text,
                'length': len(text)
            })
        else:
            return jsonify({
                'filename': filename,
                'text': '',
                'message': 'No text extracted'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/print', methods=['POST'])
def trigger_print():
    """
    Trigger print command
    Expects: JSON with { "type": "blank" } or { "type": "file", "path": "..." }
    """
    try:
        data = request.get_json()
        print_type = data.get('type', 'blank')
        
        if print_type == 'blank':
            # Print blank page using blank.pdf
            blank_pdf = os.path.join(PRINT_DIR, 'blank.pdf')
            if os.path.exists(blank_pdf):
                # Use subprocess to print (Windows example)
                # subprocess.run(['print', blank_pdf], shell=True)
                print(f"Print triggered: {blank_pdf}")
                
                # Notify phone to capture
                socketio.emit('capture_now', {'message': 'Capture the printed document'})
                
                return jsonify({
                    'status': 'success',
                    'message': 'Print command sent'
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'blank.pdf not found'
                }), 404
        else:
            return jsonify({
                'status': 'error',
                'message': 'Invalid print type'
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# SOCKET.IO EVENTS
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')
    emit('connected', {'message': 'Connected to PrintChakra backend'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')

@socketio.on('ping')
def handle_ping():
    """Handle ping from client"""
    emit('pong', {'timestamp': datetime.now().isoformat()})

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("="*60)
    print("PrintChakra Backend Server")
    print("="*60)
    print(f"Upload directory: {UPLOAD_DIR}")
    print(f"Processed directory: {PROCESSED_DIR}")
    print(f"Text directory: {TEXT_DIR}")
    print("="*60)
    
    # Run with Socket.IO
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )
