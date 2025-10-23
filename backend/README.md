# PrintChakra Backend

Advanced document processing backend with OCR, image enhancement, and document detection.

## 🏗️ Architecture

```
backend/
├── app.py                  # Main Flask application entry point
├── config/                 # Configuration files
│   └── settings.py        # Central configuration
├── modules/               # Core processing modules
│   ├── __init__.py       # Module exports
│   ├── utility.py        # Helper functions (transforms, loading)
│   ├── document_detection.py  # Multi-method detection with scoring
│   ├── image_enhancement.py   # Multi-stage enhancement
│   ├── image_processing.py    # Image processing utilities
│   ├── ocr_ai.py         # Multi-config OCR extraction
│   ├── scanning.py       # Quality validation
│   ├── storage.py        # File management
│   ├── export.py         # PDF/DOCX export
│   ├── file_converter.py # Format conversion
│   ├── pipeline.py       # Main processing pipeline
│   ├── enhanced_pipeline.py   # Enhanced processing
│   └── api_endpoints.py  # API endpoint definitions
├── tests/                # Test files
├── logs/                 # Application logs
├── data/                 # Data directory (all file storage)
│   ├── uploads/          # Uploaded files
│   ├── processed/        # Processed images
│   ├── processed_text/   # Extracted text
│   ├── pdfs/             # Generated PDFs
│   └── converted/        # Converted files
└── print_scripts/        # Print automation

```

## ✨ Features

### Document Processing
- **Multi-Method Detection**: Canny edges + Adaptive thresholding
- **Corner Refinement**: 12px inset to avoid shadow boundaries
- **Geometric Scoring**: Area, margin, rectangularity, angle analysis
- **Perspective Transform**: Bird's-eye view correction

### Image Enhancement
- **Multi-Stage Enhancement**:
  1. Brightness boost (+25)
  2. Gentle histogram equalization (40% blend)
  3. CLAHE local contrast
  4. Final 50/50 blend
- **OCR Preprocessing**: 5 variants tested per image
  - Bilateral filter
  - Adaptive threshold (2 block sizes)
  - CLAHE + Sharpening
  - High contrast

### OCR (Optical Character Recognition)
- **Multi-Config Extraction**: 15 total attempts (3 PSM modes × 5 preprocessing variants)
- **Automatic Best Selection**: Returns result with most characters
- **Detailed Statistics**: Characters, words, lines, config used

### Quality Validation
- Blur detection (Laplacian variance)
- Focus scoring
- Brightness analysis
- Quality recommendations

### Export Options
- PDF generation (single/merged)
- Image format conversion (JPG, PNG, PDF)
- Batch processing support

## 🚀 Quick Start

### Prerequisites
```bash
# Python 3.8+
# Tesseract OCR installed
```

### Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

### Environment Variables
Create a `.env` file:
```env
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000
```

## 📡 API Endpoints

### Core Endpoints
- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /upload` - Upload and process document
- `GET /files` - List all processed files
- `GET /processed/<filename>` - Get processed image
- `DELETE /delete/<filename>` - Delete file
- `GET /ocr/<filename>` - Get extracted text

### Advanced Endpoints
- `POST /process/advanced` - Advanced pipeline processing
- `POST /validate/quality` - Validate image quality
- `POST /detect/document` - Real-time border detection
- `POST /export/pdf` - Export to PDF
- `POST /convert` - Convert file formats
- `POST /batch/process` - Batch processing
- `GET /pipeline/info` - Pipeline configuration info

### WebSocket Events
- `detect_frame` - Real-time detection
- `processing_progress` - Processing status updates
- `processing_complete` - Completion notification
- `file_deleted` - File deletion notification

## 🔧 Configuration

### Processing Settings
```python
# config/settings.py
PROCESSING_CONFIG = {
    'blur_threshold': 100.0,
    'focus_threshold': 50.0,
    'brightness_boost': 25,
    'equalization_strength': 0.4,
    'corner_inset': 12
}
```

### OCR Settings
```python
OCR_CONFIG = {
    'language': 'eng',
    'psm': 3,  # Page segmentation mode
    'oem': 3   # OCR engine mode
}
```

## 🧪 Testing

```bash
# Run all tests
python -m pytest tests/

# Run specific test file
python test_api.py
```

## 📊 Pipeline Workflow

```
1. Upload & Load
   ↓
2. Document Detection (multi-method)
   ├─ Canny edge detection (3 threshold combinations)
   ├─ Adaptive thresholding
   └─ Geometric scoring & selection
   ↓
3. Corner Refinement (12px inset)
   ↓
4. Perspective Transform
   ↓
5. Image Enhancement (multi-stage)
   ├─ Brightness boost
   ├─ Histogram equalization
   └─ CLAHE
   ↓
6. OCR Preprocessing (5 variants)
   ↓
7. Multi-Config OCR (15 attempts)
   ↓
8. Save & Export
```

## 🐛 Debugging

### Enable Detailed Logging
```python
import logging
logging.getLogger().setLevel(logging.DEBUG)
```

### Check Module Status
```bash
curl http://localhost:5000/health
```

### View Logs
```bash
tail -f logs/printchakra.log
```

## 📝 Module Details

### utility.py
- `order_points()` - Sort corners consistently
- `four_point_transform()` - Perspective correction
- `load_image()` - Image loading with validation

### document_detection.py
- `detect_document()` - Multi-method detection
- `score_contour()` - Geometric scoring
- `refine_document_corners()` - Corner refinement
- `detect_document_refined()` - Complete detection pipeline

### image_enhancement.py
- `enhance_contrast()` - Multi-stage enhancement
- `preprocess_for_ocr()` - Generate 5 OCR variants

### ocr_ai.py
- `extract_text_multi_config()` - 15-attempt OCR
- `extract_text_with_confidence()` - With confidence scores

### pipeline.py
- `DocumentPipeline` - Main processing orchestrator
- `process_document()` - Single file processing
- `batch_process()` - Multiple file processing

## 🔐 Security

- CORS properly configured
- File upload validation
- Path traversal prevention
- Input sanitization
- Error handling

## 📦 Dependencies

Core:
- Flask
- Flask-CORS
- Flask-SocketIO
- OpenCV (cv2)
- NumPy
- Pillow
- pytesseract

Optional:
- scikit-learn (document classification)
- reportlab (PDF generation)

## 🤝 Contributing

1. Follow PEP 8 style guide
2. Add docstrings to all functions
3. Include type hints
4. Add tests for new features
5. Update README for API changes

## 📄 License

MIT License - See LICENSE file

## 🆘 Troubleshooting

### Tesseract Not Found
```bash
# Windows
choco install tesseract

# Mac
brew install tesseract

# Linux
sudo apt-get install tesseract-ocr
```

### Module Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Socket.IO Connection Issues
- Check CORS settings in app.py
- Verify frontend is using correct URL
- Check firewall/antivirus settings

## 📞 Support

For issues and questions:
- GitHub Issues: [Create Issue](https://github.com/chaman2003/printchakra/issues)
- Email: chaman.sarker@gmail.com

---

**Version**: 2.1.0  
**Last Updated**: October 23, 2025
