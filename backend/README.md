# PrintChakra Backend API

Flask-based backend API for document OCR processing and management.

## Features
- Document upload and OCR processing
- Image preprocessing with OpenCV
- Text extraction using Tesseract
- JWT authentication
- MongoDB storage with GridFS
- RESTful API endpoints
- HTTPS support (self-signed for development)

## Installation

### Prerequisites
- Python 3.8+
- MongoDB Community Edition
- Tesseract OCR

### Setup Steps

1. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

2. **Install Tesseract OCR:**
   - Windows: Download from [UB Mannheim](https://github.com/UB-Mannheim/tesseract/wiki)
   - Add Tesseract to your PATH or update the path in code

3. **Start MongoDB:**
```bash
mongod --dbpath /path/to/your/db
```

4. **Run the application:**
```bash
python app.py
```

The API will be available at `https://localhost:5000` (HTTPS with self-signed certificate).

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Documents
- `POST /api/documents/upload` - Upload document for OCR
- `GET /api/documents` - List user documents
- `GET /api/documents/<id>` - Get specific document
- `GET /api/documents/<id>/image` - Get document image
- `DELETE /api/documents/<id>` - Delete document
- `GET /api/search?q=text` - Search documents

### System
- `GET /api/health` - Health check

## Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
SECRET_KEY=your-super-secret-key
MONGODB_URI=mongodb://localhost:27017/
TESSERACT_PATH=/usr/local/bin/tesseract
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
```

### MongoDB Schema

#### Users Collection
```javascript
{
  _id: ObjectId,
  username: String,
  password: String (hashed),
  device_id: String,
  created_at: Date
}
```

#### Documents Collection
```javascript
{
  _id: ObjectId,
  filename: String,
  user_id: String,
  file_id: ObjectId (GridFS),
  ocr_text: String,
  captured_at: Date,
  device_id: String,
  metadata: {
    file_size: Number,
    dimensions: Object,
    processing_time: Number,
    content_type: String
  }
}
```

## Image Processing Pipeline

1. **Upload**: Receive image file from mobile app
2. **Preprocessing**: 
   - Convert to grayscale
   - Apply Gaussian blur
   - Adaptive thresholding
   - Morphological operations
3. **OCR**: Extract text using Tesseract
4. **Storage**: Save image in GridFS and metadata in MongoDB

## Development

### Testing API Endpoints
Use tools like Postman or curl to test endpoints:

```bash
# Health check
curl -k https://localhost:5000/api/health

# Register user
curl -k -X POST https://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","device_id":"device1"}'

# Login
curl -k -X POST https://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Upload document
curl -k -X POST https://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

### Logging
The application uses Python's logging module. Logs include:
- MongoDB connection status
- Document processing times
- OCR results
- Error details

## Security Notes
- JWT tokens expire after 30 days
- Passwords are hashed using SHA-256
- Self-signed SSL certificates for development
- CORS enabled for local development

## Performance Considerations
- Image preprocessing optimized for document scanning
- GridFS for efficient large file storage
- Text indexing for fast search
- Pagination for document lists

## Troubleshooting

### Common Issues
1. **Tesseract not found**: Ensure Tesseract is installed and in PATH
2. **MongoDB connection failed**: Check MongoDB service is running
3. **SSL warnings**: Expected with self-signed certificates
4. **Image processing errors**: Check OpenCV installation

### Monitoring
- Check `/api/health` for system status
- Monitor MongoDB collections with MongoDB Compass
- Review application logs for debugging
