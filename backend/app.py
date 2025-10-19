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
import traceback

# Import new modular pipeline
try:
    from modules import DocumentPipeline, create_default_pipeline, validate_image_file
    MODULES_AVAILABLE = True
except ImportError:
    MODULES_AVAILABLE = False
    print("Warning: New modules not available, using legacy processing")

# Initialize Flask app
app = Flask(__name__)

# Configure CORS for frontend
CORS(app, resources={
    r"/*": {
        "origins": ["https://printchakra.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000", "https://freezingly-nonsignificative-edison.ngrok-free.dev"],
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": False
    }
})

# Initialize Socket.IO with same CORS settings and better configuration
socketio = SocketIO(
    app, 
    cors_allowed_origins=["https://printchakra.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000", "https://freezingly-nonsignificative-edison.ngrok-free.dev"],
    async_mode='threading',
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25
)

# Base directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Directories for file storage
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
PROCESSED_DIR = os.path.join(BASE_DIR, 'processed')
TEXT_DIR = os.path.join(BASE_DIR, 'processed_text')
PRINT_DIR = os.path.join(BASE_DIR, 'print_scripts')
PDF_DIR = os.path.join(BASE_DIR, 'pdfs')

# Create directories if they don't exist
for directory in [UPLOAD_DIR, PROCESSED_DIR, TEXT_DIR, PRINT_DIR, PDF_DIR]:
    os.makedirs(directory, exist_ok=True)

# Initialize new document pipeline
if MODULES_AVAILABLE:
    try:
        pipeline_config = {
            'blur_threshold': 100.0,
            'focus_threshold': 50.0,
            'ocr_language': 'eng',
            'ocr_psm': 3,
            'ocr_oem': 3,
            'storage_dir': PROCESSED_DIR
        }
        doc_pipeline = create_default_pipeline(storage_dir=PROCESSED_DIR)
        print("✅ New modular pipeline initialized successfully")
    except Exception as e:
        print(f"⚠️ Pipeline initialization error: {e}")
        doc_pipeline = None
        MODULES_AVAILABLE = False
