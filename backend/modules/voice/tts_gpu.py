"""
GPU-Accelerated Text-to-Speech Service
Uses Coqui TTS for 5-10x faster speech synthesis with GPU acceleration
Fallback to SAPI5 if GPU unavailable
"""

import logging
import os
import tempfile
import threading
import time
from typing import Dict, Any, Optional, Tuple
import wave

logger = logging.getLogger(__name__)

# Global TTS state
_tts_engine = None
_tts_lock = threading.Lock()
TTS_AVAILABLE = False
TTS_GPU_ENABLED = False

_tts_initialized_once = False  # Track if we've logged TTS init


class CoquiGPUTTS:
    """GPU-accelerated TTS using Coqui TTS with NVIDIA CUDA support"""
    
    def __init__(self, model_name: str = 'tts_models/en/ljspeech/glow-tts'):
        """
        Initialize GPU TTS
        
        Args:
            model_name: Coqui TTS model identifier
        """
        self.model_name = model_name
        self.tts = None
        self.device = 'cuda'  # GPU device
        self.is_loaded = False
        
        try:
            self._load_model()
        except Exception as e:
            logger.error(f"[ERROR] Failed to initialize Coqui GPU TTS: {e}")
    
    def _load_model(self):
        """Load Coqui TTS model on GPU"""
        try:
            from TTS.api import TTS
            
            logger.info(f"Loading Coqui TTS model: {self.model_name} on GPU...")
            
            self.tts = TTS(
                model_name=self.model_name,
                gpu=True,  # Enable GPU
                progress_bar=False,
                verbose=False
            )
            
            self.is_loaded = True
            logger.info("[OK] Coqui TTS GPU model loaded successfully")
            logger.info(f"   Model: {self.model_name}")
            logger.info("   Engine: GPU-accelerated (NVIDIA CUDA)")
            logger.info("   Expected speedup: 5-10x faster than CPU")
        
        except ImportError:
            logger.info("[INFO] Coqui TTS not installed (optional GPU enhancement)")
            logger.info("   Fallback to Windows SAPI5 - install optional package with: pip install TTS")
            self.is_loaded = False
        
        except Exception as e:
            logger.error(f"[ERROR] Failed to load Coqui TTS: {e}")
            self.is_loaded = False
    
    def synthesize(self, text: str, output_path: Optional[str] = None) -> Optional[str]:
        """
        Synthesize speech from text using GPU
        
        Args:
            text: Text to synthesize
            output_path: Optional path to save WAV file
        
        Returns:
            Path to generated WAV file or None on error
        """
        if not self.is_loaded:
            logger.error("[ERROR] TTS model not loaded")
            return None
        
        try:
            start_time = time.time()
            
            # Generate audio
            logger.debug(f"Synthesizing: '{text[:50]}...'")
            self.tts.tts_to_file(
                text=text,
                file_path=output_path or os.path.join(tempfile.gettempdir(), f"tts_{int(time.time()*1000)}.wav")
            )
            
            elapsed = time.time() - start_time
            
            logger.debug(f"[OK] TTS synthesis completed in {elapsed:.2f}s")
            return output_path
        
        except Exception as e:
            logger.error(f"[ERROR] TTS synthesis failed: {e}")
            return None


class SAAPI5Fallback:
    """Fallback to Windows SAPI5 TTS when GPU not available"""
    
    @staticmethod
    def speak_text(text: str, output_path: Optional[str] = None) -> Optional[str]:
        """
        Speak text using Windows SAPI5 (CPU fallback)
        
        Args:
            text: Text to speak
            output_path: Optional path to save WAV file
        
        Returns:
            Path to WAV file or None on error
        """
        try:
            import pyttsx3
            import gc
            
            gc.collect()
            
            output_path = output_path or os.path.join(
                tempfile.gettempdir(),
                f"tts_sapi5_{int(time.time()*1000)}.wav"
            )
            
            engine = pyttsx3.init('sapi5', debug=False)
            
            # Configure voice
            voices = engine.getProperty('voices')
            selected_voice = None
            
            voice_preferences = ['ravi', 'david', 'zira']
            for preference in voice_preferences:
                for voice in voices:
                    if preference in voice.name.lower():
                        selected_voice = voice
                        break
                if selected_voice:
                    break
            
            if not selected_voice and voices:
                selected_voice = voices[0]
            
            if selected_voice:
                engine.setProperty('voice', selected_voice.id)
            
            engine.setProperty('rate', 220)
            engine.setProperty('volume', 0.9)
            
            # Save to file
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            
            try:
                engine.stop()
            except:
                pass
            
            del engine
            gc.collect()
            
            return output_path
        
        except Exception as e:
            logger.error(f"[ERROR] SAPI5 fallback failed: {e}")
            return None


