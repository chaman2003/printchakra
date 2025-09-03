from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pymongo import MongoClient
from gridfs import GridFS
import jwt
import hashlib
from datetime import datetime, timedelta
from functools import wraps
import os
import cv2
import numpy as np
from PIL import Image
import pytesseract
import io
from werkzeug.utils import secure_filename
import logging

# PDF Processing imports
try:
    import PyPDF2
    from pdf2image import convert_from_bytes
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.utils import ImageReader
    import tempfile
    PDF_PROCESSING_AVAILABLE = True
except ImportError as e:
    logger.warning(f"PDF processing libraries not available: {e}")
    PDF_PROCESSING_AVAILABLE = False

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size for PDFs

# Enable CORS for all routes
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
try:
    client = MongoClient('mongodb+srv://test:123@cluster.6zvxtv7.mongodb.net/?retryWrites=true&w=majority&appName=cluster')
    db = client.printchakra
    fs = GridFS(db)
    documents_collection = db.documents
    users_collection = db.users
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")

# JWT token verification decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token.split(' ')[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated

# Image preprocessing function
def preprocess_image(image_bytes):
    """
    Preprocess image for better OCR results
    """
    try:
        # Convert bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up the image
        kernel = np.ones((1, 1), np.uint8)
        processed = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        processed = cv2.morphologyEx(processed, cv2.MORPH_OPEN, kernel)
        
        # Convert back to bytes
        _, buffer = cv2.imencode('.png', processed)
        return buffer.tobytes()
    
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return image_bytes

# PDF Processing Functions
def extract_text_from_pdf(pdf_bytes):
    """
    Extract text directly from PDF if it contains selectable text
    """
    if not PDF_PROCESSING_AVAILABLE:
        return ""
    
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        text_content = ""
        
        for page_num, page in enumerate(pdf_reader.pages):
            try:
                page_text = page.extract_text()
                if page_text.strip():
                    text_content += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
            except Exception as e:
                logger.warning(f"Failed to extract text from PDF page {page_num + 1}: {e}")
        
        return text_content.strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""

def convert_pdf_to_images(pdf_bytes):
    """
    Convert PDF pages to images for OCR processing
    """
    if not PDF_PROCESSING_AVAILABLE:
        return []
    
    try:
        # Convert PDF to images (200 DPI for good OCR quality)
        images = convert_from_bytes(pdf_bytes, dpi=200, fmt='PNG')
        
        image_bytes_list = []
        for i, image in enumerate(images):
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            image_bytes_list.append(img_byte_arr.getvalue())
        
        return image_bytes_list
    except Exception as e:
        logger.error(f"PDF to image conversion failed: {e}")
        return []

def process_pdf_document(pdf_bytes):
    """
    Comprehensive PDF processing: extract text and perform OCR if needed
    """
    results = {
        'direct_text': '',
        'ocr_text': '',
        'total_pages': 0,
        'processing_method': 'unknown'
    }
    
    if not PDF_PROCESSING_AVAILABLE:
        results['processing_method'] = 'pdf_libraries_unavailable'
        return results
    
    try:
        # First, try to extract text directly
        direct_text = extract_text_from_pdf(pdf_bytes)
        results['direct_text'] = direct_text
        
        # Convert PDF to images for OCR
        image_list = convert_pdf_to_images(pdf_bytes)
        results['total_pages'] = len(image_list)
        
        if direct_text.strip() and len(direct_text.strip()) > 50:
            # PDF has good selectable text
            results['processing_method'] = 'direct_text_extraction'
            return results
        else:
            # PDF is likely scanned or has poor text extraction, use OCR
            results['processing_method'] = 'ocr_processing'
            ocr_text_pages = []
            
            for i, image_bytes in enumerate(image_list):
                try:
                    # Preprocess image for better OCR
                    processed_image = preprocess_image(image_bytes)
                    
                    # Extract text using OCR
                    page_text = extract_text_from_image(processed_image)
                    if page_text.strip():
                        ocr_text_pages.append(f"\n--- Page {i + 1} ---\n{page_text}")
                except Exception as e:
                    logger.warning(f"OCR failed for PDF page {i + 1}: {e}")
                    ocr_text_pages.append(f"\n--- Page {i + 1} ---\n[OCR processing failed]")
            
            results['ocr_text'] = '\n'.join(ocr_text_pages)
            return results
    
    except Exception as e:
        logger.error(f"PDF processing failed: {e}")
        results['processing_method'] = 'error'
        return results