else:
    doc_pipeline = None

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
        'features': {
            'basic_processing': True,
            'advanced_pipeline': MODULES_AVAILABLE,
            'ocr': True,
            'socket_io': True,
            'pdf_export': MODULES_AVAILABLE,
            'document_classification': MODULES_AVAILABLE,
            'quality_validation': MODULES_AVAILABLE,
            'batch_processing': MODULES_AVAILABLE
        },
        'endpoints': {
            'health': '/health',
            'upload': '/upload',
            'files': '/files',
            'processed': '/processed/<filename>',
            'delete': '/delete/<filename>',
            'print': '/print',
            'ocr': '/ocr/<filename>',
            'advanced': {
                'process': '/process/advanced',
                'validate_quality': '/validate/quality',
                'export_pdf': '/export/pdf',
                'classify': '/classify/document',
                'batch': '/batch/process',
                'pipeline_info': '/pipeline/info'
            }
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
        'modules': {
            'advanced_pipeline': MODULES_AVAILABLE,
            'document_pipeline': doc_pipeline is not None
        },
        'directories': {
            'uploads': os.path.exists(UPLOAD_DIR),
            'processed': os.path.exists(PROCESSED_DIR),
            'text': os.path.exists(TEXT_DIR),
            'pdfs': os.path.exists(PDF_DIR)
        },
        'features': {
            'tesseract_ocr': tesseract_available,
            'image_processing': True,
            'socket_io': True,
            'blur_detection': MODULES_AVAILABLE,
            'edge_detection': MODULES_AVAILABLE,
            'perspective_correction': MODULES_AVAILABLE,
            'clahe_enhancement': MODULES_AVAILABLE,
            'document_classification': MODULES_AVAILABLE and doc_pipeline and doc_pipeline.classifier.is_trained if doc_pipeline else False,
            'pdf_export': MODULES_AVAILABLE,
            'cloud_storage': False,  # Not yet configured
            'auto_naming': MODULES_AVAILABLE,
            'compression': MODULES_AVAILABLE
        }
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    """
    Handle image upload and processing with sequential steps and comprehensive logging
    Expects: multipart/form-data with 'file' or 'photo' field
    """
    try:
        # Accept both 'file' and 'photo' field names
        file = request.files.get('file') or request.files.get('photo')
        
        if not file:
            print("❌ Upload error: No file in request")
            return jsonify({'error': 'No file provided', 'success': False}), 400
        
        if file.filename == '':
            print("❌ Upload error: Empty filename")
            return jsonify({'error': 'Empty filename', 'success': False}), 400
        
        # Generate unique filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        original_ext = os.path.splitext(file.filename)[1]
        if not original_ext:
            original_ext = '.jpg'
        filename = f"doc_{timestamp}_{unique_id}{original_ext}"
        
        print(f"\n{'='*70}")
        print(f"📤 UPLOAD INITIATED")
        print(f"  Filename: {filename}")
        print(f"  Size: {len(file.read())} bytes")
        file.seek(0)  # Reset file pointer
        print(f"{'='*70}")
        
        # Step 1: Save uploaded file
        print("\n[STEP 1] Saving uploaded file...")
        upload_path = os.path.join(UPLOAD_DIR, filename)
        file.save(upload_path)
        print(f"  ✓ File saved: {upload_path}")
        
        # Validate file exists and is readable
        if not os.path.exists(upload_path):
            error_msg = "File upload failed - file not found on disk"
            print(f"  ❌ {error_msg}")
            return jsonify({'error': error_msg, 'success': False}), 500
        
        file_size = os.path.getsize(upload_path)
        print(f"  ✓ Verified on disk: {file_size} bytes")
        
        # Step 2: Process image
        print("\n[STEP 2] Processing image...")
        processed_filename = f"processed_{filename}"
        processed_path = os.path.join(PROCESSED_DIR, processed_filename)
        
        try:
            success, text_or_error = process_document_image(upload_path, processed_path)
        except Exception as process_error:
            error_msg = f"Image processing failed: {str(process_error)}"
            print(f"  ❌ {error_msg}")
            return jsonify({
                'status': 'error',
                'message': error_msg,
                'success': False
            }), 500
        
        if not success:
            error_msg = f"Processing failed: {text_or_error}"
            print(f"  ❌ {error_msg}")
            return jsonify({
                'status': 'error',
                'message': text_or_error,
                'success': False
            }), 500
        
        print(f"  ✓ Image processed successfully")
        print(f"  ✓ Text extracted: {len(text_or_error)} characters")
        
        # Step 3: Save extracted text
        print("\n[STEP 3] Saving extracted text...")
        text_filename = f"{os.path.splitext(processed_filename)[0]}.txt"
        text_path = os.path.join(TEXT_DIR, text_filename)
        
        try:
            with open(text_path, 'w', encoding='utf-8') as f:
                f.write(text_or_error)
            print(f"  ✓ Text saved: {text_path}")
        except Exception as text_error:
            print(f"  ⚠ Warning: Failed to save text file: {str(text_error)}")
        
        # Step 4: Notify via Socket.IO
        print("\n[STEP 4] Notifying clients...")
        try:
            socketio.emit('new_file', {
                'filename': processed_filename,
                'timestamp': timestamp,
                'has_text': len(text_or_error) > 0,
                'text_length': len(text_or_error)
            })
            print(f"  ✓ Socket.IO notification sent")
        except Exception as socket_error:
            print(f"  ⚠ Warning: Socket.IO notification failed: {str(socket_error)}")
        
        # Step 5: Return success response
        print("\n[STEP 5] Building response...")
        response = {
            'status': 'success',
            'success': True,
            'message': 'File uploaded and processed successfully',
            'filename': processed_filename,
            'original': filename,
            'text_extracted': len(text_or_error) > 0,
            'text_length': len(text_or_error),
            'text_preview': text_or_error[:200] if len(text_or_error) > 200 else text_or_error
        }
        print(f"  ✓ Response built")
        
        print(f"\n{'='*70}")
        print(f"✅ UPLOAD COMPLETED SUCCESSFULLY")
        print(f"{'='*70}\n")
        
        return jsonify(response)
            
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"\n❌ {error_msg}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': error_msg, 'success': False}), 500

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
        
        return jsonify({'files': files, 'count': len(files)})
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
    Trigger print command and notify phone to capture
    Expects: JSON with { "type": "blank" } or { "type": "test" }
    """
    try:
        data = request.get_json() if request.is_json else {}
        print_type = data.get('type', 'blank')
        
        if print_type == 'test':
            # Test printer connection
            test_script = os.path.join(PRINT_DIR, 'create_blank_pdf.py')
            blank_pdf = os.path.join(PRINT_DIR, 'blank.pdf')
            
            # Create blank PDF if it doesn't exist
            if not os.path.exists(blank_pdf):
                if os.path.exists(test_script):
                    subprocess.run(['python', test_script], cwd=PRINT_DIR, check=True)
            
            return jsonify({
                'status': 'success',
                'message': 'Printer test: blank.pdf is ready',
                'pdf_exists': os.path.exists(blank_pdf)
            })
        
        elif print_type == 'blank':
            # Print blank page and trigger phone capture
            blank_pdf = os.path.join(PRINT_DIR, 'blank.pdf')
            
            if not os.path.exists(blank_pdf):
                return jsonify({
                    'status': 'error',
                    'message': 'blank.pdf not found. Run test printer first.'
                }), 404
            
            # Execute print using print-file.py
            print_script = os.path.join(PRINT_DIR, 'print-file.py')
            if os.path.exists(print_script):
                try:
                    # Run print script in background
                    subprocess.Popen(['python', print_script], cwd=PRINT_DIR)
                    print(f"Print triggered: {blank_pdf}")
                except Exception as print_error:
                    print(f"Print error: {str(print_error)}")
            
            # Notify phone to capture
            try:
                socketio.emit('capture_now', {
                    'message': 'Capture the printed document',
                    'timestamp': datetime.now().isoformat()
                })
                print("Capture notification sent to phone")
            except Exception as socket_error:
                print(f"Socket.IO error (non-critical): {str(socket_error)}")
            
            return jsonify({
                'status': 'success',
                'message': 'Print command sent and capture triggered'
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Invalid print type. Use "blank" or "test"'
            }), 400
            
    except Exception as e:
        print(f"Print error: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ADVANCED PROCESSING ENDPOINTS (New Modular System)
# ============================================================================

@app.route('/process/advanced', methods=['POST'])
def advanced_process():
    """
    Advanced document processing with sequential execution and comprehensive logging
    Expects: multipart/form-data with 'file' and optional processing options
    """
    if not MODULES_AVAILABLE or doc_pipeline is None:
        print("❌ Advanced processing not available")
        return jsonify({
            'error': 'Advanced processing not available',
            'message': 'Install required dependencies: pip install -r requirements.txt',
            'success': False
        }), 503
    
    try:
        file = request.files.get('file')
        if not file:
            print("❌ No file provided")
            return jsonify({'error': 'No file provided', 'success': False}), 400
        
        # Get processing options from form data
        options = {
            'auto_crop': request.form.get('auto_crop', 'true').lower() == 'true',
            'ai_enhance': request.form.get('ai_enhance', 'false').lower() == 'true',
            'export_pdf': request.form.get('export_pdf', 'false').lower() == 'true',
            'compress': request.form.get('compress', 'true').lower() == 'true',
            'compression_quality': int(request.form.get('compression_quality', '85')),
            'page_size': request.form.get('page_size', 'A4'),
            'strict_quality': request.form.get('strict_quality', 'false').lower() == 'true'
        }
        
        print(f"\n{'='*70}")
        print(f"🚀 ADVANCED PROCESSING INITIATED")
        print(f"  Options: {options}")
        print(f"{'='*70}")
        
        # Save uploaded file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        filename = f"doc_{timestamp}_{unique_id}.jpg"
        upload_path = os.path.join(UPLOAD_DIR, filename)
        
        print(f"\n[STEP 1] Saving upload...")
        file.save(upload_path)
        print(f"  ✓ Saved: {upload_path}")
        
        # Process using new pipeline
        print(f"\n[STEP 2] Processing with advanced pipeline...")
        result = doc_pipeline.process_document(
            upload_path,
            PROCESSED_DIR,
            options
        )
        
        # Emit Socket.IO event
        if result.get('success'):
            try:
                print(f"\n[STEP 3] Notifying clients...")
                socketio.emit('processing_complete', {
                    'filename': os.path.basename(result.get('processed_image', '')),
                    'text': result.get('text', '')[:500],  # Preview only
                    'document_type': result.get('document_type', 'UNKNOWN'),
                    'confidence': result.get('ocr_confidence', 0),
                    'quality': result.get('quality', {})
                })
                print(f"  ✓ Notification sent")
            except Exception as e:
                print(f"  ⚠ Socket.IO notification failed: {e}")
        else:
            print(f"\n❌ Processing failed: {result.get('error')}")
        
        print(f"\n{'='*70}")
        print(f"✅ ADVANCED PROCESSING COMPLETED")
        print(f"{'='*70}\n")
        
        return jsonify(result)
        
    except Exception as e:
        error_msg = f"Advanced processing error: {str(e)}"
        print(f"\n❌ {error_msg}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': error_msg,
            'traceback': traceback.format_exc()
        }), 500

@app.route('/validate/quality', methods=['POST'])
def validate_quality():
    """
    Validate image quality before processing
    Returns blur and focus scores
    """
    if not MODULES_AVAILABLE:
        return jsonify({'error': 'Quality validation not available'}), 503
    
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400
        
        # Save temporarily
        temp_path = os.path.join(UPLOAD_DIR, f'temp_{uuid.uuid4()}.jpg')
        file.save(temp_path)
        
        # Validate quality
        quality_result = validate_image_file(temp_path)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify(quality_result)
        
    except Exception as e:
        print(f"Quality validation error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/export/pdf', methods=['POST'])
def export_pdf():
    """
    Export processed images to PDF
    Expects: JSON with 'filenames' array and optional 'page_size'
    """
    if not MODULES_AVAILABLE or doc_pipeline is None:
        return jsonify({'error': 'PDF export not available'}), 503
    
    try:
        data = request.get_json()
        filenames = data.get('filenames', [])
        page_size = data.get('page_size', 'A4')
        
        if not filenames:
            return jsonify({'error': 'No filenames provided'}), 400
        
        # Build full paths
        image_paths = [os.path.join(PROCESSED_DIR, f) for f in filenames]
        
        # Validate all files exist
        for path in image_paths:
            if not os.path.exists(path):
                return jsonify({'error': f'File not found: {os.path.basename(path)}'}), 404
        
        # Generate PDF filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        pdf_filename = f"document_{timestamp}.pdf"
        pdf_path = os.path.join(PDF_DIR, pdf_filename)
        
        # Export to PDF
        success = doc_pipeline.exporter.export_to_pdf(
            image_paths,
            pdf_path,
            page_size=page_size
        )
        
        if success:
            return jsonify({
                'success': True,
                'pdf_filename': pdf_filename,
                'pdf_url': f'/pdf/{pdf_filename}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'PDF generation failed'
            }), 500
            
    except Exception as e:
        print(f"PDF export error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/pdf/<filename>')
def serve_pdf(filename):
    """Serve generated PDF files"""
    return send_from_directory(PDF_DIR, filename)

@app.route('/pipeline/info')
def pipeline_info():
    """Get information about the processing pipeline"""
    if not MODULES_AVAILABLE or doc_pipeline is None:
        return jsonify({
            'available': False,
            'message': 'Advanced pipeline not initialized'
        })
    
    try:
        info = doc_pipeline.get_pipeline_info()
        info['available'] = True
        return jsonify(info)
    except Exception as e:
        return jsonify({
            'available': False,
            'error': str(e)
        })

@app.route('/classify/document', methods=['POST'])
def classify_document():
    """
    Classify document type
    Expects: multipart/form-data with 'file'
    """
    if not MODULES_AVAILABLE or doc_pipeline is None:
        return jsonify({'error': 'Document classification not available'}), 503
    
    if not doc_pipeline.classifier.is_trained:
        return jsonify({
            'error': 'Classifier not trained',
            'message': 'Please train the classifier first'
        }), 503
    
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400
        
        # Save temporarily
        temp_path = os.path.join(UPLOAD_DIR, f'temp_{uuid.uuid4()}.jpg')
        file.save(temp_path)
        
        # Read and classify
        image = cv2.imread(temp_path)
        doc_type, confidence = doc_pipeline.classifier.predict(image)
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return jsonify({
            'document_type': doc_type,
            'confidence': float(confidence),
            'all_types': doc_pipeline.classifier.DOCUMENT_TYPES
        })
        
    except Exception as e:
        print(f"Classification error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/batch/process', methods=['POST'])
def batch_process():
    """
    Process multiple files sequentially with comprehensive tracking and logging
    Expects: multipart/form-data with multiple 'files[]'
    """
    if not MODULES_AVAILABLE or doc_pipeline is None:
        return jsonify({'error': 'Batch processing not available', 'success': False}), 503
    
    try:
        files = request.files.getlist('files[]')
        if not files:
            return jsonify({'error': 'No files provided', 'success': False}), 400
        
        print(f"\n{'='*70}")
        print(f"📦 BATCH PROCESSING INITIATED")
        print(f"  Files: {len(files)}")
        print(f"{'='*70}")
        
        # Get options
        options = {
            'auto_crop': request.form.get('auto_crop', 'true').lower() == 'true',
            'export_pdf': request.form.get('export_pdf', 'false').lower() == 'true',
            'compress': request.form.get('compress', 'true').lower() == 'true'
        }
        
        # Save all files sequentially
        print(f"\n[PHASE 1] Saving files...")
        upload_paths = []
        for i, file in enumerate(files, 1):
            try:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_id = str(uuid.uuid4())[:8]
                filename = f"batch_{timestamp}_{unique_id}.jpg"
                upload_path = os.path.join(UPLOAD_DIR, filename)
                file.save(upload_path)
                upload_paths.append(upload_path)
                print(f"  [{i}/{len(files)}] ✓ Saved: {filename}")
            except Exception as save_error:
                print(f"  [{i}/{len(files)}] ❌ Failed to save: {str(save_error)}")
        
        if not upload_paths:
            return jsonify({
                'success': False,
                'error': 'Failed to save any files',
                'total_files': len(files)
            }), 500
        
        print(f"\n[PHASE 2] Processing files...")
        # Batch process sequentially
        results = doc_pipeline.batch_process(upload_paths, PROCESSED_DIR, options)
        
        # Calculate statistics
        successful = sum(1 for r in results if r.get('success'))
        failed = len(results) - successful
        
        print(f"\n[PHASE 3] Building response...")
        response = {
            'success': True,
            'total_files': len(files),
            'successful': successful,
            'failed': failed,
            'success_rate': (successful / len(files) * 100) if len(files) > 0 else 0,
            'results': results
        }
        
        print(f"  ✓ Summary: {successful} successful, {failed} failed")
        print(f"\n{'='*70}")
        print(f"✅ BATCH PROCESSING COMPLETED")
        print(f"{'='*70}\n")
        
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Batch processing error: {str(e)}"
        print(f"\n❌ {error_msg}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': error_msg,
            'traceback': traceback.format_exc()
        }), 500

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