class HybridTTSService:
    """
    Hybrid TTS service that uses GPU when available, falls back to SAPI5
    Automatically detects GPU and selects optimal engine
    """
    
    def __init__(self):
        """Initialize hybrid TTS service with GPU detection"""
        self.gpu_tts = None
        self.use_gpu = False
        self.is_loaded = False
        
        self._initialize()
    
    def _initialize(self):
        """Initialize with automatic GPU detection"""
        try:
            # Check GPU availability first
            if self._check_gpu_available():
                logger.info("[OK] GPU available - initializing Coqui GPU TTS")
                self.gpu_tts = CoquiGPUTTS()
                if self.gpu_tts.is_loaded:
                    self.use_gpu = True
                    self.is_loaded = True
                    logger.info("[OK] GPU TTS initialized successfully")
                    return
            
            # Fallback to SAPI5
            logger.info("GPU not available - using Windows SAPI5 (CPU TTS)")
            self.use_gpu = False
            self.is_loaded = True
        
        except Exception as e:
            logger.error(f"[ERROR] TTS initialization failed: {e}")
            self.is_loaded = False
    
    @staticmethod
    def _check_gpu_available() -> bool:
        """Check if GPU is available"""
        try:
            from .gpu_optimization import get_optimal_device
            device = get_optimal_device()
            return device == 'cuda'
        except:
            return False
    
    def synthesize(self, text: str) -> Tuple[bool, Optional[str], str]:
        """
        Synthesize speech from text using GPU or CPU fallback
        
        Args:
            text: Text to synthesize
        
        Returns:
            Tuple of (success, wav_path, engine_used)
        """
        if not text or not text.strip():
            return False, None, "error"
        
        try:
            output_path = os.path.join(
                tempfile.gettempdir(),
                f"tts_{int(time.time()*1000)}.wav"
            )
            
            if self.use_gpu and self.gpu_tts:
                logger.debug("[TTS] Using GPU-accelerated Coqui TTS")
                result = self.gpu_tts.synthesize(text, output_path)
                if result:
                    return True, result, "gpu_coqui"
                else:
                    # Fallback to SAPI5 on GPU TTS failure
                    logger.warning("[WARN] GPU TTS failed, falling back to SAPI5")
                    self.use_gpu = False
            
            # Use SAPI5 fallback
            logger.debug("[TTS] Using Windows SAPI5 TTS (CPU)")
            result = SAAPI5Fallback.speak_text(text, output_path)
            if result:
                return True, result, "sapi5"
            
            return False, None, "error"
        
        except Exception as e:
            logger.error(f"[ERROR] TTS synthesis failed: {e}")
            return False, None, "error"
    
    def play_audio(self, wav_path: str) -> bool:
        """
        Play WAV file
        
        Args:
            wav_path: Path to WAV file
        
        Returns:
            True if playback successful
        """
        if not os.path.exists(wav_path):
            logger.error(f"[ERROR] WAV file not found: {wav_path}")
            return False
        
        try:
            import winsound
            winsound.PlaySound(wav_path, winsound.SND_FILENAME)
            return True
        except Exception as e:
            logger.error(f"[ERROR] Audio playback failed: {e}")
            return False
    
    def speak(self, text: str) -> bool:
        """
        Synthesize and play speech
        
        Args:
            text: Text to speak
        
        Returns:
            True if successful
        """
        success, wav_path, engine = self.synthesize(text)
        
        if not success:
            logger.error("[ERROR] Failed to synthesize speech")
            return False
        
        try:
            if self.play_audio(wav_path):
                logger.debug(f"[OK] Speech played successfully ({engine})")
                return True
            else:
                logger.warning("[WARN] Audio file created but playback failed")
                return False
        
        finally:
            # Clean up
            try:
                if os.path.exists(wav_path):
                    os.remove(wav_path)
            except:
                pass


def _init_gpu_tts_engine() -> bool:
    """Initialize GPU TTS engine (called once at startup)"""
    global _tts_engine, TTS_AVAILABLE, TTS_GPU_ENABLED, _tts_initialized_once
    
    if _tts_engine is not None:
        return True
    
    try:
        _tts_engine = HybridTTSService()
        
        if _tts_engine.is_loaded:
            TTS_AVAILABLE = True
            TTS_GPU_ENABLED = _tts_engine.use_gpu
            
            if not _tts_initialized_once:
                logger.info("[OK] Text-to-Speech Engine Initialized")
                engine_type = "GPU-Accelerated (Coqui TTS)" if TTS_GPU_ENABLED else "CPU (Windows SAPI5)"
                logger.info(f"   Engine Type: {engine_type}")
                if TTS_GPU_ENABLED:
                    logger.info("   Performance: 5-10x faster than CPU")
                _tts_initialized_once = True
            
            return True
        else:
            logger.error("[ERROR] TTS initialization failed")
            return False
    
    except Exception as e:
        logger.error(f"[ERROR] TTS engine init failed: {e}")
        return False


def speak_text_gpu(text: str) -> bool:
    """
    Speak text using GPU-accelerated TTS with CPU fallback
    
    Args:
        text: Text to speak
    
    Returns:
        True if successful
    """
    global _tts_lock
    
    with _tts_lock:
        try:
            if _tts_engine is None:
                if not _init_gpu_tts_engine():
                    return False
            
            if not TTS_AVAILABLE or _tts_engine is None:
                return False
            
            return _tts_engine.speak(text)
        
        except Exception as e:
            logger.error(f"[ERROR] GPU TTS failed: {e}")
            return False


def get_tts_engine_info() -> Dict[str, Any]:
    """Get information about active TTS engine"""
    return {
        'available': TTS_AVAILABLE,
        'gpu_enabled': TTS_GPU_ENABLED,
        'engine': 'GPU (Coqui TTS)' if TTS_GPU_ENABLED else 'CPU (SAPI5)',
        'initialized': _tts_engine is not None
    }