def create_pdf_from_images(image_bytes_list, title="PrintChakra Document"):
    """
    Create a PDF from a list of images
    """
    if not PDF_PROCESSING_AVAILABLE:
        return None
    
    try:
        pdf_buffer = io.BytesIO()
        c = canvas.Canvas(pdf_buffer, pagesize=A4)
        
        for i, image_bytes in enumerate(image_bytes_list):
            try:
                # Create PIL Image from bytes
                img = Image.open(io.BytesIO(image_bytes))
                
                # Calculate scaling to fit A4 page
                page_width, page_height = A4
                img_width, img_height = img.size
                
                # Scale to fit page while maintaining aspect ratio
                scale_w = (page_width - 72) / img_width  # 36pt margin on each side
                scale_h = (page_height - 72) / img_height
                scale = min(scale_w, scale_h)
                
                new_width = img_width * scale
                new_height = img_height * scale
                
                # Center the image on page
                x = (page_width - new_width) / 2
                y = (page_height - new_height) / 2
                
                # Add image to PDF
                img_buffer = io.BytesIO()
                img.save(img_buffer, format='PNG')
                img_buffer.seek(0)
                
                c.drawImage(ImageReader(img_buffer), x, y, width=new_width, height=new_height)
                
                if i < len(image_bytes_list) - 1:  # Add new page if not last image
                    c.showPage()
                    
            except Exception as e:
                logger.warning(f"Failed to add image {i + 1} to PDF: {e}")
        
        c.save()
        pdf_buffer.seek(0)
        return pdf_buffer.getvalue()
    
    except Exception as e:
        logger.error(f"PDF creation failed: {e}")
        return None

def get_file_type(filename, content_type=None):
    """
    Determine file type from filename and content type
    """
    filename = filename.lower()
    
    if filename.endswith('.pdf'):
        return 'pdf'
    elif filename.endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif')):
        return 'image'
    elif content_type:
        if 'pdf' in content_type:
            return 'pdf'
        elif 'image' in content_type:
            return 'image'
    
    return 'unknown'

# OCR function
def extract_text_from_image(image_bytes):
    """
    Extract text from image using Tesseract OCR
    """
    try:
        # Preprocess image
        processed_image = preprocess_image(image_bytes)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(processed_image))
        
        # Perform OCR
        custom_config = r'--oem 3 --psm 6 -l eng'
        text = pytesseract.image_to_string(image, config=custom_config)
        
        return text.strip()
    
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return ""

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        device_id = data.get('device_id')
        
        if not all([username, password, device_id]):
            return jsonify({'message': 'Missing required fields'}), 400
        
        # Check if user already exists
        if users_collection.find_one({'username': username}):
            return jsonify({'message': 'User already exists'}), 409
        
        # Hash password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        
        # Create user
        user_data = {
            'username': username,
            'password': hashed_password,
            'device_id': device_id,
            'created_at': datetime.utcnow()
        }
        
        result = users_collection.insert_one(user_data)
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': str(result.inserted_id)
        }), 201
    
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        return jsonify({'message': 'Internal server error'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'message': 'Missing credentials'}), 400
        
        # Find user
        user = users_collection.find_one({'username': username})
        if not user:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Verify password
        hashed_password = hashlib.sha256(password.encode()).hexdigest()
        if user['password'] != hashed_password:
            return jsonify({'message': 'Invalid credentials'}), 401
        
        # Generate JWT token
        payload = {
            'user_id': str(user['_id']),
            'username': username,
            'exp': datetime.utcnow() + timedelta(days=30)
        }
        
        token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user_id': str(user['_id']),
            'username': username
        }), 200
    
    except Exception as e:
        logger.error(f"Login failed: {e}")
        return jsonify({'message': 'Internal server error'}), 500

