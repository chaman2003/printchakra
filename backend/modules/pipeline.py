"""
Modular Processing Pipeline - Improved with notebook logic
Integrates all modules into a complete document processing system
Based on printchakra_clean.ipynb
"""

import cv2
import numpy as np
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import traceback

from .scanning import ScanningModule
from .image_processing import ImageProcessingModule
from .ocr_ai import OCRModule, DocumentClassifier, AIEnhancer
from .storage import StorageModule
from .export import ExportModule
from .document_detection import DocumentDetector
from .image_enhancement import ImageEnhancer
from .utility import four_point_transform, order_points


class DocumentPipeline:
    """
    Complete document processing pipeline
    Integrates scanning, processing, OCR, storage, and export
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize pipeline with all modules (improved)
        
        Args:
            config: Configuration dict for all modules
        """
        self.config = config or {}
        
        # Initialize modules
        self.scanner = ScanningModule(
            blur_threshold=self.config.get('blur_threshold', 100.0),
            focus_threshold=self.config.get('focus_threshold', 50.0)
        )
        
        self.processor = ImageProcessingModule()
        
        # Improved detection and enhancement modules
        self.detector = DocumentDetector()
        self.image_enhancer = ImageEnhancer()
        
        self.ocr = OCRModule(
            language=self.config.get('ocr_language', 'eng'),
            psm=self.config.get('ocr_psm', 3),
            oem=self.config.get('ocr_oem', 3)
        )
        
        self.classifier = DocumentClassifier(
            model_path=self.config.get('classifier_model_path')
        )
        
        self.enhancer = AIEnhancer()
        
        self.storage = StorageModule(
            base_dir=self.config.get('storage_dir', './documents'),
            aws_config=self.config.get('aws_config')
        )
        
        self.exporter = ExportModule()
        
        # Processing stats
        self.stats = {}
    
    def process_document(self, image_path: str, 
                        output_dir: str,
                        options: Optional[Dict] = None) -> Dict:
        """
        Complete document processing workflow with sequential step execution
        
        Args:
            image_path: Path to input image
            output_dir: Output directory for processed files
            options: Processing options dict
            
        Returns:
            Processing result dict
        """
        options = options or {}
        result = {
            'success': False,
            'image_path': image_path,
            'timestamp': datetime.now().isoformat(),
            'stages_completed': []
        }
        
        try:
            # Stage 1: Load and validate image quality
            print("[STAGE 1/8] Scanning and validation...")
            image = cv2.imread(image_path)
            if image is None:
                result['error'] = 'Could not read image file'
                result['stage_failed'] = 'Stage 1: Image Loading'
                return result
            
            print(f"  ✓ Image loaded successfully: {image.shape}")
            result['original_shape'] = image.shape
            
            quality = self.scanner.validate_image_quality(image)
            result['quality'] = quality
            result['stages_completed'].append('validation')
            print(f"  ✓ Quality validation completed - Status: {quality['overall_quality']}")
            
            if not quality['is_acceptable'] and options.get('strict_quality', False):
                result['error'] = 'Image quality below threshold'
                result['recommendations'] = quality['recommendations']
                result['stage_failed'] = 'Stage 1: Quality Check'
                return result
            
            # Stage 2: Document Detection & Perspective Transform (IMPROVED)
            print("[STAGE 2/8] Document detection and cropping...")
            processed = image.copy()
            
            # Step 2a: Improved document detection with corner refinement
            if options.get('auto_crop', True):
                print("  → Detecting document boundaries (improved algorithm)...")
                try:
                    doc_contour = self.detector.detect_document_refined(
                        processed, 
                        debug=True, 
                        inset=options.get('corner_inset', 12)
                    )
                    
                    if doc_contour is not None:
                        # Apply perspective transform
                        doc_contour_pts = doc_contour.reshape(4, 2).astype(np.float32)
                        processed = four_point_transform(processed, doc_contour_pts)
                        print(f"    ✓ Document cropped successfully - New shape: {processed.shape}")
                        result['document_detected'] = True
                    else:
                        print("    ⚠ No document detected, using original image")
                        result['document_detected'] = False
                except Exception as detect_error:
                    print(f"    ⚠ Detection failed: {str(detect_error)}, continuing with original...")
                    result['detection_error'] = str(detect_error)
                    result['document_detected'] = False
            else:
                print("  → Auto-crop disabled, skipping detection")
                result['document_detected'] = False
            
            result['processed_shape'] = processed.shape
            
            # Step 2b: Skew correction (optional)
            if options.get('correct_skew', True):
                print("  → Correcting skew...")
                try:
                    processed, angle = self.processor.correct_skew(processed)
                    print(f"    ✓ Skew correction completed - Rotation angle: {angle:.2f}°")
                    result['skew_angle'] = angle
                except Exception as skew_error:
                    print(f"    ⚠ Skew correction failed: {str(skew_error)}, continuing...")
                    result['skew_error'] = str(skew_error)
            
            result['stages_completed'].append('document_detection')
            print(f"  ✓ Document detection stage completed - Final shape: {processed.shape}")
            
            # Stage 3: Image Enhancement (IMPROVED)
            print("[STAGE 3/8] Image enhancement...")
            try:
                # Use improved multi-stage contrast enhancement
                enhanced = self.image_enhancer.enhance_contrast(
                    processed, 
                    brightness=options.get('brightness', 25),
                    eq_strength=options.get('eq_strength', 0.4)
                )
                processed = enhanced
                print(f"  ✓ Multi-stage enhancement completed")
                result['stages_completed'].append('enhancement')
            except Exception as enhance_error:
                print(f"  ⚠ Enhancement failed: {str(enhance_error)}, continuing...")
                result['enhancement_error'] = str(enhance_error)
            
            # Optional AI enhancement
            if options.get('ai_enhance', False):
                print("  → Applying AI enhancement...")
                try:
                    processed = self.enhancer.enhance_quality(processed)
                    print(f"  ✓ AI enhancement completed")
                    result['ai_enhanced'] = True
                except Exception as ai_error:
                    print(f"  ⚠ AI enhancement failed: {str(ai_error)}, continuing...")
                    result['ai_enhancement_error'] = str(ai_error)
            
            # Stage 4: OCR text extraction (IMPROVED - Multi-config)
            print("[STAGE 4/8] OCR text extraction...")
            try:
                # Use improved multi-config OCR extraction
                text, ocr_stats = self.ocr.extract_text_multi_config(processed, debug=True)
                result['text'] = text
                result['ocr_stats'] = ocr_stats
                result['word_count'] = ocr_stats.get('words', 0)
                result['char_count'] = ocr_stats.get('chars', 0)
                result['line_count'] = ocr_stats.get('lines', 0)
                result['best_config'] = ocr_stats.get('config', 'Unknown')
                result['best_variant'] = ocr_stats.get('variant', 'Unknown')
                result['stages_completed'].append('ocr')
                
                print(f"  ✓ OCR extraction completed:")
                print(f"    Words: {ocr_stats.get('words', 0)}, Chars: {ocr_stats.get('chars', 0)}")
                print(f"    Best config: {ocr_stats.get('config', 'Unknown')} ({ocr_stats.get('variant', 'Unknown')})")
            except Exception as ocr_error:
                print(f"  ✗ OCR extraction failed: {str(ocr_error)}")
                result['error'] = f"OCR stage failed: {str(ocr_error)}"
                result['stage_failed'] = 'Stage 4: OCR'
                return result
            
            # Stage 5: Document classification - SEQUENTIAL
            print("[STAGE 5/8] Document classification...")
            if self.classifier.is_trained:
                try:
                    doc_type, confidence = self.classifier.predict(processed)
                    result['document_type'] = doc_type
                    result['classification_confidence'] = confidence
                    result['stages_completed'].append('classification')
                    print(f"  ✓ Classification completed - Type: {doc_type}, Confidence: {confidence:.2f}%")
                except Exception as classify_error:
                    print(f"  ⚠ Classification failed: {str(classify_error)}, continuing...")
                    result['classification_error'] = str(classify_error)
            else:
                print("  → Classifier not trained, skipping classification")
            
            # Stage 6: Generate filename and save - SEQUENTIAL
            print("[STAGE 6/8] Storage operations...")
            try:
                # Ensure output directory exists
                os.makedirs(output_dir, exist_ok=True)
                print(f"  → Output directory: {output_dir}")
                
                # Generate filename based on content
                filename = self.storage.generate_filename(
                    text_content=result.get('text', ''),
                    prefix=options.get('filename_prefix', 'doc'),
                    extension='jpg'
                )
                print(f"  → Generated filename: {filename}")
                
                # Save processed image
                processed_path = os.path.join(output_dir, filename)
                save_success = cv2.imwrite(processed_path, processed)
                if not save_success:
                    raise Exception("Failed to write processed image to disk")
                print(f"  ✓ Processed image saved: {processed_path}")
                result['processed_image'] = processed_path
                
                # Save extracted text
                text_filename = os.path.splitext(filename)[0] + '.txt'
                text_path = os.path.join(output_dir, text_filename)
                with open(text_path, 'w', encoding='utf-8') as f:
                    f.write(result.get('text', ''))
                print(f"  ✓ Text file saved: {text_path}")
                result['text_file'] = text_path
                
                result['stages_completed'].append('storage')
            except Exception as storage_error:
                print(f"  ✗ Storage operation failed: {str(storage_error)}")
                result['error'] = f"Storage stage failed: {str(storage_error)}"
                result['stage_failed'] = 'Stage 6: Storage'
                return result
            
            # Stage 6b: Optional compression - SEQUENTIAL
            if options.get('compress', False):
                print("  → Compressing image...")
                try:
                    compressed_path, comp_stats = self.storage.compress_image(
                        processed_path,
                        quality=options.get('compression_quality', 85)
                    )
                    result['compressed_image'] = compressed_path
                    result['compression_stats'] = comp_stats
                    print(f"  ✓ Compression successful - Ratio: {comp_stats['compression_ratio']:.2f}%")
                except Exception as compress_error:
                    print(f"  ⚠ Compression failed: {str(compress_error)}, continuing...")
                    result['compression_error'] = str(compress_error)
            
            # Stage 6c: Optional cloud upload - SEQUENTIAL
            if options.get('upload_to_cloud', False):
                print("  → Uploading to cloud...")
                try:
                    if options.get('cloud_provider') == 's3':
                        upload_result = self.storage.upload_to_s3(
                            processed_path,
                            bucket_name=options.get('s3_bucket'),
                            s3_key=filename
                        )
                        result['cloud_upload'] = upload_result
                        if upload_result.get('success'):
                            print(f"  ✓ Cloud upload successful: {upload_result.get('url')}")
                        else:
                            print(f"  ⚠ Cloud upload failed: {upload_result.get('error')}")
                except Exception as cloud_error:
                    print(f"  ⚠ Cloud upload failed: {str(cloud_error)}, continuing...")
                    result['cloud_error'] = str(cloud_error)
            
            # Stage 7: Export options - SEQUENTIAL
            if options.get('export_pdf', False):
                print("[STAGE 7/8] PDF export...")
                try:
                    pdf_filename = os.path.splitext(filename)[0] + '.pdf'
                    pdf_path = os.path.join(output_dir, pdf_filename)
                    
                    pdf_success = self.exporter.export_to_pdf(
                        [processed_path],
                        pdf_path,
                        page_size=options.get('page_size', 'A4')
                    )
                    
                    if pdf_success:
                        result['pdf_export'] = pdf_path
                        result['stages_completed'].append('pdf_export')
                        print(f"  ✓ PDF export successful: {pdf_path}")
                    else:
                        print(f"  ⚠ PDF export failed")
                        result['pdf_export_error'] = 'PDF generation returned false'
                except Exception as pdf_error:
                    print(f"  ⚠ PDF export failed: {str(pdf_error)}")
                    result['pdf_export_error'] = str(pdf_error)
            else:
                print("[STAGE 7/8] PDF export... (skipped)")
            
            # Stage 8: Auto-print - SEQUENTIAL
            if options.get('auto_print', False):
                print("[STAGE 8/8] Printing...")
                try:
                    print_file_path = result.get('pdf_export', processed_path)
                    print_success = self.exporter.print_file(
                        print_file_path,
                        printer_name=options.get('printer_name')
                    )
                    result['print_success'] = print_success
                    if print_success:
                        result['stages_completed'].append('print')
                        print(f"  ✓ Print command executed successfully")
                    else:
                        print(f"  ⚠ Print command failed")
                except Exception as print_error:
                    print(f"  ⚠ Print failed: {str(print_error)}")
                    result['print_error'] = str(print_error)
            else:
                print("[STAGE 8/8] Printing... (skipped)")
            
            # Final step: Get file metadata
            print("Getting file metadata...")
            try:
                result['metadata'] = self.storage.get_file_metadata(processed_path)
                print(f"  ✓ Metadata retrieved: {result['metadata']['size_kb']}KB, {result['metadata']['width']}x{result['metadata']['height']}px")
            except Exception as meta_error:
                print(f"  ⚠ Failed to get metadata: {str(meta_error)}")
                result['metadata_error'] = str(meta_error)
            
            # Success!
            result['success'] = True
            result['message'] = 'Document processed successfully'
            print("\n✓ All processing stages completed successfully!")
            
        except Exception as e:
            import traceback
            result['error'] = str(e)
            result['traceback'] = traceback.format_exc()
            result['success'] = False
            print(f"\n✗ Processing failed: {str(e)}")
        
        return result
    
    def batch_process(self, image_paths: List[str], 
                     output_dir: str,
                     options: Optional[Dict] = None) -> List[Dict]:
        """
        Process multiple documents SEQUENTIALLY with comprehensive tracking
        
        Args:
            image_paths: List of image file paths
            output_dir: Output directory
            options: Processing options
            
        Returns:
            List of processing results with batch statistics
        """
        results = []
        batch_stats = {
            'total_files': len(image_paths),
            'successful': 0,
            'failed': 0,
            'start_time': datetime.now().isoformat(),
            'errors': []
        }
        
        print(f"\n{'='*70}")
        print(f"BATCH PROCESSING STARTED")
        print(f"Total files: {len(image_paths)}")
        print(f"Output directory: {output_dir}")
        print(f"{'='*70}\n")
        
        for i, image_path in enumerate(image_paths, 1):
            print(f"\n[{i}/{len(image_paths)}] Processing: {os.path.basename(image_path)}")
            print(f"{'-'*70}")
            
            try:
                # Validate file exists
                if not os.path.exists(image_path):
                    error_msg = f"File not found: {image_path}"
                    print(f"  ✗ {error_msg}")
                    result = {
                        'success': False,
                        'image_path': image_path,
                        'error': error_msg
                    }
                    results.append(result)
                    batch_stats['failed'] += 1
                    batch_stats['errors'].append(error_msg)
                    continue
                
                # Process document
                result = self.process_document(image_path, output_dir, options)
                results.append(result)
                
                # Update batch statistics
                if result.get('success'):
                    batch_stats['successful'] += 1
                    print(f"\n  ✓ SUCCESS: {os.path.basename(image_path)}")
                else:
                    batch_stats['failed'] += 1
                    error_msg = result.get('error', 'Unknown error')
                    batch_stats['errors'].append(f"[{os.path.basename(image_path)}] {error_msg}")
                    print(f"\n  ✗ FAILED: {error_msg}")
                
            except Exception as e:
                # Catch any unexpected exceptions
                error_msg = f"Unexpected error processing {os.path.basename(image_path)}: {str(e)}"
                print(f"  ✗ {error_msg}")
                
                result = {
                    'success': False,
                    'image_path': image_path,
                    'error': error_msg,
                    'traceback': traceback.format_exc()
                }
                results.append(result)
                batch_stats['failed'] += 1
                batch_stats['errors'].append(error_msg)
        
        # Finalize batch statistics
        batch_stats['end_time'] = datetime.now().isoformat()
        batch_stats['success_rate'] = (batch_stats['successful'] / len(image_paths) * 100) if len(image_paths) > 0 else 0
        
        print(f"\n{'='*70}")
        print(f"BATCH PROCESSING COMPLETED")
        print(f"  Successful: {batch_stats['successful']}/{len(image_paths)} ({batch_stats['success_rate']:.1f}%)")
        print(f"  Failed: {batch_stats['failed']}/{len(image_paths)}")
        if batch_stats['errors']:
            print(f"  Errors:")
            for error in batch_stats['errors'][:5]:  # Show first 5 errors
                print(f"    - {error}")
            if len(batch_stats['errors']) > 5:
                print(f"    ... and {len(batch_stats['errors']) - 5} more errors")
        print(f"{'='*70}\n")
        
        # Attach batch statistics to results
        for result in results:
            result['batch_stats'] = batch_stats
        
        return results
    
    def train_classifier(self, training_data: Dict[str, List[str]]):
        """
        Train document classifier
        
        Args:
            training_data: Dict mapping document types to lists of image paths
                          e.g., {'ID': [paths...], 'BILL': [paths...]}
        """
        images = []
        labels = []
        
        for doc_type, paths in training_data.items():
            for path in paths:
                img = cv2.imread(path)
                if img is not None:
                    images.append(img)
                    labels.append(doc_type)
        
        if images:
            self.classifier.train(images, labels)
            print(f"Classifier trained with {len(images)} samples")
        else:
            print("No valid training images found")
    
    def get_pipeline_info(self) -> Dict:
        """
        Get information about pipeline configuration
        
        Returns:
            Configuration info dict
        """
        return {
            'modules': {
                'scanning': {
                    'blur_threshold': self.scanner.blur_threshold,
                    'focus_threshold': self.scanner.focus_threshold
                },
                'ocr': {
                    'language': self.ocr.language,
                    'psm': self.ocr.psm,
                    'oem': self.ocr.oem
                },
                'classifier': {
                    'is_trained': self.classifier.is_trained,
                    'document_types': self.classifier.DOCUMENT_TYPES
                },
                'storage': {
                    'base_dir': self.storage.base_dir,
                    's3_enabled': self.storage.s3_client is not None
                },
                'export': {
                    'available_page_sizes': list(self.exporter.PAGE_SIZES.keys()),
                    'available_printers': self.exporter.get_available_printers()
                }
            },
            'config': self.config
        }


def create_default_pipeline(storage_dir: str = './documents') -> DocumentPipeline:
    """
    Create pipeline with default configuration
    
    Args:
        storage_dir: Storage directory path
        
    Returns:
        Configured pipeline instance
    """
    config = {
        'blur_threshold': 100.0,
        'focus_threshold': 50.0,
        'ocr_language': 'eng',
        'ocr_psm': 3,
        'ocr_oem': 3,
        'storage_dir': storage_dir
    }
    
    return DocumentPipeline(config)


print("✅ Pipeline loaded (improved with notebook logic)")
