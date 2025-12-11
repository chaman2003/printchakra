"""
Text-to-Speech Service
Uses Windows SAPI5 (CPU TTS)
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

_tts_initialized_once = False  # Track if we've logged TTS init


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


class TTSService:
    """Text-to-Speech service using Windows SAPI5"""
    
    def __init__(self):
        """Initialize TTS service"""
        self.is_loaded = False
        self._initialize()
    
    def _initialize(self):
        """Initialize TTS service"""
        try:
            self.is_loaded = True
        except Exception as e:
            logger.error(f"[ERROR] TTS initialization failed: {e}")
            self.is_loaded = False
    
    def synthesize(self, text: str) -> Tuple[bool, Optional[str], str]:
        """
        Synthesize speech from text
        
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
            
            # Use SAPI5
            logger.debug("[TTS] Using Windows SAPI5 TTS")
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


def _init_tts_engine() -> bool:
    """Initialize TTS engine (called once at startup)"""
    global _tts_engine, TTS_AVAILABLE, _tts_initialized_once
    
    if _tts_engine is not None:
        return True
    
    try:
        _tts_engine = TTSService()
        
        if _tts_engine.is_loaded:
            TTS_AVAILABLE = True
            
            if not _tts_initialized_once:
                logger.info("[OK] Text-to-Speech Engine Initialized")
                logger.info("   Engine Type: Windows SAPI5 (CPU)")
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
    Speak text using TTS
    
    Args:
        text: Text to speak
    
    Returns:
        True if successful
    """
    global _tts_lock
    
    with _tts_lock:
        try:
            if _tts_engine is None:
                if not _init_tts_engine():
                    return False
            
            if not TTS_AVAILABLE or _tts_engine is None:
                return False
            
            return _tts_engine.speak(text)
        
        except Exception as e:
            logger.error(f"[ERROR] TTS failed: {e}")
            return False


def get_tts_engine_info() -> Dict[str, Any]:
    """Get information about active TTS engine"""
    return {
        'available': TTS_AVAILABLE,
        'engine': 'CPU (SAPI5)',
        'initialized': _tts_engine is not None
    }
