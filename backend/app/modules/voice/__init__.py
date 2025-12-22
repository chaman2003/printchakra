"""
Voice AI Module - Whisper STT + TTS
Handles speech-to-text transcription and text-to-speech output with GPU acceleration

SIMPLIFIED ARCHITECTURE:
- Whisper: GPU-accelerated speech-to-text (STT)
- TTS: GPU-accelerated text-to-speech (SAPI5 fallback)
- NO command parsing: Frontend handles all command interpretation via aiassist module

This module provides:
1. WhisperTranscriptionService - Audio to text conversion
2. VoiceAIOrchestrator - Session management and STT/TTS coordination
3. speak_text() - Text to speech output
"""

import logging
import os
import tempfile
import threading
from datetime import datetime
from typing import Any, Dict, Optional

from app.config.settings import AI_PROMPT_CONFIG, CONNECTION_CONFIG

logger = logging.getLogger(__name__)


# Import GPU optimization modules
try:
    from .gpu_optimization import (
        initialize_gpu,
        get_gpu_info,
        get_optimal_device,
        gpu_model_cache,
        gpu_memory_manager,
        log_gpu_memory
    )
    GPU_OPTIMIZATION_AVAILABLE = True
except ImportError:
    GPU_OPTIMIZATION_AVAILABLE = False
    logger.warning("[WARN] GPU optimization module not available")

# Import TTS module
try:
    from .tts_gpu import speak_text_gpu, get_tts_engine_info, _init_tts_engine
    TTS_IMPORTED = True
except ImportError as e:
    TTS_IMPORTED = False
    logger.debug(f"[DEBUG] TTS module import note: {e}")

# Legacy TTS fallback
_tts_engine = None
_tts_lock = threading.Lock()
TTS_AVAILABLE = False
_tts_initialized_once = False


def _init_tts_engine():
    """Initialize TTS engine"""
    global _tts_engine, TTS_AVAILABLE, _tts_initialized_once

    # Use imported TTS module if available
    if TTS_IMPORTED:
        try:
            from .tts_gpu import _init_tts_engine as init_gpu_tts
            init_gpu_tts()
            TTS_AVAILABLE = True
            return True
        except Exception as e:
            logger.debug(f"[DEBUG] TTS initialization: {e}")
    
    # Legacy SAPI5 initialization (fallback)
    if _tts_engine is not None:
        return True

    try:
        import pyttsx3

        engine = pyttsx3.init()
        voices = engine.getProperty("voices")
        selected_voice = None

        voice_preferences = ["ravi", "david", "zira"]

        for preference in voice_preferences:
            for voice in voices:
                if preference in voice.name.lower():
                    selected_voice = voice
                    if not _tts_initialized_once:
                        logger.info(f"[OK] Found preferred voice: {voice.name}")
                    break
            if selected_voice:
                break

        if not selected_voice and voices:
            selected_voice = voices[0]

        if selected_voice:
            engine.setProperty("voice", selected_voice.id)

        engine.setProperty("rate", 200)
        engine.setProperty("volume", 0.9)

        _tts_engine = engine
        TTS_AVAILABLE = True

        if not _tts_initialized_once:
            logger.info("[OK] Text-to-Speech initialized successfully (SAPI5 fallback)")
            _tts_initialized_once = True

        return True

    except Exception as e:
        logger.error(f"[ERROR] TTS initialization failed: {e}")
        TTS_AVAILABLE = False
        return False


def speak_text(text: str) -> bool:
    """
    Speak text using GPU-accelerated TTS with CPU fallback (blocking call)
    
    Uses:
    1. GPU-accelerated Coqui TTS (5-10x faster) if available
    2. Falls back to Windows SAPI5 if GPU unavailable
    
    Args:
        text: Text to speak

    Returns:
        bool: True if speech was successful
    """
    global _tts_lock

    with _tts_lock:
        try:
            # Try GPU TTS first
            if TTS_AVAILABLE:
                try:
                    if speak_text_gpu(text):
                        return True
                except Exception as e:
                    logger.debug(f"[DEBUG] GPU TTS failed, falling back to SAPI5: {e}")
            
            # Fallback to legacy SAPI5 implementation
            import gc
            gc.collect()

            import pyttsx3

            engine = pyttsx3.init("sapi5", debug=False)
            voices = engine.getProperty("voices")
            selected_voice = None

            voice_preferences = ["ravi", "david", "zira"]

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
                engine.setProperty("voice", selected_voice.id)

            engine.setProperty("rate", 220)
            engine.setProperty("volume", 0.9)

            engine.say(text)
            engine.runAndWait()

            try:
                engine.stop()
            except:
                pass

            del engine
            gc.collect()

            return True

        except Exception as e:
            logger.error(f"[ERROR] TTS error: {e}")
            return False