# Document routes
@app.route('/api/documents/upload', methods=['POST'])
@token_required
def upload_document(current_user_id):
    """Upload and process a document (images and PDFs)"""
    try:
        if 'file' not in request.files:
            return jsonify({'message': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'message': 'No file selected'}), 400
        
        # Read file data
        file_data = file.read()
        filename = secure_filename(file.filename)
        file_type = get_file_type(filename, file.content_type)
        
        logger.info(f"Processing {file_type} document: {filename}")
        start_time = datetime.utcnow()
        
        # Initialize processing results
        extracted_text = ""
        processing_details = {}
        dimensions = {'width': 0, 'height': 0}
        
        if file_type == 'pdf':
            # Process PDF document
            pdf_results = process_pdf_document(file_data)
            extracted_text = pdf_results['direct_text'] or pdf_results['ocr_text']
            processing_details = {
                'file_type': 'pdf',
                'total_pages': pdf_results['total_pages'],
                'processing_method': pdf_results['processing_method'],
                'has_direct_text': bool(pdf_results['direct_text']),
                'has_ocr_text': bool(pdf_results['ocr_text'])
            }
            
            # For PDFs, we don't have traditional image dimensions
            dimensions = {
                'width': 0, 
                'height': 0, 
                'pages': pdf_results['total_pages']
            }
            
        elif file_type == 'image':
            # Process image document
            extracted_text = extract_text_from_image(file_data)
            processing_details = {
                'file_type': 'image',
                'processing_method': 'ocr_processing'
            }
            
            # Get image dimensions
            try:
                image = Image.open(io.BytesIO(file_data))
                dimensions = {'width': image.width, 'height': image.height}
            except:
                dimensions = {'width': 0, 'height': 0}
                
        else:
            return jsonify({'message': 'Unsupported file type. Please upload PDF or image files.'}), 400
        
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Store file in GridFS
        file_id = fs.put(
            file_data,
            filename=filename,
            content_type=file.content_type or ('application/pdf' if file_type == 'pdf' else 'image/jpeg')
        )
        
        # Store document metadata
        document_data = {
            'filename': filename,
            'user_id': current_user_id,
            'file_id': file_id,
            'ocr_text': extracted_text,
            'captured_at': datetime.utcnow(),
            'device_id': request.json.get('device_id') if request.json else None,
            'metadata': {
                'file_size': len(file_data),
                'dimensions': dimensions,
                'processing_time': processing_time,
                'content_type': file.content_type or ('application/pdf' if file_type == 'pdf' else 'image/jpeg'),
                'file_type': file_type,
                'processing_details': processing_details
            }
        }
        
        result = documents_collection.insert_one(document_data)
        
        logger.info(f"Document processed successfully: {filename}")
        
        return jsonify({
            'message': 'Document uploaded and processed successfully',
            'document_id': str(result.inserted_id),
            'extracted_text': extracted_text[:500] + '...' if len(extracted_text) > 500 else extracted_text,
            'full_text_length': len(extracted_text),
            'processing_time': processing_time,
            'file_type': file_type,
            'processing_details': processing_details
        }), 201
    
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        return jsonify({'message': 'Failed to process document'}), 500

@app.route('/api/documents', methods=['GET'])
@token_required
def get_documents(current_user_id):
    """Get all documents for the current user"""
    try:
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        skip = (page - 1) * limit
        
        # Query documents
        documents = list(documents_collection.find(
            {'user_id': current_user_id}
        ).sort('captured_at', -1).skip(skip).limit(limit))
        
        # Convert ObjectId to string
        for doc in documents:
            doc['_id'] = str(doc['_id'])
            doc['file_id'] = str(doc['file_id'])
        
        # Get total count
        total_count = documents_collection.count_documents({'user_id': current_user_id})
        
        return jsonify({
            'documents': documents,
            'total_count': total_count,
            'page': page,
            'limit': limit,
            'total_pages': (total_count + limit - 1) // limit
        }), 200
    
    except Exception as e:
        logger.error(f"Failed to fetch documents: {e}")
        return jsonify({'message': 'Failed to fetch documents'}), 500

@app.route('/api/documents/<document_id>', methods=['GET'])
@token_required
def get_document(current_user_id, document_id):
    """Get a specific document"""
    try:
        from bson import ObjectId
        
        document = documents_collection.find_one({
            '_id': ObjectId(document_id),
            'user_id': current_user_id
        })
        
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        # Convert ObjectId to string
        document['_id'] = str(document['_id'])
        document['file_id'] = str(document['file_id'])
        
        return jsonify(document), 200
    
    except Exception as e:
        logger.error(f"Failed to fetch document: {e}")
        return jsonify({'message': 'Failed to fetch document'}), 500

