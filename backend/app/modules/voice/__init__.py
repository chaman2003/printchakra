"""
Voice AI Module - Whisper + Local LLM Integration
Handles speech-to-text transcription and AI chat responses with GPU-accelerated TTS output

GPU ENHANCEMENTS:
- Whisper: Optimized with FP16, greedy decoding, minimal parameters
- TTS: GPU-accelerated with Coqui TTS (5-10x faster) + CPU fallback
- Memory: Automatic GPU memory management and caching
"""

import io
import logging
import os
import queue
import shutil
import subprocess
import tempfile
import threading
import time
import wave
from datetime import datetime
from typing import Any, Dict, Optional

from app.config.settings import AI_PROMPT_CONFIG, CONNECTION_CONFIG

logger = logging.getLogger(__name__)

OLLAMA_API_TIMEOUT = 60  # Default voice AI timeout; override via config/prompts


# Import Voice AI prompt management
try:
    from .voice_prompt import VoicePromptManager, OLLAMA_API_TIMEOUT as _PM_TIMEOUT

    OLLAMA_API_TIMEOUT = _PM_TIMEOUT
    VOICE_PROMPT_AVAILABLE = True
except ImportError:
    VoicePromptManager = None  # type: ignore
    VOICE_PROMPT_AVAILABLE = False
    logger.warning("[WARN] Voice prompt module not available")
except Exception as exc:
    VoicePromptManager = None  # type: ignore
    VOICE_PROMPT_AVAILABLE = False
    logger.error(f"[ERROR] Voice prompt module failed to load: {exc}")


def _build_ollama_url(base: str, endpoint: str) -> str:
    """Normalize Ollama endpoint URLs"""

    if endpoint.startswith("http://") or endpoint.startswith("https://"):
        return endpoint
    normalized_base = (base or "http://localhost:11434").rstrip("/")
    normalized_endpoint = endpoint or ""
    if not normalized_endpoint.startswith("/"):
        normalized_endpoint = f"/{normalized_endpoint}"
    return f"{normalized_base}{normalized_endpoint}"


_ollama_settings = CONNECTION_CONFIG.get("ollama", {})
_ollama_base = (_ollama_settings.get("base_url") or "http://localhost:11434").rstrip("/")
OLLAMA_TAGS_URL = _build_ollama_url(_ollama_base, _ollama_settings.get("tags_endpoint", "/api/tags"))
OLLAMA_CHAT_URL = _build_ollama_url(_ollama_base, _ollama_settings.get("chat_endpoint", "/api/chat"))

try:
    OLLAMA_TIMEOUT = int(_ollama_settings.get("timeout", OLLAMA_API_TIMEOUT))
except (TypeError, ValueError):
    OLLAMA_TIMEOUT = OLLAMA_API_TIMEOUT

OLLAMA_VERIFY_SSL = bool(_ollama_settings.get("verify_ssl", False))
DEFAULT_VOICE_MODEL = AI_PROMPT_CONFIG.get("default_model", "smollm2:135m")

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

# Legacy TTS fallback (keep for compatibility)
_tts_engine = None
_tts_lock = threading.Lock()  # Prevent concurrent TTS calls
TTS_AVAILABLE = False

