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
import threading
import logging
import sys

# Fix Windows console encoding issues
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass  # Fallback if reconfigure not available

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Suppress verbose werkzeug logging (Flask request logs)
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Suppress Socket.IO logging
logging.getLogger('socketio').setLevel(logging.WARNING)
logging.getLogger('engineio').setLevel(logging.WARNING)

# Custom stderr filter to suppress ngrok malformed header errors
class NgrokStderrFilter:
    """Filter to suppress specific stderr messages from ngrok"""
    def __init__(self, stream):
        self.stream = stream
    
    def write(self, text):
        # Suppress "ERROR: Malformed header" messages from ngrok only
        if text.strip().startswith('ERROR:') and 'Malformed header' in text:
            return  # Silently discard
        # Write everything else normally
        self.stream.write(text)
        self.stream.flush()
    
    def flush(self):
        self.stream.flush()
    
    def isatty(self):
        return self.stream.isatty()

# Apply stderr filter after logging is configured
original_stderr = sys.stderr
sys.stderr = NgrokStderrFilter(original_stderr)

# Suppress stderr output for malformed header errors (ngrok proxy issue)
# Temporarily disabled to debug startup issues
# class ErrorFilter:
#     """Filter to suppress specific stderr messages"""
#     def __init__(self, stream):
#         self.stream = stream
#         self.buffer = []
    
#     def write(self, text):
#         # Suppress "ERROR: Malformed header" messages from ngrok
#         if 'Malformed header' in text:
#             return  # Silently discard
#         if text.strip().startswith('ERROR:') and 'Malformed' in text:
#             return  # Silently discard
#         # Write everything else
#         self.stream.write(text)
#         self.stream.flush()
    
#     def flush(self):
#         self.stream.flush()

# Apply stderr filter
# sys.stderr = ErrorFilter(sys.stderr)  # Disabled for debugging

# Import new modular pipeline
try:
    from modules import DocumentPipeline, create_default_pipeline, validate_image_file
    from modules.document_detection import DocumentDetector, detect_and_serialize
    MODULES_AVAILABLE = True
    print("✅ All modules loaded successfully")
except ImportError as ie:
    MODULES_AVAILABLE = False
    print(f"⚠️ Module import failed: {ie}")
    print("   This is OK - basic processing will work, advanced features disabled")
except Exception as e:
    MODULES_AVAILABLE = False
    print(f"⚠️ Unexpected module error: {e}")
    import traceback
    traceback.print_exc()

# Initialize Flask app
app = Flask(__name__)

# Custom error handler for malformed requests (from ngrok)
@app.errorhandler(400)
def handle_bad_request(e):
    """Silently handle malformed requests from ngrok proxy"""
    # Don't log these - they're just ngrok proxy issues
    return jsonify({"error": "Bad request"}), 400

# Suppress Flask's default error logging for 400 errors
from werkzeug.exceptions import BadRequest
app.config['TRAP_BAD_REQUEST_ERRORS'] = True

