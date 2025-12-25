"""
Generate step-by-step pipeline images for visualization
"""
import cv2
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from document_processor import generate_pipeline_images

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT = os.path.join(TEST_DIR, "test_outputs", "original.jpg")
OUTPUT_DIR = os.path.join(TEST_DIR, "test_outputs")


def main():
    print("=" * 70)
    print("CAMSCANNER PIPELINE - STEP-BY-STEP IMAGE GENERATION")
    print("=" * 70)
    
    print(f"\nInput: {INPUT}")
    print(f"Output: {OUTPUT_DIR}")
    
    # Load image
    img = cv2.imread(INPUT)
    if img is None:
        print(f"\nERROR: Could not load image from {INPUT}")
        return False
    
    print(f"\n✓ Loaded: {img.shape[1]}x{img.shape[0]} pixels")
    
    # Generate all step images
    print("\nGenerating pipeline images...")
    outputs = generate_pipeline_images(img, OUTPUT_DIR)
    
    print("\nGenerated files:")
    for name, path in outputs.items():
        print(f"  ✓ {name}: {os.path.basename(path)}")
    
    print("\n" + "=" * 70)
    print("COMPLETE - All pipeline steps saved!")
    print("=" * 70)
    
    return True


if __name__ == "__main__":
    success = main()
    print(f"\nTest {'PASSED' if success else 'FAILED'}")