_tts_initialized_once = False  # Track if we've logged TTS init


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
    1. GPU-accelerated Coqui TTS (5-10x faster) if available and GPU detected
    2. Falls back to Windows SAPI5 if GPU unavailable
    
    Args:
        text: Text to speak

    Returns:
        bool: True if speech was successful
    """
    global _tts_lock

    with _tts_lock:
        try:
            # Try GPU TTS first (5-10x faster)
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
    - Minimal parameters for reduced inference time
    - GPU memory caching and management
    - Model stays in VRAM between requests for faster subsequent transcriptions
    """

    def __init__(
        self, model_path: str = r"C:\Users\chama\OneDrive\Desktop\printchakra\ggml-small-q5_1.bin"
    ):
        """
        Initialize Whisper transcription service with GPU support

        Args:
            model_path: Path to local GGML whisper model file
        """
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
        self.use_whisper_cpp = False
        
        # GPU optimization initialization
        if GPU_OPTIMIZATION_AVAILABLE:
            try:
                initialize_gpu()
                log_gpu_memory("WhisperInit")
            except Exception as e:
                logger.debug(f"[DEBUG] GPU optimization init failed: {e}")

    def _try_load_with_whisper_cpp(self):
        """Try to load using whisper.cpp (if available)"""
        try:
            import whisper_cpp_python  # type: ignore

            if not self.is_loaded:  # Only log on first load
                logger.info(f"Loading GGML model with whisper.cpp: {self.model_path}")
            self.model = whisper_cpp_python.Whisper(self.model_path)
            self.is_loaded = True
            self.use_whisper_cpp = True
            if not hasattr(self, "_logged_load"):  # Only log once
                logger.info("[OK] Whisper GGML model loaded successfully with whisper.cpp")
                self._logged_load = True
            return True
        except Exception as e:
            logger.debug(f"whisper.cpp not available: {e}")
            return False

    def _try_load_with_openai_whisper(self):
        """Fallback to openai-whisper with GPU support - optimized for speed"""
        try:
            import torch
            import whisper  # type: ignore
            from .gpu_optimization import get_optimal_device

            # Use get_optimal_device to prefer NVIDIA GPU
            device = get_optimal_device()  # Returns 'cuda' if available, else 'cpu'

            # Use small model for better accuracy (461MB, good balance)
            if not hasattr(self, "_logged_load"):  # Only log once
                logger.info(f"Loading openai-whisper small model on {device.upper()}")
            self.model = whisper.load_model("small", device=device)
            self.is_loaded = True
            self.use_whisper_cpp = False
            self.device = device
            if not hasattr(self, "_logged_load"):  # Only log once
                logger.info(f"[OK] Whisper small model loaded successfully on {device.upper()}")
                logger.info(f"   Model optimized for accuracy (461MB, better transcription)")
                self._logged_load = True
            return True
        except Exception as e:
            logger.error(f"[ERROR] Failed to load base model: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

            # Fallback to base model if small fails
            try:
                logger.info("Falling back to base model...")
                import torch
                import whisper
                from .gpu_optimization import get_optimal_device

                device = get_optimal_device()  # Returns 'cuda' if available, else 'cpu'

                self.model = whisper.load_model("base", device=device)
                self.is_loaded = True
                self.use_whisper_cpp = False
                self.device = device
                if not hasattr(self, "_logged_load"):  # Only log once
                    logger.info(f"[OK] Whisper base model loaded successfully on {device.upper()}")
                    logger.info(f"   Model with balanced performance (244MB)")
                    self._logged_load = True
                return True
            except Exception as fallback_error:
                logger.error(f"[ERROR] Failed to load fallback model: {str(fallback_error)}")
                import traceback

                logger.error(traceback.format_exc())
                return False

    def load_model(self):
        """Load Whisper model into memory"""
        try:
            # Check if GGML model file exists
            if os.path.exists(self.model_path):
                logger.info(f"Found local GGML model: {self.model_path}")

                # Try whisper.cpp first (optimized for GGML)
                if self._try_load_with_whisper_cpp():
                    return True

                # Fallback: Try loading with openai-whisper
                # Note: openai-whisper doesn't directly support GGML, so we fall back to standard model
                logger.info("[OK] Using openai-whisper model on GPU (optimized performance)")
            else:
                logger.info(f"Using standard openai-whisper model on GPU")

            # Use standard model as fallback
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
            Dict with transcription results and metadata
        """
        if not self.is_loaded:
            if not self.load_model():
                return {"success": False, "error": "Whisper model not loaded", "text": ""}

        try:
            # Validate audio data
            if not audio_data:
                return {"success": False, "error": "Audio data is empty", "text": ""}

            if len(audio_data) < 100:  # Minimum reasonable audio file size
                return {"success": False, "error": "Audio data too small to process", "text": ""}

            # Validate WAV format
            logger.info(f"[INFO] Audio data size: {len(audio_data)} bytes")

            # Check WAV header
            if audio_data[:4] != b"RIFF":
                logger.warning(
                    f"[WARN] Audio doesn't start with RIFF header. First 4 bytes: {audio_data[:4]}"
                )
                # Try to convert or handle non-WAV format
                if audio_data[:4] == b"\x1aE\xdf\xa3":  # WebM signature
                    logger.info("Detected WebM format, attempting conversion...")
                    # FFmpeg will attempt conversion
                elif audio_data[:2] == b"\xff\xfb":  # MP3 signature
                    logger.info("Detected MP3 format, attempting conversion...")
            else:
                logger.info("[OK] Valid RIFF/WAV header detected")

            # Save audio to temporary file with proper extension
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_audio.write(audio_data)
                temp_audio_path = temp_audio.name

            # logger.info(f"Created temp audio file: {temp_audio_path}")

            # Verify file was created and has content
            if not os.path.exists(temp_audio_path):
                return {
                    "success": False,
                    "error": "Failed to save temporary audio file",
                    "text": "",
                }

            file_size = os.path.getsize(temp_audio_path)
            # logger.info(f"Temporary audio file size: {file_size} bytes")

            # Verify file is not corrupted by checking RIFF structure
            with open(temp_audio_path, "rb") as f:
                file_header = f.read(4)
                if file_header != b"RIFF":
                    logger.error(f"[ERROR] Corrupted WAV file! Header is {file_header}, not RIFF")
                    logger.error(f"   First 20 bytes: {audio_data[:20]}")
                    os.unlink(temp_audio_path)
                    return {
                        "success": False,
                        "error": f"Corrupted audio file - invalid WAV header. Got {file_header} instead of RIFF",
                        "text": "",
                    }

            # Transcribe based on model type
            try:
                # Log GPU memory before transcription
                if GPU_OPTIMIZATION_AVAILABLE:
                    log_gpu_memory("TranscribeBefore")
                
                if self.use_whisper_cpp:
                    # Use whisper.cpp for GGML model
                    result = self.model.transcribe(temp_audio_path)
                    text = result["result"]
                else:
                    # Use openai-whisper with SPEED-OPTIMIZED GPU settings
                    import torch
                    from .gpu_optimization import get_optimal_device

                    # Check GPU availability for FP16 optimization
                    device = get_optimal_device()  # Returns 'cuda' if available, else 'cpu'
                    use_fp16 = device == 'cuda'

                    # Clear GPU cache before transcription to prevent memory errors
                    if device == 'cuda':
                        try:
                            import torch
                            torch.cuda.empty_cache()
                            torch.cuda.synchronize()
                            logger.debug("[DEBUG] GPU cache cleared for transcription")
                        except Exception as e:
                            logger.debug(f"[DEBUG] Could not clear GPU cache: {e}")

                    # Build transcription options with GPU acceleration
                    transcribe_options = {
                        "language": language,
                        "task": "transcribe",
                        "fp16": use_fp16,  # Use FP16 on GPU for 2x speedup
                        "beam_size": 1,  # FAST: Greedy decoding (5→1 = 5x faster)
                        "best_of": 1,  # FAST: Single candidate (5→1 = no extra sampling)
                        "temperature": 0.0,  # FAST: Deterministic, no fallback
                        "compression_ratio_threshold": 2.4,
                        "no_speech_threshold": 0.75,
                        "logprob_threshold": -0.5,
                        "condition_on_previous_text": False,  # FAST: Each chunk independent
                        "verbose": False,
                    }
                    
                    try:
                        result = self.model.transcribe(temp_audio_path, **transcribe_options)
                    except (RuntimeError, Exception) as te:
                        # CUDA error fallback: Switch to CPU and retry
                        if device == 'cuda' and ('CUDA' in str(te) or 'cuda' in str(te).lower()):
                            logger.warning(f"[WARN] CUDA error during transcription, falling back to CPU: {str(te)[:100]}")
                            try:
                                torch.cuda.empty_cache()
                                torch.cuda.synchronize()
                            except:
                                pass
                            
                            # Retry with CPU
                            transcribe_options_cpu = transcribe_options.copy()
                            transcribe_options_cpu['fp16'] = False  # CPU doesn't support FP16
                            result = self.model.transcribe(temp_audio_path, **transcribe_options_cpu)
                            logger.info("[OK] Transcription succeeded on CPU fallback")
                        elif isinstance(te, TypeError):
                            # Handle version compatibility issues
                            if "vad_filter" in str(te) or "DecodingOptions" in str(te):
                                logger.warning(f"[WARN] Parameter compatibility issue: {te}")
                                result = self.model.transcribe(
                                    temp_audio_path,
                                    language=language,
                                    fp16=use_fp16,
                                    verbose=False
                                )
                            else:
                                raise
                        else:
                            raise
                    
                    text = result.get("text", "").strip()
                    segments = result.get("segments", [])
                    
                    # Level 1: Check no_speech_prob for each segment (VERY RELAXED)
                    if segments:
                        # Calculate average no_speech probability across all segments
                        avg_no_speech_prob = sum(seg.get("no_speech_prob", 0) for seg in segments) / len(segments)
                        max_no_speech_prob = max(seg.get("no_speech_prob", 0) for seg in segments)
                        
                        # RELAXED: Only reject if VERY HIGH confidence it's noise (avg > 0.85 OR max > 0.95)
                        # This allows quiet/distant speech, accents, and background noise during speech
                        if avg_no_speech_prob > 0.85 or max_no_speech_prob > 0.95:
                            logger.warning(f"[WARN] Background noise detected (avg: {avg_no_speech_prob:.2f}, max: {max_no_speech_prob:.2f})")
                            os.unlink(temp_audio_path)
                            return {
                                "success": False,
                                "error": "Only background noise detected. Please speak clearly.",
                                "text": "",
                                "no_speech_detected": True,
                                "auto_retry": True
                            }
                        
                        # Level 2: Check average log probability (confidence in transcription)
                        avg_logprob = sum(seg.get("avg_logprob", -1.0) for seg in segments) / len(segments)
                        
                        # MUCH MORE RELAXED: Only reject if extremely low confidence (< -1.5)
                        # This accepts normal speech with accents, quiet speech, or some background noise
                        # -1.08 (your case) will now PASS and be transcribed
                        if avg_logprob < -1.5:
                            logger.warning(f"[WARN] Very low confidence transcription (avg_logprob: {avg_logprob:.2f}) - likely background noise")
                            os.unlink(temp_audio_path)
                            return {
                                "success": False,
                                "error": "Unclear audio. Please speak louder and clearer.",
                                "text": "",
                                "no_speech_detected": True,
                                "auto_retry": True
                            }
                        else:
                            # Log acceptance for debugging
                            logger.info(f"[OK] Speech accepted (no_speech: avg={avg_no_speech_prob:.2f}, max={max_no_speech_prob:.2f}, logprob={avg_logprob:.2f})")
                    
                    # Level 3: Check if transcribed text is too short or gibberish (RELAXED)
                    if text:
                        word_count = len(text.split())
                        # RELAXED: Accept even single words (e.g., "print", "scan", "yes", "no")
                        # Only reject completely empty or very suspicious results
                        if word_count < 1:
                            logger.warning(f"[WARN] Transcription too short ({word_count} words): '{text}' - likely background noise")
                            os.unlink(temp_audio_path)
                            return {
                                "success": False,
                                "error": "No clear speech detected. Please try again.",
                                "text": "",
                                "no_speech_detected": True,
                                "auto_retry": True
                            }
                        
                        # Log what we transcribed
                        logger.info(f"[INFO] Transcribed: '{text}' ({word_count} words)")
                    
                    # Level 4: Check for empty or whitespace-only transcription
                    if not text or text.isspace():
                        logger.warning(f"[WARN] Empty transcription - background noise only")
                        os.unlink(temp_audio_path)
                        return {
                            "success": False,
                            "error": "No human speech detected. Please try again.",
                            "text": "",
                            "no_speech_detected": True,
                            "auto_retry": True
                        }
                    
            except Exception as transcribe_error:
                logger.error(f"[ERROR] Whisper transcription failed: {str(transcribe_error)}")
                logger.error(f"   Error type: {type(transcribe_error).__name__}")

                # Try to clear GPU cache and recover
                if GPU_OPTIMIZATION_AVAILABLE:
                    try:
                        from .gpu_optimization import clear_gpu_cache
                        clear_gpu_cache()
                        logger.info("[OK] GPU cache cleared after error")
                    except Exception as cache_error:
                        logger.debug(f"[DEBUG] Could not clear GPU cache: {cache_error}")

                # Check if it's a file access error
                if (
                    "End of file" in str(transcribe_error)
                    or "invalid" in str(transcribe_error).lower()
                ):
                    logger.error(
                        f"   This suggests the audio file is corrupted or not in valid WAV format"
                    )
                    logger.error(f"   File size: {file_size} bytes")

                raise transcribe_error

            # Clean up
            try:
                os.unlink(temp_audio_path)
            except Exception as cleanup_error:
                logger.warning(f"Failed to delete temp file immediately: {cleanup_error}")
                # Try to remove it later via garbage collection
                import gc

                gc.collect()
                try:
                    os.unlink(temp_audio_path)
                except:
                    logger.debug(f"Could not delete temp file: {temp_audio_path}")

            # Log GPU memory after transcription and cleanup
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
            logger.error(f"   Error type: {type(e).__name__}")
            # Try to clean up temp file if it exists
            try:
                if "temp_audio_path" in locals() and os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
            except:
                # Force cleanup with garbage collection
                import gc

                gc.collect()
                try:
                    if "temp_audio_path" in locals() and os.path.exists(temp_audio_path):
                        os.unlink(temp_audio_path)
                except:
                    pass
            
            # Cleanup GPU memory on error
            if GPU_OPTIMIZATION_AVAILABLE:
                from .gpu_optimization import clear_gpu_cache
                clear_gpu_cache()
            
            return {"success": False, "error": str(e), "text": ""}


class VoiceChatService:
    """
    Service for AI chat responses using Voice AI via Ollama
    Fast, efficient local inference with intelligent voice command interpretation
    """

    def __init__(self, model_name: Optional[str] = None):
        """
        Initialize Voice AI chat service with full orchestration awareness

        Args:
            model_name: Ollama model to use
        """
        self.model_name = model_name or DEFAULT_VOICE_MODEL
        self.conversation_history = []
        self.pending_orchestration = None  # Track if waiting for confirmation (print/scan)
        self.ollama_chat_url = OLLAMA_CHAT_URL
        self.ollama_tags_url = OLLAMA_TAGS_URL
        self.api_timeout = max(1, OLLAMA_TIMEOUT) if OLLAMA_TIMEOUT else OLLAMA_API_TIMEOUT
        self.verify_ssl = OLLAMA_VERIFY_SSL
        
        # Import command mappings from centralized module
        if VOICE_PROMPT_AVAILABLE:
            self.command_mappings = VoicePromptManager.get_command_mappings()
            self.system_prompt = VoicePromptManager.get_system_prompt()
        else:
            # Fallback if prompt manager not available
            self.command_mappings = {}
            self.system_prompt = ""

    def check_ollama_available(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            import requests

            timeout = min(5, self.api_timeout or OLLAMA_API_TIMEOUT)
            response = requests.get(
                self.ollama_tags_url,
                timeout=timeout,
                verify=self.verify_ssl,
            )
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                target_fragment = (self.model_name or "").split(":")[0].lower()
                has_model = True
                if target_fragment:
                    has_model = any(target_fragment in (name or "").lower() for name in model_names)
                # Only log once at startup
                if not hasattr(self, "_logged_ollama_check"):
                    logger.info(f"Ollama available via {self.ollama_tags_url}: {has_model}")
                    logger.info(f"Available models: {model_names}")
                    self._logged_ollama_check = True
                return has_model
            return False
        except Exception as e:
            if not hasattr(self, "_logged_ollama_error"):
                logger.error(f"Ollama check failed: {str(e)}")
                self._logged_ollama_error = True
            return False

    def _parse_command_parameters(self, user_message: str, command_type: str) -> Dict[str, Any]:
        """
        Parse parameters from voice command
        
        Args:
            user_message: User's spoken text
            command_type: Detected command type
            
        Returns:
            Dict with parsed parameters
        """
        params = {}
        text_lower = user_message.lower().strip()
        
        # Parse document selection (e.g., "select original number 2")
        if command_type == "select_document":
            import re
            
            # Extract section keywords and normalize to dashboard terms
            if any(keyword in text_lower for keyword in ["original", "current", "recent"]):
                params["section"] = "current"
            elif "converted" in text_lower:
                params["section"] = "converted"
            elif any(keyword in text_lower for keyword in ["uploaded", "upload", "new"]):
                params["section"] = "upload"
            
            # Extract document number (1-based)
            number_match = re.search(r'(?:number|item|file|doc|#)\s*(\d+)', text_lower)
            if number_match:
                params["document_number"] = int(number_match.group(1))
            else:
                # Try to find standalone number
                number_match = re.search(r'\b(\d+)\b', text_lower)
                if number_match:
                    params["document_number"] = int(number_match.group(1))
            
            if "first" in text_lower:
                params["document_number"] = 1
            elif "second" in text_lower:
                params["document_number"] = 2
            elif "third" in text_lower:
                params["document_number"] = 3
            elif "last" in text_lower:
                params["document_number"] = -1  # indicate special handling downstream
            
            if "section" not in params:
                params["section"] = "current"
            if "document_number" not in params:
                params["document_number"] = 1
        
        # Parse section switching (e.g., "switch to converted")
        elif command_type == "switch_section":
            if any(keyword in text_lower for keyword in ["original", "current", "recent"]):
                params["section"] = "current"
            elif "converted" in text_lower:
                params["section"] = "converted"
            elif any(keyword in text_lower for keyword in ["uploaded", "upload", "new"]):
                params["section"] = "upload"
        
        return params

    def interpret_voice_command(self, user_message: str) -> tuple[Optional[str], float]:
        """
        Intelligently interpret voice commands with fuzzy matching
        
        Args:
            user_message: User's spoken text
            
        Returns:
            Tuple of (command_type, confidence_score) or (None, 0) if no match
        """
        try:
            from difflib import SequenceMatcher
            
            user_lower = user_message.lower().strip()
            best_command = None
            best_confidence = 0.0
            
            # Check each command type
            for command_type, keywords in self.command_mappings.items():
                for keyword in keywords:
                    # Exact match gets highest confidence
                    if user_lower == keyword:
                        logger.info(f"[OK] EXACT MATCH: '{user_message}' → {command_type}")
                        return command_type, 1.0
                    
                    # Substring match within message (contains keyword)
                    if keyword in user_lower:
                        confidence = 0.9
                        if confidence > best_confidence:
                            best_command = command_type
                            best_confidence = confidence
                        logger.info(f"[MATCH] SUBSTRING MATCH: '{user_message}' contains '{keyword}' → {command_type} (confidence: {confidence})")
                        continue
                    
                    # Fuzzy match (similarity score)
                    similarity = SequenceMatcher(None, user_lower, keyword).ratio()
                    if similarity > 0.75:  # >75% similar
                        if similarity > best_confidence:
                            best_command = command_type
                            best_confidence = similarity
                        logger.info(f"🔀 FUZZY MATCH: '{user_message}' ≈ '{keyword}' → {command_type} (confidence: {similarity:.2f})")
            
            if best_command and best_confidence > 0.6:
                if best_command == "select_document":
                    required = any(keyword in user_lower for keyword in ["document", "file", "doc", "page", "item"])
                    if not required:
                        logger.info(
                            f"[SKIP] Select command lacked document context → '{user_message}'"
                        )
                        return None, 0.0
                if best_command == "switch_section":
                    required = any(keyword in user_lower for keyword in ["section", "tab", "converted", "original", "upload"])
                    if not required:
                        logger.info(
                            f"[SKIP] Switch section command lacked section keywords → '{user_message}'"
                        )
                        return None, 0.0

                logger.info(f"[OK] COMMAND INTERPRETED: {best_command} (confidence: {best_confidence:.2f})")
                return best_command, best_confidence
            
            logger.info(f"[NO MATCH] NO COMMAND MATCH: '{user_message}' (best match: {best_command} @ {best_confidence:.2f})")
            return None, 0.0
            
        except Exception as e:
            logger.error(f"Error interpreting voice command: {e}")
            return None, 0.0

    def generate_response(self, user_message: str) -> Dict[str, Any]:
        """
        Generate AI response to user message with intelligent command interpretation
        First tries to match voice commands, then handles print/scan, then general chat

        Args:
            user_message: User's text input

        Returns:
            Dict with AI response and metadata
        """
        try:
            import requests

            user_lower = user_message.lower().strip()
            
            logger.info(f"[SEARCH] Processing message: '{user_message}' | Pending orchestration: {self.pending_orchestration}")

            # PRIORITY -1: Check for GREETINGS - Respond with friendly introduction
            is_greeting = False
            if VOICE_PROMPT_AVAILABLE:
                is_greeting = VoicePromptManager.is_greeting(user_message)
            else:
                greeting_words = ["hello", "hi", "hey", "greetings", "howdy", "good morning", "good afternoon", "good evening"]
                is_greeting = any(word in user_lower for word in greeting_words)
            
            if is_greeting:
                # Greeting detected - Return friendly concise introduction
                greeting_response = "Hello! I'm PrintChakra AI. Say print or scan to get started."
                logger.info(f"[GREETING] Recognized greeting: '{user_message}'")
                
                self.conversation_history.append({"role": "user", "content": user_message})
                self.conversation_history.append({"role": "assistant", "content": greeting_response})
                
                # Keep only last 8 exchanges (16 messages) for context
                if len(self.conversation_history) > 16:
                    self.conversation_history = self.conversation_history[-16:]
                
                return {
                    "success": True,
                    "response": greeting_response,
                    "model": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "tts_enabled": TTS_AVAILABLE,
                    "spoken": False,
                }

            # PRIORITY 0: Check for DIRECT print/scan commands FIRST - HIGHEST PRIORITY
            # These should take precedence over any other command interpretation
            is_print_command = False
            is_scan_command = False
            
            if VOICE_PROMPT_AVAILABLE:
                is_print_command = VoicePromptManager.is_print_command(user_message)
                is_scan_command = VoicePromptManager.is_scan_command(user_message)
            else:
                print_keywords = ["print", "printing", "printout", "print doc", "print file", "print paper", "print document", "i want to print", "need to print"]
                scan_keywords = ["scan", "scanning", "capture", "scan doc", "scan file", "capture doc", "capture document", "scan document"]
                question_words = ["what", "can you", "how do", "help", "how to", "tell me", "can i", "what is", "can print", "help me", "show me"]
                is_question = any(word in user_lower for word in question_words)
                is_print_command = any(keyword in user_lower for keyword in print_keywords) and not is_question
                is_scan_command = any(keyword in user_lower for keyword in scan_keywords) and not is_question
            
            if is_print_command:
                # Direct print command detected - TRIGGER IMMEDIATELY
                ai_response = f"TRIGGER_ORCHESTRATION:print Opening print interface now!"
                logger.info(f"[PRINT] DIRECT PRINT COMMAND - TRIGGERING IMMEDIATELY | Message: '{user_message}'")
                
                self.conversation_history.append({"role": "user", "content": user_message})
                self.conversation_history.append({"role": "assistant", "content": ai_response})
                
                return {
                    "success": True,
                    "response": "Opening print interface!",
                    "model": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "tts_enabled": TTS_AVAILABLE,
                    "spoken": False,
                    "orchestration_trigger": True,
                    "orchestration_mode": "print",
                }
            
            if is_scan_command:
                # Direct scan command detected - TRIGGER IMMEDIATELY
                ai_response = f"TRIGGER_ORCHESTRATION:scan Opening scan interface now!"
                logger.info(f"[SCAN] DIRECT SCAN COMMAND - TRIGGERING IMMEDIATELY | Message: '{user_message}'")
                
                self.conversation_history.append({"role": "user", "content": user_message})
                self.conversation_history.append({"role": "assistant", "content": ai_response})
                
                return {
                    "success": True,
                    "response": "Opening scan interface!",
                    "model": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "tts_enabled": TTS_AVAILABLE,
                    "spoken": False,
                    "orchestration_trigger": True,
                    "orchestration_mode": "scan",
                }

            # PRIORITY 1: Try to interpret as a voice command (navigation, control)
            command_type, confidence = self.interpret_voice_command(user_message)
            if command_type and confidence > 0.7:  # High confidence command match
                # Parse command parameters for document selector
                command_params = self._parse_command_parameters(user_message, command_type)
                if command_type == "select_document":
                    command_params.setdefault("section", "current")
                    command_params.setdefault("document_number", 1)
                elif command_type == "switch_section":
                    command_params.setdefault("section", "current")
                
                ai_response = f"VOICE_COMMAND:{command_type} Executing {command_type}!"
                logger.info(f"[OK] VOICE COMMAND DETECTED: {command_type} (confidence: {confidence:.2f}, params: {command_params})")
                
                # Add to history
                self.conversation_history.append({"role": "user", "content": user_message})
                self.conversation_history.append({"role": "assistant", "content": ai_response})
                
                if VOICE_PROMPT_AVAILABLE:
                    friendly_response = VoicePromptManager.get_friendly_command_response(
                        command_type,
                        command_params,
                    )
                else:
                    friendly_response = f"Got it! {command_type.replace('_', ' ').title()}."

                return {
                    "success": True,
                    "response": friendly_response,
                    "model": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "tts_enabled": TTS_AVAILABLE,
                    "spoken": False,
                    "voice_command": command_type,
                    "command_confidence": confidence,
                    "command_params": command_params,
                }

            # PRIORITY 2: Check for confirmation if we have pending orchestration
            if self.pending_orchestration:
                is_confirmation = False
                if VOICE_PROMPT_AVAILABLE:
                    is_confirmation = VoicePromptManager.is_confirmation(user_message)
                else:
                    confirmation_words = ["yes", "proceed", "go ahead", "okay", "ok", "sure", "yep", "yeah", "ye"]
                    is_confirmation = any(
                        user_lower == word or user_lower.startswith(word + " ") for word in confirmation_words
                    )
                if is_confirmation:
                    mode = self.pending_orchestration
                    self.pending_orchestration = None  # Clear pending state
                    
                    ai_response = f"TRIGGER_ORCHESTRATION:{mode} Opening {mode} interface now!"
                    logger.info(f"[OK] TRIGGERING ORCHESTRATION: {mode}")
                    
                    # Add to history
                    self.conversation_history.append({"role": "user", "content": user_message})
                    self.conversation_history.append({"role": "assistant", "content": ai_response})
                    
                    return {
                        "success": True,
                        "response": ai_response,
                        "model": self.model_name,
                        "timestamp": datetime.now().isoformat(),
                        "tts_enabled": TTS_AVAILABLE,
                        "spoken": False,
                    }
                else:
                    # User said something else - clear pending and continue conversation
                    logger.info(f"[WARN] User response not a confirmation, clearing pending state")
                    self.pending_orchestration = None

            # Add user message to history for general conversation
            self.conversation_history.append({"role": "user", "content": user_message})

            # Build messages for Ollama
            messages = [
                {"role": "system", "content": self.system_prompt}
            ] + self.conversation_history

            # Call Ollama API with speed optimizations using centralized query builder
            if VOICE_PROMPT_AVAILABLE:
                query = VoicePromptManager.build_ollama_query(self.model_name, messages)
            else:
                # Fallback query if prompt manager not available
                query = {
                    "model": self.model_name,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40,
                        "num_predict": 30,
                        "num_ctx": 1024,
                        "repeat_penalty": 1.2,
                        "stop": ["\n\n", "User:", "Assistant:"],
                    },
                }
            
            response = requests.post(
                self.ollama_chat_url,
                json=query,
                timeout=self.api_timeout or OLLAMA_API_TIMEOUT,
                verify=self.verify_ssl,
            )

            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("message", {}).get("content", "").strip()

                # Format response using centralized prompt manager
                if VOICE_PROMPT_AVAILABLE:
                    ai_response = VoicePromptManager.format_response(ai_response)
                else:
                    # Fallback formatting if prompt manager not available
                    ai_response = ai_response.replace("**", "").replace("*", "")
                    words = ai_response.split()
                    if len(words) > 25:
                        truncated = " ".join(words[:25])
                        if truncated and truncated[-1] not in ".!?":
                            truncated += "."
                        ai_response = truncated
                    if ai_response and ai_response[-1] not in ".!?":
                        ai_response += "."

                # Add assistant response to history
                self.conversation_history.append({"role": "assistant", "content": ai_response})

                # Keep only last 8 exchanges (16 messages) for context
                if len(self.conversation_history) > 16:
                    self.conversation_history = self.conversation_history[-16:]

                # logger.info(f"[OK] AI Response ({len(words)} words): {ai_response}")

                # Return response FIRST (so frontend displays it immediately)
                # TTS will be triggered separately by frontend
                return {
                    "success": True,
                    "response": ai_response,
                    "model": self.model_name,
                    "timestamp": datetime.now().isoformat(),
                    "tts_enabled": TTS_AVAILABLE,
                    "spoken": False,  # Will be spoken by separate endpoint
                }
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return {
                    "success": False,
                    "error": f"Ollama API error: {response.status_code}",
                    "response": "",
                }

        except Exception as e:
            logger.error(f"[ERROR] Chat generation error: {str(e)}")
            return {"success": False, "error": str(e), "response": ""}

    def reset_conversation(self):
        """Clear conversation history and pending orchestration"""
        self.conversation_history = []
        self.pending_orchestration = None
        logger.info("Conversation history cleared")


class VoiceAIOrchestrator:
    """
    Orchestrates the complete voice AI workflow:
    Audio → Whisper → Text → Voice AI → Response
    """

    def __init__(self):
        """Initialize voice AI orchestrator"""
        self.whisper_service = WhisperTranscriptionService()
        self.chat_service = VoiceChatService()
        self.session_active = False

        # Initialize TTS
        _init_tts_engine()

    def start_session(self) -> Dict[str, Any]:
        """Start a new voice AI session"""
        try:
            # Load Whisper model
            if not self.whisper_service.is_loaded:
                whisper_loaded = self.whisper_service.load_model()
                if not whisper_loaded:
                    return {"success": False, "error": "Failed to load Whisper model"}

            # Check Ollama
            ollama_available = self.chat_service.check_ollama_available()
            if not ollama_available:
                return {
                    "success": False,
                    "error": "Ollama not available or smollm2:135m model not found",
                }

            # Reset conversation
            self.chat_service.reset_conversation()
            self.session_active = True

            # logger.info("[OK] Voice AI session started")
            return {
                "success": True,
                "message": "Voice AI session started",
                "whisper_loaded": True,
                "ollama_available": True,
            }

        except Exception as e:
            logger.error(f"[ERROR] Session start error: {str(e)}")
            return {"success": False, "error": str(e)}

    def process_voice_input(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Process voice input through complete pipeline
        Requires "hey" wake word to trigger AI processing

        Args:
            audio_data: Audio bytes (WAV format)

        Returns:
            Dict with transcription and AI response
        """
        if not self.session_active:
            return {"success": False, "error": "No active session. Start a session first."}

        try:
            # Step 1: Transcribe audio
            transcription = self.whisper_service.transcribe_audio(audio_data)

            if not transcription.get("success"):
                return {
                    "success": False,
                    "error": f"Transcription failed: {transcription.get('error')}",
                    "stage": "transcription",
                    "requires_keyword": True,
                }

            user_text = transcription.get("text", "").strip()

            if not user_text:
                return {
                    "success": False,
                    "error": "No speech detected - please speak clearly",
                    "stage": "transcription",
                    "requires_keyword": True,
                }

            logger.info(f"[INFO] Transcribed text: {user_text}")

            # Convert to lowercase for processing
            user_text_lower = user_text.lower()

            # Filter out filler speech / accidental triggers to prevent unwanted processing
            filler_phrases = [
                "thank you", "thanks", "thank", "okay", "alright", "all right",
                "sure", "fine", "great", "cool", "nice", "good", "perfect",
                "hmm", "umm", "uh", "huh", "yeah yeah", "yep yep",
                "i see", "got it", "makes sense", "understood"
            ]
            
            user_text_stripped = user_text_lower.strip().strip(".,!?")
            
            # Check if entire input is just filler speech
            if user_text_stripped in filler_phrases or len(user_text_stripped) < 3:
                logger.info(f"[SKIP] Filler speech detected, ignoring: '{user_text}'")
                return {
                    "success": True,
                    "user_text": user_text,
                    "ai_response": "You're welcome!" if "thank" in user_text_lower else "👍",
                    "filler_speech_detected": True,
                    "auto_retry": True,  # Signal frontend to continue listening
                    "session_ended": False,
                    "requires_keyword": False,
                }

            # Remove optional wake words from beginning (if present)
            wake_words = ["hey", "hi", "hello", "okay"]

            for wake_word in wake_words:
                if user_text_lower.startswith(wake_word):
                    # Remove wake word from beginning
                    user_text = user_text[len(wake_word) :].strip()
                    user_text_lower = user_text.lower()
                    logger.info(f"[OK] Removed wake word, processing: {user_text}")
                    break

            # Process all speech input (no wake word required)
            logger.info(f"[OK] Processing speech: {user_text}")

            # Check for exit keyword
            if "bye printchakra" in user_text_lower or "goodbye" in user_text_lower:
                self.session_active = False
                return {
                    "success": True,
                    "user_text": user_text,
                    "ai_response": "Goodbye! Voice session ended.",
                    "session_ended": True,
                    "requires_keyword": False,
                }

            # Step 2: Generate AI response (wake word validated)
            chat_response = self.chat_service.generate_response(user_text)

            if not chat_response.get("success"):
                return {
                    "success": False,
                    "error": f"Chat generation failed: {chat_response.get('error')}",
                    "user_text": user_text,
                    "stage": "chat",
                    "requires_keyword": False,
                }

            ai_response = chat_response.get("response", "")

            # Step 3: Check for orchestration triggers in AI response
            orchestration_trigger = None
            orchestration_mode = None
            
            if "TRIGGER_ORCHESTRATION:" in ai_response:
                # Extract orchestration mode from trigger
                trigger_start = ai_response.index("TRIGGER_ORCHESTRATION:")
                trigger_end = ai_response.find(" ", trigger_start)
                if trigger_end == -1:
                    trigger_end = len(ai_response)
                
                trigger_text = ai_response[trigger_start:trigger_end]
                if "print" in trigger_text.lower():
                    orchestration_mode = "print"
                    orchestration_trigger = True
                elif "scan" in trigger_text.lower():
                    orchestration_mode = "scan"
                    orchestration_trigger = True
                
                # Remove trigger from response (clean display text)
                ai_response = ai_response.replace(trigger_text, "").strip()
            
            # Step 4: Extract configuration parameters from user text
            config_params = self._extract_config_parameters(user_text_lower)

            return {
                "success": True,
                "user_text": user_text,
                "ai_response": ai_response,
                "transcription_language": transcription.get("language"),
                "model": chat_response.get("model"),
                "session_ended": False,
                "requires_keyword": False,
                "orchestration_trigger": orchestration_trigger,
                "orchestration_mode": orchestration_mode,
                "config_params": config_params,
            }

        except Exception as e:
            logger.error(f"[ERROR] Voice input processing error: {str(e)}")
            return {"success": False, "error": str(e), "stage": "unknown", "requires_keyword": True}

    def _extract_config_parameters(self, text: str) -> Dict[str, Any]:
        """
        Extract configuration parameters from user text
        
        Args:
            text: User command text (lowercase)
            
        Returns:
            Dict with extracted parameters
        """
        params: Dict[str, Any] = {}
        import re

        def contains_any(phrases):
            return any(phrase in text for phrase in phrases)

        # Color / mono detection
        if contains_any(["full color", "color copy", "print in color", "color mode", "black and white", "black & white", "bw", "mono", "monochrome", "greyscale", "gray scale", "grey scale", "grayscale", "grey scale", "gray mode"]):
            params["colorMode"] = "color"
        elif "color" in text:
            params["colorMode"] = "color"

        # Layout detection
        if contains_any(["landscape", "horizontal", "wide"]):
            params["layout"] = "landscape"
        elif contains_any(["portrait", "vertical", "tall"]):
            params["layout"] = "portrait"

        # Resolution detection
        dpi_match = re.search(r'(\d+)\s*dpi', text)
        if dpi_match:
            params["resolution"] = dpi_match.group(1)
        elif contains_any(["ultra quality", "high quality", "high res", "best quality"]):
            params["resolution"] = "600"
            params["quality"] = "high"
        elif contains_any(["draft quality", "fast draft", "low quality", "low res"]):
            params["resolution"] = "150"
            params["quality"] = "draft"

        # Copies detection (for print)
        copies_match = re.search(r'(\d+)\s*(?:cop(?:y|ies)|prints|pages)', text)
        if copies_match:
            params["copies"] = int(copies_match.group(1))
        elif contains_any(["single copy", "one copy"]):
            params["copies"] = 1

        # Paper size detection
        if contains_any(["a4", "a 4"]):
            params["paperSize"] = "A4"
        elif contains_any(["letter size", "us letter", "letter paper"]):
            params["paperSize"] = "Letter"
        elif contains_any(["legal size", "legal paper"]):
            params["paperSize"] = "Legal"
        elif "a3" in text or "a 3" in text:
            params["paperSize"] = "A3"

        # Page range detection (print)
        page_range_match = re.search(r'page(?:s)?\s+(\d+)(?:\s*-\s*|\s+to\s+)(\d+)', text)
        if page_range_match:
            params["pages"] = "custom"
            params["customRange"] = f"{page_range_match.group(1)}-{page_range_match.group(2)}"
        elif contains_any(["odd pages", "odd page", "only odd", "odd only", "just odd"]):
            params["pages"] = "odd"
        elif contains_any(["even pages", "even page", "only even", "even only", "just even"]):
            params["pages"] = "even"
        elif "all pages" in text or "entire document" in text:
            params["pages"] = "all"

        # Pages per sheet detection
        pages_per_sheet_match = re.search(r'(\d+)\s*(?:per\s*(?:sheet|page|side))', text)
        if pages_per_sheet_match:
            params["pagesPerSheet"] = pages_per_sheet_match.group(1)

        # Scale detection
        scale_match = re.search(r'(\d{2,3})\s*(?:%|percent)', text)
        if scale_match:
            params["scale"] = int(scale_match.group(1))

        # Margin detection
        if contains_any(["no margin", "borderless", "edge to edge", "full bleed"]):
            params["margins"] = "none"
        elif contains_any(["narrow margin", "small margin", "thin margin"]):
            params["margins"] = "narrow"
        elif contains_any(["default margin", "standard margin", "normal margin"]):
            params["margins"] = "default"

        # Duplex / simplex detection
        if contains_any(["double sided", "two sided", "both sides", "duplex"]):
            params["duplex"] = True
        elif contains_any(["single sided", "one sided", "front only", "simplex"]):
            params["duplex"] = False

        # Quality detection (explicit phrases)
        if contains_any(["high quality", "best quality", "premium quality"]):
            params["quality"] = "high"
        elif contains_any(["normal quality", "standard quality"]):
            params["quality"] = "normal"
        elif contains_any(["draft quality", "eco mode", "economy mode"]):
            params["quality"] = "draft"

        # Text mode detection (for scan)
        if contains_any(["text mode", "ocr", "extract text", "enable ocr", "turn on ocr"]):
            params["scanTextMode"] = True
        elif contains_any(["disable ocr", "turn off ocr", "no text mode"]):
            params["scanTextMode"] = False

        # Format detection (scan/export)
        if "pdf" in text:
            params["format"] = "pdf"
        elif "png" in text:
            params["format"] = "png"
        elif "tiff" in text or "tif" in text:
            params["format"] = "tiff"
        elif "jpg" in text or "jpeg" in text:
            params["format"] = "jpg"

        # Scan-specific page mode detection
        scan_page_match = re.search(r'scan\s+page(?:s)?\s+(\d+)(?:\s*-\s*|\s+to\s+)(\d+)', text)
        if scan_page_match:
            params["scanPageMode"] = "custom"
            params["scanCustomRange"] = f"{scan_page_match.group(1)}-{scan_page_match.group(2)}"
        elif contains_any(["scan odd", "scan only odd"]):
            params["scanPageMode"] = "odd"
        elif contains_any(["scan even", "scan only even"]):
            params["scanPageMode"] = "even"
        elif contains_any(["scan everything", "scan all pages"]):
            params["scanPageMode"] = "all"

        # Scan mode (single vs multi)
        if contains_any(["batch scan", "multi page", "multiple pages", "continuous scan", "stack feed"]):
            params["scanMode"] = "multi"
        elif contains_any(["single page", "one page", "single scan"]):
            params["scanMode"] = "single"

        # Orientation hints that explicitly mention scan
        if contains_any(["scan landscape"]):
            params["scanLayout"] = "landscape"
        elif contains_any(["scan portrait"]):
            params["scanLayout"] = "portrait"

        # Paper size hints mentioning scan specifically
        if contains_any(["scan letter", "scan on letter"]):
            params["scanPaperSize"] = "Letter"
        elif contains_any(["scan legal"]):
            params["scanPaperSize"] = "Legal"

        return params

    def end_session(self):
        """End voice AI session"""
        self.session_active = False
        self.chat_service.reset_conversation()
        logger.info("Voice AI session ended")

    def speak_text_response(self, text: str) -> Dict[str, Any]:
        """
        Speak text using TTS (blocking call)
        Used to play TTS after message is displayed

        Args:
            text: Text to speak

        Returns:
            dict: Status of TTS operation
        """
        try:
            if not TTS_AVAILABLE:
                return {"success": False, "error": "TTS not available"}

            # logger.info("🔊 Starting TTS (blocking)...")
            speak_success = speak_text(text)

            if speak_success:
                # logger.info("[OK] TTS completed successfully")
                return {"success": True, "spoken": True}
            else:
                logger.warning("[WARN] TTS returned False")
                return {"success": False, "error": "TTS failed to speak"}

        except Exception as e:
            logger.error(f"[ERROR] TTS error: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}


# Global orchestrator instance
voice_ai_orchestrator = VoiceAIOrchestrator()