# Configure CORS for frontend - Allow all origins for flexibility
CORS(app, resources={
    r"/*": {
        "origins": "*",  # Allow all origins - ngrok domains change frequently
        "methods": ["GET", "POST", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
        "expose_headers": ["Content-Type", "Content-Disposition"],
        "supports_credentials": False,
        "max_age": 3600
    }
})

# Initialize Socket.IO with comprehensive CORS configuration
socketio = SocketIO(
    app, 
    cors_allowed_origins=[
        "https://printchakra.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://freezingly-nonsignificative-edison.ngrok-free.dev",
        "*"  # Allow all origins as fallback
    ],
    async_mode='threading',
    logger=False,  # Disable socket.io logger to reduce noise
    engineio_logger=False,
    ping_timeout=120,
    ping_interval=30,
    max_http_buffer_size=1e7,
    upgrade=False,  # Disable upgrade to avoid WebSocket issues
    transports=['polling', 'websocket'],
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

# Processing status tracking (in-memory)
# Format: { 'filename': { 'step': 1, 'total_steps': 12, 'stage_name': '...', 'is_complete': False, 'error': None } }
processing_status = {}
processing_lock = threading.Lock()

def update_processing_status(filename, step, total_steps, stage_name, is_complete=False, error=None):
    """Update processing status for a file"""
    with processing_lock:
        processing_status[filename] = {
            'step': step,
            'total_steps': total_steps,
            'stage_name': stage_name,
            'is_complete': is_complete,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }

def get_processing_status(filename):
    """Get processing status for a file"""
    with processing_lock:
        return processing_status.get(filename)

def clear_processing_status(filename):
    """Clear processing status for a file after completion"""
    with processing_lock:
        if filename in processing_status:
            del processing_status[filename]

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

# Middleware to add security headers to all responses
@app.after_request
def after_request(response):
    """Add security headers to all responses (CORS handled by Flask-CORS)"""
    # Don't add CORS headers here - Flask-CORS already handles them
    # Adding them again causes: "contains multiple values '*, *'"
    
    # Security headers only
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    
    return response

# ============================================================================
# FALLBACK QUALITY CHECK FUNCTION (for when modules unavailable)
# ============================================================================

def perform_basic_quality_check(image_path):
    """
    Basic quality check fallback using OpenCV
    Returns blur and focus scores
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return {
                'blur_score': 0,
                'is_blurry': False,
                'focus_score': 100,
                'is_focused': True,
                'quality': {'overall_acceptable': True, 'issues': [], 'recommendations': []}
            }
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate Laplacian variance (blur detection)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(100, max(0, laplacian_var / 1.5))
        is_blurry = blur_score < 50
        
        # Image brightness check
        mean_brightness = np.mean(gray)
        brightness_issues = []
        if mean_brightness < 50:
            brightness_issues.append('Image too dark')
        elif mean_brightness > 200:
            brightness_issues.append('Image too bright')
        
        overall_acceptable = not is_blurry and len(brightness_issues) == 0
        
        return {
            'blur_score': float(blur_score),
            'is_blurry': bool(is_blurry),
            'focus_score': float(100 - blur_score),
            'is_focused': not is_blurry,
            'quality': {
                'overall_acceptable': overall_acceptable,
                'issues': brightness_issues,
                'recommendations': ['Ensure good lighting'] if brightness_issues else []
            }
        }
    except Exception as e:
        print(f"Basic quality check error: {e}")
        return {
            'blur_score': 0,
            'is_blurry': False,
            'focus_score': 100,
            'is_focused': True,
            'quality': {'overall_acceptable': True, 'issues': [], 'recommendations': []}
        }

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

def order_points(pts):
    """Order points in order: top-left, top-right, bottom-right, bottom-left"""
    rect = np.zeros((4, 2), dtype="float32")
    
    # Sum: top-left will have smallest sum, bottom-right largest
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    
    # Diff: top-right will have smallest diff, bottom-left largest
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    
    return rect

def four_point_transform(image, pts):
    """Apply perspective transform to get bird's-eye view"""
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    
    # Calculate width
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    
    # Calculate height
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    
    # Destination points
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    
    # Perspective transform
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    
    return warped

def find_document_contour(image):
    """Find document contour using multi-strategy approach"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Try Canny edge detection
    edges = cv2.Canny(blurred, 75, 200)
    edges = cv2.dilate(edges, np.ones((3, 3)), iterations=1)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    # Find largest contour
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    
    for contour in contours[:10]:
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            image_area = image.shape[0] * image.shape[1]
            area_ratio = area / image_area
            
            # Accept if reasonable size
            if 0.1 <= area_ratio <= 0.9:
                return approx.reshape(4, 2).astype(np.float32)
    
    return None

def process_document_image(input_path, output_path, filename=None):
    """
    Complete document processing pipeline - EXACT COPY FROM NOTEBOOK
    Pipeline stages:
    1. Load Image
    2. Document Detection & Perspective Transform
    3. Grayscale Conversion
    4. Gaussian Blur
    5. Edge Detection (Canny)
    6. Binary Thresholding
    7. Morphological Operations
    8. Contour Detection
    9. Image Resizing
    10. Brightness & Contrast Enhancement
    11. Advanced OCR
    12. Save Output
    """
    try:
        # Helper function to emit progress
        def emit_progress(step, stage_name, message):
            progress_data = {
                'step': step,
                'total_steps': 12,
                'stage_name': stage_name,
                'message': message
            }
            socketio.emit('processing_progress', progress_data)
            if filename:
                update_processing_status(filename, step, 12, stage_name)
        
        # Step 1: Load Image
        print(f"\n[STEP 1/12] Load Image")
        emit_progress(1, 'Load Image', 'Loading image from disk...')
        
        original_image = cv2.imread(input_path)
        if original_image is None:
            raise ValueError(f"Could not read image from {input_path}")
        
        print(f"  ✓ Image loaded: {original_image.shape}")
        
        # Step 2: Document Detection & Perspective Transform
        print(f"[STEP 2/12] Document Detection & Perspective Transform")
        emit_progress(2, 'Document Detection', 'Detecting document boundaries...')
        
        doc_contour = find_document_contour(original_image)
        if doc_contour is not None:
            warped = four_point_transform(original_image, doc_contour)
            print(f"  ✓ Document detected and warped: {warped.shape}")
        else:
            warped = original_image.copy()
            print(f"  ⚠ No document detected, using original image")
        
        # Step 3: Grayscale Conversion
        print(f"[STEP 3/12] Grayscale Conversion")
        emit_progress(3, 'Grayscale Conversion', 'Converting to grayscale...')
        
        gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
        print(f"  ✓ Converted to grayscale: {gray.shape}")
        
        # Step 4: Gaussian Blur
        print(f"[STEP 4/12] Gaussian Blur")
        emit_progress(4, 'Gaussian Blur', 'Applying blur to reduce noise...')
        
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        print(f"  ✓ Blur applied: {blurred.shape}")
        
        # Step 5: Edge Detection (Canny)
        print(f"[STEP 5/12] Edge Detection (Canny)")
        emit_progress(5, 'Edge Detection', 'Finding document edges...')
        
        edges = cv2.Canny(blurred, 50, 150)
        print(f"  ✓ Edges detected: {np.count_nonzero(edges)} edge pixels")
        
        # Step 6: Binary Thresholding
        print(f"[STEP 6/12] Binary Thresholding")
        emit_progress(6, 'Binary Thresholding', 'Creating binary image...')
        
        threshold_value, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        print(f"  ✓ Threshold applied (value={threshold_value:.0f}): {binary.shape}")
        
        # Step 7: Morphological Operations
        print(f"[STEP 7/12] Morphological Operations")
        emit_progress(7, 'Morphological Operations', 'Cleaning up image...')
        
        kernel = np.ones((3, 3), np.uint8)
        eroded = cv2.erode(binary, kernel, iterations=1)
        dilated = cv2.dilate(eroded, kernel, iterations=1)
        print(f"  ✓ Morphology applied: {dilated.shape}")
        
        # Step 8: Contour Detection
        print(f"[STEP 8/12] Contour Detection")
        emit_progress(8, 'Contour Detection', 'Detecting contours...')
        
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        print(f"  ✓ Found {len(contours)} contours")
        
        # Step 9: Image Resizing
        print(f"[STEP 9/12] Image Resizing")
        emit_progress(9, 'Image Resizing', 'Resizing to optimal dimensions...')
        
        target_width = 800
        if gray.shape[1] > target_width:
            aspect_ratio = target_width / gray.shape[1]
            new_height = int(gray.shape[0] * aspect_ratio)
            gray = cv2.resize(gray, (target_width, new_height), interpolation=cv2.INTER_AREA)
            print(f"  ✓ Resized to: {gray.shape}")
        else:
            print(f"  ✓ Image already optimal size: {gray.shape}")
        
        # Step 10: Brightness & Contrast Enhancement
        print(f"[STEP 10/12] Brightness & Contrast Enhancement")
        emit_progress(10, 'Brightness & Contrast', 'Enhancing image clarity...')
        
        # Adjustable parameters from notebook
        brightness_boost = 25
        equalization_strength = 0.4
        clahe_clip_limit = 2.0
        clahe_tile_size = 8
        
        # Brightness boost
        brightened = cv2.convertScaleAbs(gray, alpha=1.0, beta=brightness_boost)
        
        # Blended equalization
        equalized_full = cv2.equalizeHist(brightened)
        equalized_gentle = cv2.addWeighted(brightened, 1.0 - equalization_strength, 
                                           equalized_full, equalization_strength, 0)
        
        # CLAHE for local contrast
        clahe = cv2.createCLAHE(clipLimit=clahe_clip_limit, 
                                tileGridSize=(clahe_tile_size, clahe_tile_size))
        equalized_clahe = clahe.apply(equalized_gentle)
        
        # Final blend
        enhanced = cv2.addWeighted(equalized_gentle, 0.5, equalized_clahe, 0.5, 0)
        print(f"  ✓ Enhancement complete: brightness +{brightness_boost}, contrast improved")
        
        # Step 11: Advanced OCR
        print(f"[STEP 11/12] Advanced OCR")
        emit_progress(11, 'OCR Processing', 'Extracting text with multiple strategies...')
        
        # Try multiple OCR configurations
        ocr_results = []
        try:
            # PSM 3: Fully automatic page segmentation
            custom_config1 = r'--oem 3 --psm 3'
            text1 = pytesseract.image_to_string(enhanced, lang='eng', config=custom_config1)
            ocr_results.append(('PSM 3', text1, len(text1.strip())))
            
            # PSM 6: Assume uniform block of text
            custom_config2 = r'--oem 3 --psm 6'
            text2 = pytesseract.image_to_string(enhanced, lang='eng', config=custom_config2)
            ocr_results.append(('PSM 6', text2, len(text2.strip())))
            
            # PSM 4: Single column
            custom_config3 = r'--oem 3 --psm 4'
            text3 = pytesseract.image_to_string(enhanced, lang='eng', config=custom_config3)
            ocr_results.append(('PSM 4', text3, len(text3.strip())))
            
            # Pick the result with most characters (usually best)
            best_config, best_text, best_length = max(ocr_results, key=lambda x: x[2])
            text = best_text
            
            print(f"  ✓ OCR complete: {best_length} characters extracted ({best_config})")
            
        except Exception as ocr_error:
            print(f"  ⚠ OCR failed: {ocr_error}")
            text = ""
        
        # Step 12: Save Output
        print(f"[STEP 12/12] Save Output")
        emit_progress(12, 'Save Output', 'Saving processed image to disk...')
        
        # Save processed image with high quality (matching notebook quality 95)
        cv2.imwrite(output_path, enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  ✓ Image saved: {output_path}")
        
        # Save extracted text
        if text and text.strip():
            text_output_path = output_path.replace('.jpg', '.txt').replace('.png', '.txt').replace('.jpeg', '.txt')
            text_output_path = text_output_path.replace('/processed/', '/processed_text/')
            os.makedirs(os.path.dirname(text_output_path), exist_ok=True)
            with open(text_output_path, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"  ✓ Text saved: {text_output_path}")
        
        print(f"\n{'='*60}")
        print(f"✅ PROCESSING COMPLETE!")
        print(f"   Input: {input_path}")
        print(f"   Output: {output_path}")
        print(f"   Text extracted: {len(text)} characters")
        print(f"{'='*60}\n")
        
        # Emit completion
        socketio.emit('processing_complete', {
            'step': 12,
            'total_steps': 12,
            'stage_name': 'Complete',
            'message': 'Processing complete!',
            'text_length': len(text),
            'success': True
        })
        
        return True, text
        
    except Exception as e:
        print(f"❌ Processing error: {str(e)}")
        error_data = {
            'error': str(e),
            'message': 'Processing failed'
        }
        socketio.emit('processing_error', error_data)
        if filename:
            update_processing_status(filename, 12, 12, 'Error', is_complete=True, error=str(e))
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

@app.route('/favicon.ico')
def favicon():
    """Serve favicon to prevent 404 errors"""
    return '', 204  # No Content response

@app.route('/health')
def health():
    """Detailed health check"""
    tesseract_available = True
    try:
        pytesseract.get_tesseract_version()
    except:
        tesseract_available = False
    
    # Check module status
    detection_available = False
    try:
        if MODULES_AVAILABLE:
            from modules.document_detection import DocumentDetector
            detection_available = True
    except:
        pass
    
    return jsonify({
        'status': 'healthy',
        'service': 'PrintChakra Backend',
        'version': '2.0.0',
        'modules': {
            'advanced_pipeline': MODULES_AVAILABLE,
            'document_pipeline': doc_pipeline is not None,
            'document_detection': detection_available
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
    Handle image upload - returns immediately with upload info, processes in background
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
        processed_filename = f"processed_{filename}"
        
        print(f"\n{'='*70}")
        print(f"📤 UPLOAD INITIATED")
        print(f"  Filename: {filename}")
        print(f"  Size: {len(file.read())} bytes")
        file.seek(0)  # Reset file pointer
        print(f"{'='*70}")
        
        # Step 1: Save uploaded file immediately
        print("\n[UPLOAD] Saving uploaded file...")
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
        
        # Initialize processing status
        update_processing_status(processed_filename, 0, 12, 'Initializing', is_complete=False)
        
        # Return immediately with upload info
        response = {
            'status': 'uploaded',
            'success': True,
            'message': 'File uploaded successfully, processing started',
            'filename': processed_filename,
            'upload_filename': filename,
            'original': file.filename,
            'timestamp': timestamp,
            'processing': True
        }
        
        # Emit Socket.IO event for instant display
        try:
            socketio.emit('new_file', {
                'filename': processed_filename,
                'upload_filename': filename,
                'timestamp': timestamp,
                'processing': True,
                'has_text': False
            })
            print(f"  ✓ Socket.IO notification sent for instant display")
        except Exception as socket_error:
            print(f"  ⚠ Warning: Socket.IO notification failed: {str(socket_error)}")
        
        # Start background processing
        def background_process():
            try:
                processed_path = os.path.join(PROCESSED_DIR, processed_filename)
                
                # Process image with progress tracking
                success, text_or_error = process_document_image(
                    upload_path, 
                    processed_path,
                    processed_filename  # Pass filename for status tracking
                )
                
                if not success:
                    update_processing_status(processed_filename, 12, 12, 'Error', is_complete=True, error=text_or_error)
                    socketio.emit('processing_error', {
                        'filename': processed_filename,
                        'error': text_or_error
                    })
                    return
                
                # Save extracted text
                text_filename = f"{os.path.splitext(processed_filename)[0]}.txt"
                text_path = os.path.join(TEXT_DIR, text_filename)
                
                try:
                    with open(text_path, 'w', encoding='utf-8') as f:
                        f.write(text_or_error)
                    print(f"  ✓ Text saved: {text_path}")
                except Exception as text_error:
                    print(f"  ⚠ Warning: Failed to save text file: {str(text_error)}")
                
                # Mark as complete
                update_processing_status(processed_filename, 12, 12, 'Complete', is_complete=True)
                
                # Notify completion
                socketio.emit('processing_complete', {
                    'filename': processed_filename,
                    'has_text': len(text_or_error) > 0,
                    'text_length': len(text_or_error)
                })
                
                print(f"\n✅ Background processing completed for {processed_filename}")
                
                # Clear status after 60 seconds
                threading.Timer(60.0, lambda: clear_processing_status(processed_filename)).start()
                
            except Exception as e:
                error_msg = f"Background processing error: {str(e)}"
                print(f"❌ {error_msg}")
                update_processing_status(processed_filename, 12, 12, 'Error', is_complete=True, error=error_msg)
                socketio.emit('processing_error', {
                    'filename': processed_filename,
                    'error': error_msg
                })
        
        # Start processing in background thread
        thread = threading.Thread(target=background_process)
        thread.daemon = True
        thread.start()
        
        print(f"\n✅ Upload response sent, processing started in background")
        return jsonify(response)
            
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(f"\n❌ {error_msg}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': error_msg, 'success': False}), 500
        
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
    """List all processed files with processing status"""
    try:
        files = []
        
        # First, add files that are currently being processed (uploaded but not yet in processed dir)
        for filename in list(processing_status.keys()):
            status = get_processing_status(filename)
            if status and not status['is_complete']:
                # Get the upload filename (without "processed_" prefix)
                upload_filename = filename.replace('processed_', '')
                upload_path = os.path.join(UPLOAD_DIR, upload_filename)
                
                if os.path.exists(upload_path):
                    file_stat = os.stat(upload_path)
                    files.append({
                        'filename': filename,
                        'size': file_stat.st_size,
                        'created': datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                        'has_text': False,
                        'processing': True,
                        'processing_step': status['step'],
                        'processing_total': status['total_steps'],
                        'processing_stage': status['stage_name']
                    })
        
        # Then add all processed files
        for filename in os.listdir(PROCESSED_DIR):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                file_path = os.path.join(PROCESSED_DIR, filename)
                file_stat = os.stat(file_path)
                
                # Check if text file exists
                text_filename = f"{os.path.splitext(filename)[0]}.txt"
                text_path = os.path.join(TEXT_DIR, text_filename)
                has_text = os.path.exists(text_path)
                
                # Check if still processing (edge case where file exists but processing not complete)
                status = get_processing_status(filename)
                is_processing = status and not status['is_complete']
                
                file_info = {
                    'filename': filename,
                    'size': file_stat.st_size,
                    'created': datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
                    'has_text': has_text,
                    'processing': is_processing
                }
                
                if is_processing:
                    file_info['processing_step'] = status['step']
                    file_info['processing_total'] = status['total_steps']
                    file_info['processing_stage'] = status['stage_name']
                
                files.append(file_info)
        
        # Sort by creation time (newest first)
        files.sort(key=lambda x: x['created'], reverse=True)
        
        return jsonify({'files': files, 'count': len(files)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/processing-status/<filename>')
def get_file_processing_status(filename):
    """Get processing status for a specific file"""
    try:
        status = get_processing_status(filename)
        if status:
            return jsonify({
                'processing': not status['is_complete'],
                'step': status['step'],
                'total_steps': status['total_steps'],
                'stage_name': status['stage_name'],
                'is_complete': status['is_complete'],
                'error': status.get('error'),
                'timestamp': status['timestamp']
            })
        else:
            # No processing status - file either complete or doesn't exist
            return jsonify({
                'processing': False,
                'is_complete': True
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/processed/<filename>', methods=['GET', 'OPTIONS'])
def get_processed_file(filename):
    """Serve processed image file with CORS headers and caching support"""
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response, 200
    
    try:
        # Security: prevent directory traversal
        if '..' in filename or '/' in filename:
            return jsonify({'error': 'Invalid filename'}), 400
        
        # Check if file exists
        file_path = os.path.join(PROCESSED_DIR, filename)
        if not os.path.exists(file_path):
            print(f"❌ File not found: {file_path}")
            return jsonify({'error': 'File not found'}), 404
        
        print(f"✅ Serving processed file: {filename}")
        response = send_from_directory(PROCESSED_DIR, filename)
        
        # Add comprehensive CORS and cache headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Type'
        response.headers['Cache-Control'] = 'public, max-age=3600'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Detect image type from extension
        if filename.lower().endswith('.png'):
            response.headers['Content-Type'] = 'image/png'
        elif filename.lower().endswith('.jpg') or filename.lower().endswith('.jpeg'):
            response.headers['Content-Type'] = 'image/jpeg'
        else:
            response.headers['Content-Type'] = 'image/jpeg'  # Default to JPEG
        
        return response
    except Exception as e:
        print(f"❌ File serving error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'File serving error: {str(e)}'}), 500

@app.route('/uploads/<filename>', methods=['GET', 'OPTIONS'])
def get_upload_file(filename):
    """Serve uploaded (preview) image file with CORS headers"""
    # Handle OPTIONS request
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response, 200
    
    try:
        # Security: prevent directory traversal
        if '..' in filename or '/' in filename:
            return jsonify({'error': 'Invalid filename'}), 400
        
        # Remove "processed_" prefix if present to get upload filename
        upload_filename = filename.replace('processed_', '')
        
        # Check if file exists
        file_path = os.path.join(UPLOAD_DIR, upload_filename)
        if not os.path.exists(file_path):
            print(f"❌ Upload file not found: {file_path}")
            return jsonify({'error': 'File not found'}), 404
        
        print(f"✅ Serving upload file: {upload_filename}")
        response = send_from_directory(UPLOAD_DIR, upload_filename)
        
        # Add comprehensive CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, ngrok-skip-browser-warning'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length, Content-Type'
        response.headers['Cache-Control'] = 'public, max-age=300'  # 5 min cache for previews
        response.headers['X-Content-Type-Options'] = 'nosniff'
        
        # Detect image type from extension
        if upload_filename.lower().endswith('.png'):
            response.headers['Content-Type'] = 'image/png'
        elif upload_filename.lower().endswith('.jpg') or upload_filename.lower().endswith('.jpeg'):
            response.headers['Content-Type'] = 'image/jpeg'
        else:
            response.headers['Content-Type'] = 'image/jpeg'  # Default to JPEG
        
        return response
    except Exception as e:
        print(f"❌ Upload file serving error: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': f'File serving error: {str(e)}'}), 500

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
    Returns blur and focus scores with fallback if modules unavailable
    """
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided'}), 400
        
        # Save temporarily
        temp_path = os.path.join(UPLOAD_DIR, f'temp_{uuid.uuid4()}.jpg')
        file.save(temp_path)
        
        try:
            # Try using new modular validation if available
            if MODULES_AVAILABLE:
                quality_result = validate_image_file(temp_path)
            else:
                # Fallback: basic quality check
                quality_result = perform_basic_quality_check(temp_path)
            
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return jsonify(quality_result)
        except Exception as module_error:
            print(f"Module quality validation error: {module_error}")
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)
            # Fallback to basic check
            quality_result = perform_basic_quality_check(temp_path) if os.path.exists(temp_path) else {
                'blur_score': 0,
                'is_blurry': False,
                'focus_score': 100,
                'is_focused': True,
                'quality': {'overall_acceptable': True, 'issues': [], 'recommendations': []}
            }
            return jsonify(quality_result)
        
    except Exception as e:
        print(f"Quality validation error: {e}")
        traceback.print_exc()
        return jsonify({'error': f'Validation failed: {str(e)}', 'quality': {'overall_acceptable': True, 'issues': [], 'recommendations': []}}), 200

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

@app.route('/detect/document', methods=['POST'])
def detect_document_borders():
    """
    Real-time document border detection
    Expects: multipart/form-data with 'file'
    Returns: Document corners in normalized coordinates [0-100]
    """
    try:
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file provided', 'success': False}), 400
        
        # Read file into memory
        file_bytes = file.read()
        
        # Check if detection is available
        if not MODULES_AVAILABLE:
            print("⚠️ Detection not available - performing basic detection")
            # Basic fallback: just detect if there's content
            return jsonify({
                'success': True,
                'corners': [],
                'message': 'Detection service initializing',
                'fallback': True
            })
        
        # Detect document
        try:
            result = detect_and_serialize(file_bytes)
            return jsonify(result)
        except Exception as detection_error:
            print(f"❌ Detection error: {str(detection_error)}")
            # Return success anyway to not break UI
            return jsonify({
                'success': True,
                'corners': [],
                'message': f'Detection unavailable: {str(detection_error)}',
                'fallback': True
            })
        
    except Exception as e:
        print(f"Document detection endpoint error: {str(e)}")
        return jsonify({
            'success': True,
            'error': str(e),
            'corners': [],
            'fallback': True
        }), 200  # Return 200 to not break frontend

@socketio.on('detect_frame')
def handle_frame_detection(data):
    """
    Real-time frame detection via WebSocket
    Expects: base64 encoded image data
    Emits: detection result with corners
    """
    try:
        if not MODULES_AVAILABLE:
            emit('detection_result', {
                'success': False,
                'message': 'Detection service unavailable'
            })
            return
        
        # Decode base64 image
        import base64
        import io
        from PIL import Image as PILImage
        
        image_data = data.get('image')
        if not image_data:
            emit('detection_result', {'success': False, 'message': 'No image data'})
            return
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        
        # Detect
        result = detect_and_serialize(image_bytes)
        
        # Emit result
        emit('detection_result', result)
        
    except Exception as e:
        print(f"Frame detection error: {str(e)}")
        emit('detection_result', {
            'success': False,
            'message': f'Detection error: {str(e)}'
        })
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

# ============================================================================
# SOCKET.IO HANDLERS
# ============================================================================

@socketio.on('connect')
def handle_connect():
    """Handle client connection - keep it absolutely simple"""
    print(f'✅ Socket connected: {request.sid}')
    return True

@socketio.on('error')  
def error_handler(e):
    """Handle errors"""
    print(f'Socket error: {e}')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Socket disconnected: {request.sid}')

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
        debug=True,  # Re-enabled
        allow_unsafe_werkzeug=True
    )