class WhisperTranscriptionService:
    """
    Service for real-time speech transcription using Whisper with GPU acceleration
    
    GPU ENHANCEMENTS:
    - FP16 precision for faster computation
    - Greedy decoding (beam_size=1) for speed
    - GPU memory caching and management
    """

    def __init__(
        self, model_path: str = r"C:\Users\chama\OneDrive\Desktop\printchakra\ggml-small-q5_1.bin"
    ):
        """Initialize Whisper transcription service with GPU support"""
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
        self.use_whisper_cpp = False
        
        if GPU_OPTIMIZATION_AVAILABLE:
            try:
                initialize_gpu()
                log_gpu_memory("WhisperInit")
            except Exception as e:
                logger.debug(f"[DEBUG] GPU optimization init failed: {e}")

    def _try_load_with_whisper_cpp(self):
        """Try to load using whisper.cpp (if available)"""
        try:
            import whisper_cpp_python

            if not self.is_loaded:
                logger.info(f"Loading GGML model with whisper.cpp: {self.model_path}")
            self.model = whisper_cpp_python.Whisper(self.model_path)
            self.is_loaded = True
            self.use_whisper_cpp = True
            if not hasattr(self, "_logged_load"):
                logger.info("[OK] Whisper GGML model loaded successfully with whisper.cpp")
                self._logged_load = True
            return True
        except Exception as e:
            logger.debug(f"whisper.cpp not available: {e}")
            return False

    def _try_load_with_openai_whisper(self):
        """Fallback to openai-whisper with GPU support"""
        try:
            import torch
            import whisper
            from .gpu_optimization import get_optimal_device

            device = get_optimal_device()

            if not hasattr(self, "_logged_load"):
                logger.info(f"Loading openai-whisper small model on {device.upper()}")
            self.model = whisper.load_model("small", device=device)
            self.is_loaded = True
            self.use_whisper_cpp = False
            self.device = device
            if not hasattr(self, "_logged_load"):
                logger.info(f"[OK] Whisper small model loaded successfully on {device.upper()}")
                self._logged_load = True
            return True
        except Exception as e:
            logger.error(f"[ERROR] Failed to load model: {str(e)}")
            
            # Fallback to base model
            try:
                logger.info("Falling back to base model...")
                import torch
                import whisper
                from .gpu_optimization import get_optimal_device

                device = get_optimal_device()
                self.model = whisper.load_model("base", device=device)
                self.is_loaded = True
                self.use_whisper_cpp = False
                self.device = device
                if not hasattr(self, "_logged_load"):
                    logger.info(f"[OK] Whisper base model loaded successfully on {device.upper()}")
                    self._logged_load = True
                return True
            except Exception as fallback_error:
                logger.error(f"[ERROR] Failed to load fallback model: {str(fallback_error)}")
                return False

    def load_model(self):
        """Load Whisper model into memory"""
        try:
            if os.path.exists(self.model_path):
                logger.info(f"Found local GGML model: {self.model_path}")
                if self._try_load_with_whisper_cpp():
                    return True
                logger.info("[OK] Using openai-whisper model on GPU")
            else:
                logger.info(f"Using standard openai-whisper model on GPU")

            return self._try_load_with_openai_whisper()

        except Exception as e:
            logger.error(f"[ERROR] Failed to load Whisper model: {str(e)}")
            self.is_loaded = False
            return False

    def transcribe_audio(self, audio_data: bytes, language: str = "en") -> Dict[str, Any]:
        """
        Transcribe audio bytes to text
        
        Args:
            audio_data: Audio bytes in WAV format
            language: Language code (default: en)

        Returns:
            Dict with transcription results: {success, text, language, segments, duration}
        """
        if not self.is_loaded:
            if not self.load_model():
                return {"success": False, "error": "Whisper model not loaded", "text": ""}

        try:
            if not audio_data:
                return {"success": False, "error": "Audio data is empty", "text": ""}

            if len(audio_data) < 100:
                return {"success": False, "error": "Audio data too small to process", "text": ""}

            logger.info(f"[INFO] Audio data size: {len(audio_data)} bytes")

            # Validate WAV header
            if audio_data[:4] != b"RIFF":
                logger.warning(f"[WARN] Audio doesn't start with RIFF header")
            else:
                logger.info("[OK] Valid RIFF/WAV header detected")

            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_audio.write(audio_data)
                temp_audio_path = temp_audio.name

            if not os.path.exists(temp_audio_path):
                return {"success": False, "error": "Failed to save temporary audio file", "text": ""}

            file_size = os.path.getsize(temp_audio_path)

            # Verify RIFF structure
            with open(temp_audio_path, "rb") as f:
                file_header = f.read(4)
                if file_header != b"RIFF":
                    logger.error(f"[ERROR] Corrupted WAV file! Header is {file_header}")
                    os.unlink(temp_audio_path)
                    return {"success": False, "error": "Corrupted audio file", "text": ""}

            # Transcribe
            try:
                if GPU_OPTIMIZATION_AVAILABLE:
                    log_gpu_memory("TranscribeBefore")
                
                if self.use_whisper_cpp:
                    result = self.model.transcribe(temp_audio_path)
                    text = result["result"]
                else:
                    import torch
                    from .gpu_optimization import get_optimal_device

                    device = get_optimal_device()
                    use_fp16 = device == 'cuda'

                    if device == 'cuda':
                        try:
                            torch.cuda.empty_cache()
                            torch.cuda.synchronize()
                        except Exception as e:
                            logger.debug(f"[DEBUG] Could not clear GPU cache: {e}")

                    transcribe_options = {
                        "language": language,
                        "task": "transcribe",
                        "fp16": use_fp16,
                        "beam_size": 1,
                        "best_of": 1,
                        "temperature": 0.0,
                        "compression_ratio_threshold": 2.4,
                        "no_speech_threshold": 0.75,
                        "logprob_threshold": -0.5,
                        "condition_on_previous_text": False,
                        "verbose": False,
                    }
                    
                    try:
                        result = self.model.transcribe(temp_audio_path, **transcribe_options)
                    except (RuntimeError, Exception) as te:
                        if device == 'cuda' and ('CUDA' in str(te) or 'cuda' in str(te).lower()):
                            logger.warning(f"[WARN] CUDA error, falling back to CPU")
                            try:
                                torch.cuda.empty_cache()
                            except:
                                pass
                            transcribe_options['fp16'] = False
                            result = self.model.transcribe(temp_audio_path, **transcribe_options)
                        elif isinstance(te, TypeError):
                            result = self.model.transcribe(
                                temp_audio_path, language=language, fp16=use_fp16, verbose=False
                            )
                        else:
                            raise
                    
                    text = result.get("text", "").strip()
                    segments = result.get("segments", [])
                    
                    # Check for no speech
                    if segments:
                        avg_no_speech_prob = sum(seg.get("no_speech_prob", 0) for seg in segments) / len(segments)
                        max_no_speech_prob = max(seg.get("no_speech_prob", 0) for seg in segments)
                        
                        if avg_no_speech_prob > 0.85 or max_no_speech_prob > 0.95:
                            logger.warning(f"[WARN] Background noise detected")
                            os.unlink(temp_audio_path)
                            return {
                                "success": False,
                                "error": "Only background noise detected",
                                "text": "",
                                "no_speech_detected": True,
                                "auto_retry": True
                            }
                        
                        avg_logprob = sum(seg.get("avg_logprob", -1.0) for seg in segments) / len(segments)
                        if avg_logprob < -1.5:
                            logger.warning(f"[WARN] Very low confidence transcription")
                            os.unlink(temp_audio_path)
                            return {
                                "success": False,
                                "error": "Unclear audio",
                                "text": "",
                                "no_speech_detected": True,
                                "auto_retry": True
                            }
                    
                    if not text or text.isspace():
                        os.unlink(temp_audio_path)
                        return {
                            "success": False,
                            "error": "No speech detected",
                            "text": "",
                            "no_speech_detected": True,
                            "auto_retry": True
                        }
                    
            except Exception as transcribe_error:
                logger.error(f"[ERROR] Whisper transcription failed: {str(transcribe_error)}")
                if GPU_OPTIMIZATION_AVAILABLE:
                    from .gpu_optimization import clear_gpu_cache
                    clear_gpu_cache()
                raise transcribe_error

            # Clean up
            try:
                os.unlink(temp_audio_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to delete temp file: {cleanup_error}")
                import gc
                gc.collect()
                try:
                    os.unlink(temp_audio_path)
                except:
                    pass

            if GPU_OPTIMIZATION_AVAILABLE:
                log_gpu_memory("TranscribeAfter")

            return {
                "success": True,
                "text": text,
                "language": language,
                "segments": result.get("segments", []) if not self.use_whisper_cpp else [],
                "duration": result.get("duration", 0) if not self.use_whisper_cpp else 0,
            }

        except Exception as e:
            logger.error(f"[ERROR] Transcription error: {str(e)}")
            try:
                if "temp_audio_path" in locals() and os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
            except:
                pass
            
            if GPU_OPTIMIZATION_AVAILABLE:
                from .gpu_optimization import clear_gpu_cache
                clear_gpu_cache()
            
            return {"success": False, "error": str(e), "text": ""}


class VoiceAIOrchestrator:
    """
    Orchestrates voice AI workflow: Audio → Whisper STT → Text
    
    SIMPLIFIED: No command parsing - frontend handles all interpretation
    """

    def __init__(self):
        """Initialize voice AI orchestrator"""
        self.whisper_service = WhisperTranscriptionService()
        self.session_active = False
        _init_tts_engine()

    def start_session(self) -> Dict[str, Any]:
        """Start a new voice AI session"""
        try:
            if not self.whisper_service.is_loaded:
                whisper_loaded = self.whisper_service.load_model()
                if not whisper_loaded:
                    return {"success": False, "error": "Failed to load Whisper model"}

            self.session_active = True

            return {
                "success": True,
                "message": "Voice AI session started",
                "whisper_loaded": True,
            }

        except Exception as e:
            logger.error(f"[ERROR] Session start error: {str(e)}")
            return {"success": False, "error": str(e)}

    def process_voice_input(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Process voice input - transcribe only, no command parsing
        
        Args:
            audio_data: Audio bytes (WAV format)

        Returns:
            Dict with transcription result
        """
        if not self.session_active:
            return {"success": False, "error": "No active session"}

        try:
            # Step 1: Transcribe audio
            transcription = self.whisper_service.transcribe_audio(audio_data)

            if not transcription.get("success"):
                return {
                    "success": False,
                    "error": f"Transcription failed: {transcription.get('error')}",
                    "no_speech_detected": transcription.get("no_speech_detected", False),
                    "auto_retry": transcription.get("auto_retry", False),
                }

            user_text = transcription.get("text", "").strip()

            if not user_text:
                return {
                    "success": False,
                    "error": "No speech detected",
                    "no_speech_detected": True,
                    "auto_retry": True,
                }

            logger.info(f"[INFO] Transcribed text: {user_text}")

            # Check for exit keyword
            user_text_lower = user_text.lower()
            if "bye printchakra" in user_text_lower or "goodbye" in user_text_lower:
                self.session_active = False
                return {
                    "success": True,
                    "text": user_text,
                    "session_ended": True,
                }

            # Return transcription - frontend handles command parsing
            return {
                "success": True,
                "text": user_text,
                "full_text": user_text,
                "language": transcription.get("language"),
                "session_ended": False,
            }

        except Exception as e:
            logger.error(f"[ERROR] Voice input processing error: {str(e)}")
            return {"success": False, "error": str(e)}

    def end_session(self):
        """End voice AI session"""
        self.session_active = False
        logger.info("Voice AI session ended")

    def speak_text_response(self, text: str) -> Dict[str, Any]:
        """
        Speak text using TTS (blocking call)

        Args:
            text: Text to speak

        Returns:
            dict: Status of TTS operation
        """
        try:
            if not TTS_AVAILABLE:
                return {"success": False, "error": "TTS not available"}

            speak_success = speak_text(text)

            if speak_success:
                return {"success": True, "spoken": True}
            else:
                return {"success": False, "error": "TTS failed to speak"}

        except Exception as e:
            logger.error(f"[ERROR] TTS error: {e}")
            return {"success": False, "error": str(e)}


# Global orchestrator instance
voice_ai_orchestrator = VoiceAIOrchestrator()
