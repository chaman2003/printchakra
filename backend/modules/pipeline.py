"""
Modular Processing Pipeline
Integrates all modules into a complete document processing system
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


class DocumentPipeline:
    """
    Complete document processing pipeline
    Integrates scanning, processing, OCR, storage, and export
    """
    
    def __init__(self, config: Optional[Dict] = None):
        """
        Initialize pipeline with all modules
        
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
            
            # Stage 2: Image processing and enhancement (SEQUENTIAL)
            print("[STAGE 2/8] Image processing...")
            processed = image.copy()  # Ensure we have a copy
            result['processed_shape'] = processed.shape
            
            # Step 2a: Auto-crop with fallback
            if options.get('auto_crop', True):
                print("  → Attempting document auto-crop...")
                try:
                    contour, _ = self.processor.find_document_contours(processed)
                    if contour is not None:
                        processed = self.processor.perspective_transform(processed, contour)
                        print(f"    ✓ Auto-crop successful - New shape: {processed.shape}")
                    else:
                        print("    ⚠ No document contour found, skipping crop")
                except Exception as crop_error:
                    print(f"    ⚠ Auto-crop failed: {str(crop_error)}, continuing with original...")
            
            # Step 2b: Skew correction
            print("  → Correcting skew...")
            try:
                processed, angle = self.processor.correct_skew(processed)
                print(f"    ✓ Skew correction completed - Rotation angle: {angle:.2f}°")
                result['skew_angle'] = angle
            except Exception as skew_error:
                print(f"    ⚠ Skew correction failed: {str(skew_error)}, continuing...")
                result['skew_error'] = str(skew_error)
            
            # Step 2c: Denoising
            print("  → Applying denoising...")
            try:
                processed = self.processor.denoise_image(processed, method='bilateral')
                print(f"    ✓ Denoising completed")
            except Exception as denoise_error:
                print(f"    ⚠ Denoising failed: {str(denoise_error)}, continuing...")
                result['denoise_error'] = str(denoise_error)
            
            # Step 2d: Contrast enhancement
            print("  → Enhancing contrast...")
            try:
                processed = self.processor.enhance_contrast(processed)
                print(f"    ✓ Contrast enhancement completed")
            except Exception as contrast_error:
                print(f"    ⚠ Contrast enhancement failed: {str(contrast_error)}, continuing...")
                result['contrast_error'] = str(contrast_error)
            
            result['stages_completed'].append('image_processing')
            print(f"  ✓ Image processing stage completed - Final shape: {processed.shape}")
            
            # Stage 3: AI enhancement (optional) - SEQUENTIAL
            if options.get('ai_enhance', False):
                print("[STAGE 3/8] AI enhancement...")
                try:
                    processed = self.enhancer.enhance_quality(processed)
                    print(f"  ✓ AI enhancement completed")
                    result['stages_completed'].append('ai_enhancement')
                except Exception as ai_error:
                    print(f"  ⚠ AI enhancement failed: {str(ai_error)}, continuing...")
                    result['ai_enhancement_error'] = str(ai_error)
            else:
                print("[STAGE 3/8] AI enhancement... (skipped)")
            
            # Stage 4: OCR text extraction - SEQUENTIAL
            print("[STAGE 4/8] OCR text extraction...")
            try:
                ocr_result = self.ocr.extract_text_with_confidence(processed)
                result['text'] = ocr_result['text']
                result['ocr_confidence'] = ocr_result['confidence']
                result['word_count'] = ocr_result['word_count']
                result['stages_completed'].append('ocr')
                print(f"  ✓ OCR extraction completed - Words: {ocr_result['word_count']}, Confidence: {ocr_result['confidence']:.2f}%")
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
                    text_content=ocr_result['text'],
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
                    f.write(ocr_result['text'])
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