@app.route('/api/documents/<document_id>/image', methods=['GET'])
@token_required
def get_document_image(current_user_id, document_id):
    """Get the image file for a document"""
    try:
        from bson import ObjectId
        
        # Find document
        document = documents_collection.find_one({
            '_id': ObjectId(document_id),
            'user_id': current_user_id
        })
        
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        # Get file from GridFS
        file_data = fs.get(ObjectId(document['file_id']))
        
        return send_file(
            io.BytesIO(file_data.read()),
            mimetype=document['metadata'].get('content_type', 'image/jpeg'),
            as_attachment=False
        )
    
    except Exception as e:
        logger.error(f"Failed to fetch document image: {e}")
        return jsonify({'message': 'Failed to fetch image'}), 500

@app.route('/api/documents/<document_id>', methods=['DELETE'])
@token_required
def delete_document(current_user_id, document_id):
    """Delete a document"""
    try:
        from bson import ObjectId
        
        # Find document
        document = documents_collection.find_one({
            '_id': ObjectId(document_id),
            'user_id': current_user_id
        })
        
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        # Delete file from GridFS
        fs.delete(ObjectId(document['file_id']))
        
        # Delete document from collection
        documents_collection.delete_one({'_id': ObjectId(document_id)})
        
        return jsonify({'message': 'Document deleted successfully'}), 200
    
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        return jsonify({'message': 'Failed to delete document'}), 500

@app.route('/api/documents/<document_id>/convert', methods=['POST'])
@token_required
def convert_document(current_user_id, document_id):
    """Convert document to different format"""
    try:
        from bson import ObjectId
        import json
        
        # Get conversion format from request
        data = request.get_json()
        target_format = data.get('format', 'pdf').lower()
        
        if target_format not in ['pdf', 'txt', 'json']:
            return jsonify({'message': 'Unsupported format. Supported: pdf, txt, json'}), 400
        
        # Find document
        document = documents_collection.find_one({
            '_id': ObjectId(document_id),
            'user_id': current_user_id
        })
        
        if not document:
            return jsonify({'message': 'Document not found'}), 404
        
        # Get original file data
        file_data = fs.get(ObjectId(document['file_id']))
        original_data = file_data.read()
        
        # Get original filename without extension
        original_name = document['filename']
        if '.' in original_name:
            original_name = original_name.rsplit('.', 1)[0]
        
        if target_format == 'txt':
            # Return extracted text as downloadable file
            text_content = document.get('ocr_text', '')
            
            response = send_file(
                io.BytesIO(text_content.encode('utf-8')),
                mimetype='text/plain',
                as_attachment=True,
                download_name=f"{original_name}.txt"
            )
            response.headers['Content-Disposition'] = f'attachment; filename="{original_name}.txt"'
            return response
            
        elif target_format == 'json':
            # Return document metadata and text as JSON
            export_data = {
                'filename': document['filename'],
                'captured_at': document['captured_at'].isoformat() if document.get('captured_at') else None,
                'extracted_text': document.get('ocr_text', ''),
                'metadata': document.get('metadata', {}),
                'file_size': document['metadata'].get('file_size', 0),
                'processing_time': document['metadata'].get('processing_time', 0),
                'file_type': document['metadata'].get('file_type', 'unknown'),
                'processing_details': document['metadata'].get('processing_details', {})
            }
            
            json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
            
            response = send_file(
                io.BytesIO(json_content.encode('utf-8')),
                mimetype='application/json',
                as_attachment=True,
                download_name=f"{original_name}.json"
            )
            response.headers['Content-Disposition'] = f'attachment; filename="{original_name}.json"'
            return response
            
        elif target_format == 'pdf':
            # Convert to PDF if not already
            current_type = document['metadata'].get('file_type', 'image')
            
            if current_type == 'pdf':
                # Already PDF, return original
                response = send_file(
                    io.BytesIO(original_data),
                    mimetype='application/pdf',
                    as_attachment=True,
                    download_name=document['filename']
                )
                response.headers['Content-Disposition'] = f'attachment; filename="{document["filename"]}"'
                return response
            else:
                # Convert image to PDF
                try:
                    # Convert image bytes to PIL Image
                    image = Image.open(io.BytesIO(original_data))
                    
                    # Create PDF from image
                    pdf_buffer = io.BytesIO()
                    image.save(pdf_buffer, format='PDF', resolution=300)
                    pdf_data = pdf_buffer.getvalue()
                    
                    response = send_file(
                        io.BytesIO(pdf_data),
                        mimetype='application/pdf',
                        as_attachment=True,
                        download_name=f"{original_name}.pdf"
                    )
                    response.headers['Content-Disposition'] = f'attachment; filename="{original_name}.pdf"'
                    return response
                    
                except Exception as e:
                    logger.error(f"Image to PDF conversion failed: {e}")
                    return jsonify({'message': 'Failed to convert image to PDF'}), 500
        
    except Exception as e:
        logger.error(f"Document conversion failed: {e}")
        return jsonify({'message': 'Failed to convert document'}), 500

