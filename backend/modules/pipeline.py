"""
Modular Processing Pipeline
Integrates all modules into a complete document processing system
"""

import cv2
import numpy as np
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime

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
        Complete document processing workflow
        
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
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            # Stage 1: Load and validate image quality
            print("Stage 1: Scanning and validation...")
            image = cv2.imread(image_path)
            if image is None:
                result['error'] = 'Could not read image'
                return result
            
            quality = self.scanner.validate_image_quality(image)
            result['quality'] = quality
            
            if not quality['is_acceptable'] and options.get('strict_quality', False):
                result['error'] = 'Image quality below threshold'
                result['recommendations'] = quality['recommendations']
                return result
            
            # Stage 2: Image processing and enhancement
            print("Stage 2: Image processing...")
            processed = self.processor.process_document(
                image, 
                auto_crop=options.get('auto_crop', True)
            )
            
            # Stage 3: AI enhancement (optional)
            if options.get('ai_enhance', False):
                print("Stage 3: AI enhancement...")
                processed = self.enhancer.enhance_quality(processed)
            
            # Stage 4: OCR text extraction
            print("Stage 4: OCR text extraction...")
            ocr_result = self.ocr.extract_text_with_confidence(processed)
            result['text'] = ocr_result['text']
            result['ocr_confidence'] = ocr_result['confidence']
            result['word_count'] = ocr_result['word_count']
            
            # Stage 5: Document classification
            print("Stage 5: Document classification...")
            if self.classifier.is_trained:
                doc_type, confidence = self.classifier.predict(processed)
                result['document_type'] = doc_type
                result['classification_confidence'] = confidence
            
            # Stage 6: Generate filename and save
            print("Stage 6: Storage...")
            filename = self.storage.generate_filename(
                text_content=ocr_result['text'],
                prefix=options.get('filename_prefix', 'doc'),
                extension='jpg'
            )
            
            # Save processed image
            processed_path = os.path.join(output_dir, filename)
            os.makedirs(output_dir, exist_ok=True)
            cv2.imwrite(processed_path, processed)
            result['processed_image'] = processed_path
            
            # Save text
            text_filename = os.path.splitext(filename)[0] + '.txt'
            text_path = os.path.join(output_dir, text_filename)
            with open(text_path, 'w', encoding='utf-8') as f:
                f.write(ocr_result['text'])
            result['text_file'] = text_path
            
            # Optional: Compression
            if options.get('compress', False):
                compressed_path, comp_stats = self.storage.compress_image(
                    processed_path,
                    quality=options.get('compression_quality', 85)
                )
                result['compressed_image'] = compressed_path
                result['compression_stats'] = comp_stats
            
            # Optional: Cloud upload
            if options.get('upload_to_cloud', False):
                if options.get('cloud_provider') == 's3':
                    upload_result = self.storage.upload_to_s3(
                        processed_path,
                        bucket_name=options.get('s3_bucket'),
                        s3_key=filename
                    )
                    result['cloud_upload'] = upload_result
            
            # Stage 7: Export options
            if options.get('export_pdf', False):
                print("Stage 7: PDF export...")
                pdf_filename = os.path.splitext(filename)[0] + '.pdf'
                pdf_path = os.path.join(output_dir, pdf_filename)
                
                pdf_success = self.exporter.export_to_pdf(
                    [processed_path],
                    pdf_path,
                    page_size=options.get('page_size', 'A4')
                )
                
                if pdf_success:
                    result['pdf_export'] = pdf_path
            
            # Optional: Auto-print
            if options.get('auto_print', False):
                print("Stage 8: Printing...")
                print_success = self.exporter.print_file(
                    result.get('pdf_export', processed_path),
                    printer_name=options.get('printer_name')
                )
                result['print_success'] = print_success
            
            # Get file metadata
            result['metadata'] = self.storage.get_file_metadata(processed_path)
            
            result['success'] = True
            result['message'] = 'Document processed successfully'
            
        except Exception as e:
            result['error'] = str(e)
            result['success'] = False
        
        return result
    
    def batch_process(self, image_paths: List[str], 
                     output_dir: str,
                     options: Optional[Dict] = None) -> List[Dict]:
        """
        Process multiple documents
        
        Args:
            image_paths: List of image file paths
            output_dir: Output directory
            options: Processing options
            
        Returns:
            List of processing results
        """
        results = []
        
        for i, image_path in enumerate(image_paths, 1):
            print(f"\nProcessing document {i}/{len(image_paths)}: {image_path}")
            result = self.process_document(image_path, output_dir, options)
            results.append(result)
        
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
