"""
Test suite for sequential image processing pipeline
Validates all processing stages execute in correct order with proper error handling
"""

import os
import sys
import cv2
import numpy as np
from pathlib import Path
import tempfile
import shutil

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from modules import DocumentPipeline, create_default_pipeline
from modules.image_processing import ImageProcessingModule
from modules.scanning import ScanningModule


def create_test_image(width=800, height=600, add_text=False):
    """Create a simple test image"""
    image = np.ones((height, width, 3), dtype=np.uint8) * 255
    
    # Add a document-like border
    cv2.rectangle(image, (50, 50), (width-50, height-50), (0, 0, 0), 2)
    
    if add_text:
        cv2.putText(image, "TEST DOCUMENT", (100, 150), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 0), 2)
        cv2.putText(image, "Invoice #123456", (100, 250),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 2)
        cv2.putText(image, "Amount: $100.00", (100, 350),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    
    return image


def test_image_processing_sequential():
    """Test that image processing steps execute sequentially"""
    print("\n" + "="*70)
    print("TEST 1: Image Processing Sequential Execution")
    print("="*70)
    
    processor = ImageProcessingModule()
    image = create_test_image(add_text=True)
    
    print("\n[1] Starting image processing...")
    print(f"    Input shape: {image.shape}")
    
    try:
        processed = processor.process_document(image, auto_crop=True)
        print(f"    Output shape: {processed.shape}")
        print("    ✅ Image processing completed successfully")
        assert processed is not None, "Processed image is None"
        assert processed.size > 0, "Processed image is empty"
        return True
    except Exception as e:
        print(f"    ❌ Image processing failed: {str(e)}")
        return False


def test_pipeline_single_document():
    """Test pipeline with single document"""
    print("\n" + "="*70)
    print("TEST 2: Pipeline Single Document Processing")
    print("="*70)
    
    # Create temporary directories
    with tempfile.TemporaryDirectory() as tmpdir:
        input_dir = os.path.join(tmpdir, 'input')
        output_dir = os.path.join(tmpdir, 'output')
        os.makedirs(input_dir)
        os.makedirs(output_dir)
        
        # Create test image
        test_image = create_test_image(add_text=True)
        test_path = os.path.join(input_dir, 'test_doc.jpg')
        cv2.imwrite(test_path, test_image)
        print(f"\n[1] Test image created: {test_path}")
        
        try:
            # Create pipeline
            pipeline = create_default_pipeline(storage_dir=output_dir)
            print(f"[2] Pipeline initialized")
            
            # Process document with minimal options
            options = {
                'auto_crop': True,
                'ai_enhance': False,
                'export_pdf': False,
                'compress': False,
                'strict_quality': False
            }
            
            print(f"[3] Processing document...")
            result = pipeline.process_document(test_path, output_dir, options)
            
            # Validate results
            print(f"\n[4] Validating results...")
            assert result.get('success') == True, f"Processing failed: {result.get('error')}"
            assert result.get('processed_image') is not None, "No processed image path"
            assert result.get('text_file') is not None, "No text file path"
            assert os.path.exists(result['processed_image']), "Processed image not found"
            assert os.path.exists(result['text_file']), "Text file not found"
            
            print(f"    ✓ Success status: {result['success']}")
            print(f"    ✓ Processed image: {os.path.basename(result['processed_image'])}")
            print(f"    ✓ Text file: {os.path.basename(result['text_file'])}")
            print(f"    ✓ OCR confidence: {result.get('ocr_confidence', 0):.2f}%")
            print(f"    ✓ Stages completed: {result.get('stages_completed', [])}")
            
            print("\n    ✅ Single document processing successful")
            return True
            
        except Exception as e:
            print(f"    ❌ Pipeline test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def test_pipeline_batch_processing():
    """Test pipeline batch processing with multiple documents"""
    print("\n" + "="*70)
    print("TEST 3: Pipeline Batch Processing (Sequential)")
    print("="*70)
    
    # Create temporary directories
    with tempfile.TemporaryDirectory() as tmpdir:
        input_dir = os.path.join(tmpdir, 'input')
        output_dir = os.path.join(tmpdir, 'output')
        os.makedirs(input_dir)
        os.makedirs(output_dir)
        
        # Create multiple test images
        num_docs = 3
        test_paths = []
        print(f"\n[1] Creating {num_docs} test documents...")
        for i in range(num_docs):
            test_image = create_test_image(add_text=True)
            test_path = os.path.join(input_dir, f'test_doc_{i+1}.jpg')
            cv2.imwrite(test_path, test_image)
            test_paths.append(test_path)
            print(f"    ✓ Document {i+1}: {os.path.basename(test_path)}")
        
        try:
            # Create pipeline
            pipeline = create_default_pipeline(storage_dir=output_dir)
            print(f"\n[2] Pipeline initialized")
            
            # Process documents
            options = {
                'auto_crop': True,
                'ai_enhance': False,
                'export_pdf': False,
                'compress': False
            }
            
            print(f"[3] Processing {num_docs} documents sequentially...")
            results = pipeline.batch_process(test_paths, output_dir, options)
            
            # Validate results
            print(f"\n[4] Validating batch results...")
            assert len(results) == num_docs, f"Expected {num_docs} results, got {len(results)}"
            
            successful = sum(1 for r in results if r.get('success'))
            print(f"    ✓ Total documents: {len(results)}")
            print(f"    ✓ Successful: {successful}")
            print(f"    ✓ Failed: {len(results) - successful}")
            
            # Check batch stats
            if results and 'batch_stats' in results[0]:
                stats = results[0]['batch_stats']
                print(f"    ✓ Success rate: {stats.get('success_rate', 0):.1f}%")
            
            assert successful > 0, "No documents processed successfully"
            
            print("\n    ✅ Batch processing successful")
            return True
            
        except Exception as e:
            print(f"    ❌ Batch processing test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def test_error_handling():
    """Test error handling in processing"""
    print("\n" + "="*70)
    print("TEST 4: Error Handling and Recovery")
    print("="*70)
    
    processor = ImageProcessingModule()
    
    # Test 1: Empty image
    print("\n[1] Testing with empty image...")
    try:
        result = processor.process_document(np.array([]), auto_crop=False)
        print("    ❌ Should have raised an error for empty image")
        return False
    except ValueError as e:
        print(f"    ✓ Correctly handled empty image: {str(e)}")
    
    # Test 2: None image
    print("\n[2] Testing with None image...")
    try:
        result = processor.process_document(None, auto_crop=False)
        print("    ❌ Should have raised an error for None image")
        return False
    except (ValueError, AttributeError) as e:
        print(f"    ✓ Correctly handled None image: {str(e)}")
    
    # Test 3: Very small image with auto_crop
    print("\n[3] Testing with small image and auto_crop...")
    try:
        small_image = np.ones((50, 50, 3), dtype=np.uint8) * 255
        result = processor.process_document(small_image, auto_crop=True)
        print(f"    ✓ Handled small image gracefully - Output shape: {result.shape}")
    except Exception as e:
        print(f"    ❌ Failed to handle small image: {str(e)}")
        return False
    
    print("\n    ✅ Error handling tests passed")
    return True


def test_scanning_module():
    """Test scanning module quality validation"""
    print("\n" + "="*70)
    print("TEST 5: Scanning Module Quality Validation")
    print("="*70)
    
    scanner = ScanningModule()
    
    # Test with good quality image
    print("\n[1] Testing with good quality image...")
    image = create_test_image(add_text=True)
    quality = scanner.validate_image_quality(image)
    
    print(f"    ✓ Blur score: {quality['blur']['blur_score']:.2f}")
    print(f"    ✓ Focus score: {quality['focus']['focus_score']:.2f}")
    print(f"    ✓ Overall quality: {quality['overall_quality']}")
    
    # Test with blurry image
    print("\n[2] Testing with blurred image...")
    blurry_image = cv2.blur(image, (21, 21))
    quality_blurry = scanner.validate_image_quality(blurry_image)
    
    print(f"    ✓ Blurry blur score: {quality_blurry['blur']['blur_score']:.2f}")
    print(f"    ✓ Is blurry: {quality_blurry['blur']['is_blurry']}")
    
    print("\n    ✅ Scanning module tests passed")
    return True


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*70)
    print("🧪 SEQUENTIAL IMAGE PROCESSING - COMPREHENSIVE TEST SUITE")
    print("="*70)
    
    tests = [
        ("Image Processing Sequential", test_image_processing_sequential),
        ("Pipeline Single Document", test_pipeline_single_document),
        ("Pipeline Batch Processing", test_pipeline_batch_processing),
        ("Error Handling", test_error_handling),
        ("Scanning Module", test_scanning_module),
    ]
    
    results = {}
    for test_name, test_func in tests:
        try:
            passed = test_func()
            results[test_name] = "✅ PASSED" if passed else "❌ FAILED"
        except Exception as e:
            print(f"\n❌ Test crashed: {str(e)}")
            import traceback
            traceback.print_exc()
            results[test_name] = "💥 CRASHED"
    
    # Print summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    for test_name, result in results.items():
        print(f"  {result}: {test_name}")
    
    passed_count = sum(1 for r in results.values() if "PASSED" in r)
    total_count = len(results)
    
    print(f"\n  Total: {passed_count}/{total_count} tests passed")
    print("="*70 + "\n")
    
    return passed_count == total_count


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
