"""
GPU Optimization Utilities for Whisper and TTS
Handles GPU memory management, caching, and monitoring
"""

import logging
import os
import threading
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Global GPU state
_gpu_info = {
    'initialized': False,
    'device': None,
    'total_memory': 0,
    'model_cache': {},
    'last_cleanup': datetime.now()
}

_gpu_lock = threading.Lock()


def detect_gpu() -> Dict[str, Any]:
    """Detect and verify GPU availability with detailed info"""
    try:
        import torch
        
        if not torch.cuda.is_available():
            logger.warning("[WARN] CUDA not available - GPU acceleration disabled")
            return {
                'available': False,
                'gpu_name': None,
                'cuda_version': None,
                'device_count': 0,
                'total_memory_gb': 0
            }
        
        gpu_name = torch.cuda.get_device_name(0)
        cuda_version = torch.version.cuda
        device_count = torch.cuda.device_count()
        total_memory = torch.cuda.get_device_properties(0).total_memory / 1e9
        
        logger.info(f"[OK] GPU DETECTED: {gpu_name}")
        logger.info(f"   CUDA Version: {cuda_version}")
        logger.info(f"   GPU Count: {device_count}")
        logger.info(f"   GPU Memory: {total_memory:.1f} GB")
        
        return {
            'available': True,
            'gpu_name': gpu_name,
            'cuda_version': cuda_version,
            'device_count': device_count,
            'total_memory_gb': total_memory
        }
    
    except Exception as e:
        logger.error(f"[ERROR] GPU detection failed: {e}")
        return {
            'available': False,
            'gpu_name': None,
            'cuda_version': None,
            'device_count': 0,
            'total_memory_gb': 0
        }


def get_gpu_memory_usage() -> Dict[str, float]:
    """Get current GPU memory usage in GB"""
    try:
        import torch
        
        if not torch.cuda.is_available():
            return {'allocated_gb': 0, 'cached_gb': 0, 'reserved_gb': 0, 'available_gb': 0}
        
        allocated = torch.cuda.memory_allocated() / 1e9
        cached = torch.cuda.memory_reserved() / 1e9
        total = torch.cuda.get_device_properties(0).total_memory / 1e9
        available = total - allocated
        
        return {
            'allocated_gb': allocated,
            'cached_gb': cached,
            'reserved_gb': cached,
            'available_gb': available,
            'total_gb': total
        }
    
    except Exception as e:
        logger.error(f"[ERROR] Failed to get GPU memory: {e}")
        return {'allocated_gb': 0, 'cached_gb': 0, 'reserved_gb': 0, 'available_gb': 0}


def log_gpu_memory(label: str = "") -> None:
    """Log current GPU memory usage with optional label"""
    try:
        import torch
        
        if not torch.cuda.is_available():
            return
        
        mem = get_gpu_memory_usage()
        label_str = f"[{label}] " if label else ""
        logger.info(
            f"{label_str}GPU Memory: {mem['allocated_gb']:.2f}GB allocated, "
            f"{mem['available_gb']:.2f}GB available / {mem['total_gb']:.1f}GB total"
        )
    except:
        pass


def clear_gpu_cache() -> None:
    """Clear GPU cache to free memory"""
    try:
        import torch
        
        if not torch.cuda.is_available():
            return
        
        torch.cuda.empty_cache()
        logger.debug("[OK] GPU cache cleared")
    
    except Exception as e:
        logger.error(f"[ERROR] Failed to clear GPU cache: {e}")


def optimize_torch_settings() -> None:
    """Apply global PyTorch optimizations for better GPU performance"""
    try:
        import torch
        
        if not torch.cuda.is_available():
            return
        
        # Enable TF32 on A100 GPUs for faster mixed precision
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
        
        # Enable cuDNN benchmarking for automatic optimization
        torch.backends.cudnn.benchmark = True
        
        # Set floating point precision
        torch.set_float32_matmul_precision('high')
        
        logger.info("[OK] PyTorch GPU optimizations applied")
        logger.info("   - TF32 enabled (faster mixed precision)")
        logger.info("   - cuDNN benchmarking enabled")
        logger.info("   - Float32 matmul precision set to 'high'")
    
    except Exception as e:
        logger.debug(f"[DEBUG] Could not apply all PyTorch optimizations: {e}")


def get_optimal_device() -> str:
    """Get optimal device ('cuda' or 'cpu')"""
    try:
        import torch
        return 'cuda' if torch.cuda.is_available() else 'cpu'
    except:
        return 'cpu'


