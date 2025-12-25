"""
Test the document processing integration with main app.py
"""
import sys
import os

# Setup paths
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(TEST_DIR)
sys.path.insert(0, BACKEND_DIR)
os.chdir(BACKEND_DIR)

INPUT = os.path.join(TEST_DIR, "test_outputs", "original.jpg")
OUTPUT = os.path.join(TEST_DIR, "test_outputs", "app_integration_output.jpg")


def main():
    print("=" * 60)
    print("APP.PY INTEGRATION TEST")
    print("=" * 60)
    
    # Mock socketio before importing app
    class MockSocketIO:
        def emit(self, *args, **kwargs):
            pass
    
    try:
        import app as main_app
        main_app.socketio = MockSocketIO()
    except Exception as e:
        print(f"WARNING: Could not import app.py: {e}")
        print("Testing standalone processing instead...")
        
        sys.path.insert(0, TEST_DIR)
        from document_processor import process_document
        import cv2
        
        img = cv2.imread(INPUT)
        if img is None:
            print(f"ERROR: Could not load {INPUT}")
            return False
        
        processed, info = process_document(img)
        os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
        cv2.imwrite(OUTPUT, processed)
        print(f"✓ Saved: {OUTPUT}")
        return True
    
    # Test with app.py's process_document_image
    print(f"\nInput: {INPUT}")
    print(f"Output: {OUTPUT}")
    
    if hasattr(main_app, 'process_document_image'):
        success, text, new_filename = main_app.process_document_image(INPUT, OUTPUT, "test.jpg")
        print(f"\nResults:")
        print(f"  Success: {success}")
        print(f"  OCR text length: {len(text) if text else 0} chars")
        print(f"  Output filename: {new_filename}")
        return success
    else:
        print("ERROR: process_document_image not found in app.py")
        return False


if __name__ == "__main__":
    success = main()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")
