"""
Simple test of CamScanner-style document processing
"""
import cv2
import os
import sys

# Add test directory to path
sys.path.insert(0, os.path.dirname(__file__))
from document_processor import process_document, find_document, four_point_transform

# Paths relative to this test folder
TEST_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT = os.path.join(TEST_DIR, "test_outputs", "original.jpg")
OUTPUT = os.path.join(TEST_DIR, "test_outputs", "simple_output.jpg")


def main():
    print("=" * 60)
    print("SIMPLE DOCUMENT PROCESSING TEST")
    print("=" * 60)
    
    # Load image
    print(f"\nLoading: {INPUT}")
    img = cv2.imread(INPUT)
    if img is None:
        print(f"ERROR: Could not load image from {INPUT}")
        return False
    print(f"✓ Loaded: {img.shape[1]}x{img.shape[0]} pixels")
    
    # Process
    print("\nProcessing...")
    processed, info = process_document(img, detect_bounds=True)
    
    print(f"  Original size: {info['original_size']}")
    print(f"  Document detected: {info['detected_document']}")
    print(f"  Cropped size: {info['cropped_size']}")
    
    # Save
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    cv2.imwrite(OUTPUT, processed, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"\n✓ Saved: {OUTPUT}")
    
    return True


if __name__ == "__main__":
    success = main()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")