class GPUModelCache:
    """Cache models in GPU memory to avoid repeated loading"""
    
    def __init__(self, max_models: int = 2):
        self.cache: Dict[str, Any] = {}
        self.max_models = max_models
        self.lock = threading.Lock()
    
    def get(self, model_key: str) -> Optional[Any]:
        """Get model from cache"""
        with self.lock:
            if model_key in self.cache:
                logger.debug(f"[CACHE HIT] Model: {model_key}")
                return self.cache[model_key]
            logger.debug(f"[CACHE MISS] Model: {model_key}")
            return None
    
    def put(self, model_key: str, model: Any) -> None:
        """Store model in cache"""
        with self.lock:
            if len(self.cache) >= self.max_models:
                # Remove oldest entry
                oldest_key = next(iter(self.cache))
                self.cache.pop(oldest_key)
                logger.debug(f"[CACHE] Removed old model: {oldest_key}")
            
            self.cache[model_key] = model
            logger.debug(f"[CACHE] Stored model: {model_key}")
    
    def clear(self) -> None:
        """Clear all cached models"""
        with self.lock:
            self.cache.clear()
            clear_gpu_cache()
            logger.debug("[OK] GPU model cache cleared")
    
    def info(self) -> Dict[str, Any]:
        """Get cache info"""
        with self.lock:
            return {
                'cached_models': list(self.cache.keys()),
                'cache_size': len(self.cache),
                'max_models': self.max_models
            }


class GPUMemoryManager:
    """Manages GPU memory usage and prevents out-of-memory errors"""
    
    def __init__(self, warning_threshold: float = 0.8, critical_threshold: float = 0.95):
        """
        Initialize GPU memory manager
        
        Args:
            warning_threshold: Warn when GPU usage exceeds this fraction (0-1)
            critical_threshold: Take action when exceeding this fraction
        """
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.lock = threading.Lock()
    
    def check_available_memory(self, required_gb: float = 0.5) -> bool:
        """
        Check if enough GPU memory is available
        
        Args:
            required_gb: Required GPU memory in GB
        
        Returns:
            True if enough memory available, False otherwise
        """
        try:
            import torch
            
            if not torch.cuda.is_available():
                logger.warning("[WARN] CUDA not available")
                return True  # Allow CPU fallback
            
            mem = get_gpu_memory_usage()
            available = mem['available_gb']
            
            if available < required_gb:
                logger.warning(
                    f"[WARN] Insufficient GPU memory: {available:.2f}GB available, "
                    f"but {required_gb:.2f}GB required"
                )
                return False
            
            return True
        
        except Exception as e:
            logger.error(f"[ERROR] Memory check failed: {e}")
            return True  # Assume available on error
    
    def enforce_memory_limit(self, max_memory_gb: float) -> None:
        """Enforce maximum GPU memory usage"""
        try:
            import torch
            
            if not torch.cuda.is_available():
                return
            
            torch.cuda.set_per_process_memory_fraction(
                max_memory_gb / get_gpu_memory_usage()['total_gb'],
                device=0
            )
            logger.info(f"[OK] GPU memory limit set to {max_memory_gb:.1f}GB")
        
        except Exception as e:
            logger.warning(f"[WARN] Could not set GPU memory limit: {e}")
    
    def monitor(self) -> Dict[str, Any]:
        """Monitor GPU memory and return status"""
        with self.lock:
            mem = get_gpu_memory_usage()
            total = mem.get('total_gb', 0)
            allocated = mem['allocated_gb']
            usage_fraction = allocated / total if total > 0 else 0
            
            status = {
                'usage_fraction': usage_fraction,
                'memory': mem,
                'status': 'ok' if total > 0 else 'no_gpu'
            }
            
            if total > 0 and usage_fraction >= self.critical_threshold:
                logger.warning(f"[CRITICAL] GPU memory critical: {usage_fraction*100:.1f}%")
                clear_gpu_cache()
                status['status'] = 'critical'
            
            elif total > 0 and usage_fraction >= self.warning_threshold:
                logger.warning(f"[WARN] GPU memory high: {usage_fraction*100:.1f}%")
                status['status'] = 'warning'
            
            return status


# Global instances
gpu_model_cache = GPUModelCache(max_models=2)
gpu_memory_manager = GPUMemoryManager(warning_threshold=0.8, critical_threshold=0.95)


def initialize_gpu() -> Dict[str, Any]:
    """Initialize GPU optimizations (call once at startup)"""
    with _gpu_lock:
        try:
            gpu_info = detect_gpu()
            
            if gpu_info['available']:
                optimize_torch_settings()
                clear_gpu_cache()
                log_gpu_memory("INIT")
            
            _gpu_info['initialized'] = True
            _gpu_info['gpu_info'] = gpu_info
            
            return gpu_info
        
        except Exception as e:
            logger.error(f"[ERROR] GPU initialization failed: {e}")
            return {'available': False}


def get_gpu_info() -> Dict[str, Any]:
    """Get comprehensive GPU information"""
    return {
        'initialized': _gpu_info.get('initialized', False),
        'gpu_info': _gpu_info.get('gpu_info', {}),
        'memory': get_gpu_memory_usage(),
        'cache_info': gpu_model_cache.info(),
        'monitor_status': gpu_memory_manager.monitor()
    }
