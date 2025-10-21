"""
Image Enhancement Module - Advanced brightness and contrast enhancement
Aligns with notebook processing.ipynb Step 11 implementation
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any
import logging

logger = logging.getLogger(__name__)


class ImageEnhancer:
    """Advanced image enhancement with adjustable parameters"""
    
    # Default parameters (from notebook Step 11)
    DEFAULT_PARAMS = {
        'brightness_boost': 25,              # 0-50 units
        'equalization_strength': 0.4,        # 0.0-1.0 blend ratio
        'clahe_clip_limit': 2.0,            # 1.0-4.0 contrast limit
        'clahe_tile_size': 8,                # 4-16 (power of 2)
    }
    
    def __init__(self, params: Dict[str, Any] = None):
        """
        Initialize enhancer with optional custom parameters
        
        Args:
            params: Dict with custom parameter values
        """
        self.params = self.DEFAULT_PARAMS.copy()
        if params:
            self.params.update(params)
        
        logger.info(f"ImageEnhancer initialized with params: {self.params}")
    
    def enhance_brightness_and_contrast(self, image: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Apply balanced brightness and contrast enhancement
        Mirrors notebook Step 11: Balanced Contrast & Brightness Enhancement
        
        Args:
            image: Grayscale image (height, width) or BGR image
            
        Returns:
            Tuple of (enhanced_image, enhancement_stats)
        """
        try:
            # Convert to grayscale if needed
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            # Record original stats
            original_mean = gray.mean()
            original_std = gray.std()
            original_min = gray.min()
            original_max = gray.max()
            
            # ========== STEP 1: Brightness Boost ==========
            brightness_boost = self.params['brightness_boost']
            brightened = cv2.convertScaleAbs(gray, alpha=1.0, beta=brightness_boost)
            
            # ========== STEP 2: Gentle Blended Equalization ==========
            equalization_strength = self.params['equalization_strength']
            
            # Full histogram equalization
            equalized_full = cv2.equalizeHist(brightened)
            
            # Gentle blend: (1 - strength) * original + strength * equalized
            # Example: 0.4 strength = 60% original + 40% equalized
            equalized_gentle = cv2.addWeighted(
                brightened, 
                1.0 - equalization_strength,
                equalized_full, 
                equalization_strength, 
                0
            )
            
            # ========== STEP 3: CLAHE Enhancement ==========
            clahe_clip_limit = self.params['clahe_clip_limit']
            clahe_tile_size = self.params['clahe_tile_size']
            
            clahe = cv2.createCLAHE(
                clipLimit=clahe_clip_limit,
                tileGridSize=(clahe_tile_size, clahe_tile_size)
            )
            equalized_clahe = clahe.apply(equalized_gentle)
            
            # ========== STEP 4: Final Blending ==========
            # Blend gentle equalization and CLAHE (50/50)
            enhanced = cv2.addWeighted(
                equalized_gentle, 0.5,
                equalized_clahe, 0.5,
                0
            )
            
            # Calculate enhancement statistics
            enhanced_mean = enhanced.mean()
            enhanced_std = enhanced.std()
            enhanced_min = enhanced.min()
            enhanced_max = enhanced.max()
            
            contrast_improvement = enhanced_std / original_std if original_std > 0 else 1.0
            
            stats = {
                'original': {
                    'mean': float(original_mean),
                    'std': float(original_std),
                    'min': float(original_min),
                    'max': float(original_max),
                    'range': float(original_max - original_min)
                },
                'enhanced': {
                    'mean': float(enhanced_mean),
                    'std': float(enhanced_std),
                    'min': float(enhanced_min),
                    'max': float(enhanced_max),
                    'range': float(enhanced_max - enhanced_min)
                },
                'improvement': {
                    'brightness_boost': brightness_boost,
                    'contrast_factor': float(contrast_improvement),
                    'mean_change': float(enhanced_mean - original_mean),
                    'std_change': float(enhanced_std - original_std),
                },
                'parameters': {
                    'brightness_boost': brightness_boost,
                    'equalization_strength': equalization_strength,
                    'clahe_clip_limit': clahe_clip_limit,
                    'clahe_tile_size': clahe_tile_size,
                }
            }
            
            logger.info(f"Brightness & contrast enhancement complete. Contrast improvement: {contrast_improvement:.2f}x")
            
            return enhanced, stats
            
        except Exception as e:
            logger.error(f"Brightness enhancement error: {str(e)}")
            return image, {'error': str(e)}
    
    def apply_gaussian_blur(self, image: np.ndarray, 
                          kernel_size: Tuple[int, int] = None,
                          sigma: float = None) -> np.ndarray:
        """
        Apply Gaussian blur (Step 5 from notebook)
        
        Args:
            image: Input image
            kernel_size: Blur kernel size (must be odd)
            sigma: Gaussian standard deviation
            
        Returns:
            Blurred image
        """
        if kernel_size is None:
            kernel_size = (5, 5)  # Default from notebook
        if sigma is None:
            sigma = 0  # Auto-calculate
        
        return cv2.GaussianBlur(image, kernel_size, sigma)
    
    def apply_canny_edge_detection(self, image: np.ndarray,
                                   threshold1: int = None,
                                   threshold2: int = None) -> np.ndarray:
        """
        Apply Canny edge detection (Step 6 from notebook)
        
        Args:
            image: Input grayscale image
            threshold1: Lower threshold
            threshold2: Upper threshold
            
        Returns:
            Edge map
        """
        if threshold1 is None:
            threshold1 = 50  # Default from notebook
        if threshold2 is None:
            threshold2 = 150  # Default from notebook
        
        return cv2.Canny(image, threshold1, threshold2)
    
    def apply_binary_thresholding(self, image: np.ndarray,
                                  method: str = 'otsu') -> Tuple[np.ndarray, float]:
        """
        Apply binary thresholding (Step 7 from notebook)
        
        Args:
            image: Input grayscale image
            method: 'otsu' for automatic or 'manual' with specific value
            
        Returns:
            Tuple of (binary_image, threshold_value)
        """
        if method == 'otsu':
            threshold_value, binary = cv2.threshold(
                image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
            return binary, threshold_value
        else:
            # Manual threshold
            threshold_value, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
            return binary, 127.0
    
    def apply_morphological_ops(self, image: np.ndarray,
                               kernel_size: Tuple[int, int] = None,
                               iterations: int = None) -> np.ndarray:
        """
        Apply morphological operations (Step 8 from notebook)
        Erosion followed by dilation
        
        Args:
            image: Input binary image
            kernel_size: Morphology kernel size
            iterations: Number of iterations
            
        Returns:
            Processed image
        """
        if kernel_size is None:
            kernel_size = (3, 3)  # Default from notebook
        if iterations is None:
            iterations = 1  # Default from notebook
        
        kernel = np.ones(kernel_size, np.uint8)
        
        # Erosion (removes small white noise)
        eroded = cv2.erode(image, kernel, iterations=iterations)
        
        # Dilation (fills small black gaps)
        dilated = cv2.dilate(eroded, kernel, iterations=iterations)
        
        return dilated
    
    def apply_adaptive_threshold(self, image: np.ndarray,
                               block_size: int = None,
                               c_value: float = None) -> np.ndarray:
        """
        Apply adaptive thresholding (Step 12 OCR preprocessing)
        
        Args:
            image: Input grayscale image
            block_size: Neighborhood size (must be odd)
            c_value: Constant subtracted from mean
            
        Returns:
            Binary image
        """
        if block_size is None:
            block_size = 11  # Default from notebook
        if c_value is None:
            c_value = 2  # Default from notebook
        
        # Ensure block size is odd
        if block_size % 2 == 0:
            block_size += 1
        
        return cv2.adaptiveThreshold(
            image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, block_size, int(c_value)
        )
    
    def apply_ocr_preprocessing(self, image: np.ndarray,
                               adaptive_block_size: int = None,
                               adaptive_const: int = None,
                               clahe_limit: float = None,
                               clahe_grid: int = None,
                               sharpen_strength: float = None) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Complete OCR preprocessing pipeline (Step 12 from notebook)
        
        Args:
            image: Input grayscale image
            adaptive_block_size: Adaptive threshold block size
            adaptive_const: Adaptive threshold constant
            clahe_limit: CLAHE clip limit
            clahe_grid: CLAHE tile grid size
            sharpen_strength: Sharpening kernel multiplier
            
        Returns:
            Tuple of (preprocessed_image, preprocessing_stats)
        """
        try:
            if adaptive_block_size is None:
                adaptive_block_size = 11
            if adaptive_const is None:
                adaptive_const = 2
            if clahe_limit is None:
                clahe_limit = 1.5
            if clahe_grid is None:
                clahe_grid = 8
            if sharpen_strength is None:
                sharpen_strength = 1.0
            
            # Step 1: Adaptive thresholding
            adaptive_thresh = self.apply_adaptive_threshold(
                image, adaptive_block_size, adaptive_const
            )
            
            # Step 2: Denoise with morphological operations
            kernel_denoise = np.ones((1, 1), np.uint8)
            denoised = cv2.morphologyEx(adaptive_thresh, cv2.MORPH_CLOSE, kernel_denoise)
            
            # Step 3: CLAHE enhancement
            clahe = cv2.createCLAHE(
                clipLimit=clahe_limit,
                tileGridSize=(clahe_grid, clahe_grid)
            )
            enhanced_for_ocr = clahe.apply(image)
            
            # Step 4: Image sharpening
            kernel_sharpen = np.array([
                [-1, -1, -1],
                [-1, 9, -1],
                [-1, -1, -1]
            ], dtype=np.float32) * sharpen_strength
            
            sharpened = cv2.filter2D(enhanced_for_ocr, -1, kernel_sharpen)
            
            stats = {
                'preprocessing_steps': 4,
                'parameters': {
                    'adaptive_block_size': adaptive_block_size,
                    'adaptive_const': adaptive_const,
                    'clahe_limit': clahe_limit,
                    'clahe_grid': clahe_grid,
                    'sharpen_strength': sharpen_strength
                }
            }
            
            logger.info("OCR preprocessing complete")
            return sharpened, stats
            
        except Exception as e:
            logger.error(f"OCR preprocessing error: {str(e)}")
            return image, {'error': str(e)}
    
    def update_parameters(self, **kwargs) -> None:
        """
        Update enhancement parameters at runtime
        
        Args:
            **kwargs: Parameter name-value pairs
        """
        for key, value in kwargs.items():
            if key in self.params:
                self.params[key] = value
                logger.info(f"Updated {key} to {value}")
            else:
                logger.warning(f"Unknown parameter: {key}")
    
    def get_parameters(self) -> Dict[str, Any]:
        """Get current parameters"""
        return self.params.copy()
    
    def reset_parameters(self) -> None:
        """Reset to default parameters"""
        self.params = self.DEFAULT_PARAMS.copy()
        logger.info("Parameters reset to defaults")
