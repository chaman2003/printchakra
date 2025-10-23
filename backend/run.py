"""
PrintChakra Backend - Development Server Startup
"""

import os
import sys

def check_dependencies():
    """Check if all required dependencies are installed"""
    required = ['flask', 'flask_cors', 'flask_socketio', 'cv2', 'numpy', 'PIL', 'pytesseract']
    missing = []
    
    for package in required:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"❌ Missing dependencies: {', '.join(missing)}")
        print(f"📦 Install with: pip install -r requirements.txt")
        return False
    
    print("✅ All dependencies installed")
    return True

def check_tesseract():
    """Check if Tesseract OCR is available"""
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        print("✅ Tesseract OCR found")
        return True
    except:
        print("⚠️  Tesseract OCR not found")
        print("   Install from: https://github.com/tesseract-ocr/tesseract")
        return False

def main():
    """Main startup function"""
    print("="*70)
    print("🚀 PrintChakra Backend - Starting...")
    print("="*70)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check Tesseract (warning only)
    check_tesseract()
    
    # Import and run app
    print("\n📡 Starting Flask server...")
    from app import app, socketio
    
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 5000))
    
    print(f"🌐 Server running on http://localhost:{port}")
    print(f"📚 API docs available at http://localhost:{port}/")
    print(f"💚 Health check at http://localhost:{port}/health")
    print("\nPress CTRL+C to stop\n")
    
    # Run server
    socketio.run(app, host='0.0.0.0', port=port, debug=True, allow_unsafe_werkzeug=True)

if __name__ == '__main__':
    main()