@app.route('/api/documents/batch-convert', methods=['POST'])
@token_required
def batch_convert_documents(current_user_id):
    """Convert multiple documents to a specified format"""
    try:
        from bson import ObjectId
        import json
        import zipfile
        
        # Get conversion parameters from request
        data = request.get_json()
        document_ids = data.get('document_ids', [])
        target_format = data.get('format', 'pdf').lower()
        
        if not document_ids:
            return jsonify({'message': 'No documents specified'}), 400
            
        if target_format not in ['pdf', 'txt', 'json']:
            return jsonify({'message': 'Unsupported format. Supported: pdf, txt, json'}), 400
        
        # Create ZIP file for batch download
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for doc_id in document_ids:
                try:
                    # Find document
                    document = documents_collection.find_one({
                        '_id': ObjectId(doc_id),
                        'user_id': current_user_id
                    })
                    
                    if not document:
                        continue
                    
                    # Get original file data
                    file_data = fs.get(ObjectId(document['file_id']))
                    original_data = file_data.read()
                    
                    # Get original filename without extension
                    original_name = document['filename']
                    if '.' in original_name:
                        original_name = original_name.rsplit('.', 1)[0]
                    
                    if target_format == 'txt':
                        text_content = document.get('ocr_text', '')
                        zip_file.writestr(f"{original_name}.txt", text_content.encode('utf-8'))
                        
                    elif target_format == 'json':
                        export_data = {
                            'filename': document['filename'],
                            'captured_at': document['captured_at'].isoformat() if document.get('captured_at') else None,
                            'extracted_text': document.get('ocr_text', ''),
                            'metadata': document.get('metadata', {}),
                            'file_size': document['metadata'].get('file_size', 0),
                            'processing_time': document['metadata'].get('processing_time', 0),
                            'file_type': document['metadata'].get('file_type', 'unknown'),
                            'processing_details': document['metadata'].get('processing_details', {})
                        }
                        json_content = json.dumps(export_data, indent=2, ensure_ascii=False)
                        zip_file.writestr(f"{original_name}.json", json_content.encode('utf-8'))
                        
                    elif target_format == 'pdf':
                        current_type = document['metadata'].get('file_type', 'image')
                        
                        if current_type == 'pdf':
                            zip_file.writestr(document['filename'], original_data)
                        else:
                            # Convert image to PDF
                            try:
                                image = Image.open(io.BytesIO(original_data))
                                pdf_buffer = io.BytesIO()
                                image.save(pdf_buffer, format='PDF', resolution=300)
                                pdf_data = pdf_buffer.getvalue()
                                zip_file.writestr(f"{original_name}.pdf", pdf_data)
                            except Exception as e:
                                logger.warning(f"Failed to convert {document['filename']} to PDF: {e}")
                                continue
                
                except Exception as e:
                    logger.warning(f"Failed to process document {doc_id}: {e}")
                    continue
        
        zip_buffer.seek(0)
        
        response = send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'converted_documents_{target_format}.zip'
        )
        response.headers['Content-Disposition'] = f'attachment; filename="converted_documents_{target_format}.zip"'
        return response
        
    except Exception as e:
        logger.error(f"Batch conversion failed: {e}")
        return jsonify({'message': 'Failed to convert documents'}), 500

@app.route('/api/search', methods=['GET'])
@token_required
def search_documents(current_user_id):
    """Search documents by text content"""
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'message': 'Search query is required'}), 400
        
        # Create text index if it doesn't exist
        try:
            documents_collection.create_index([('ocr_text', 'text')])
        except:
            pass  # Index might already exist
        
        # Search documents
        documents = list(documents_collection.find({
            'user_id': current_user_id,
            '$text': {'$search': query}
        }).sort('captured_at', -1))
        
        # Convert ObjectId to string
        for doc in documents:
            doc['_id'] = str(doc['_id'])
            doc['file_id'] = str(doc['file_id'])
        
        return jsonify({
            'documents': documents,
            'query': query,
            'count': len(documents)
        }), 200
    
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return jsonify({'message': 'Search failed'}), 500

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    """API health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    }), 200

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    # Create uploads directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
        # Removed ssl_context for development to avoid certificate issues
    )
