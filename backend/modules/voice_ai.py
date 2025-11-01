"""
Voice AI Module - Whisper + Smollm2:135m Integration
Handles speech-to-text transcription and AI chat responses with TTS output
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

logger = logging.getLogger(__name__)

# TTS Speech - Simple blocking implementation
_tts_engine = None
_tts_lock = threading.Lock()  # Prevent concurrent TTS calls
TTS_AVAILABLE = False

_tts_initialized_once = False  # Track if we've logged TTS init


def _init_tts_engine():
    """Initialize TTS engine (called lazily on first use)"""
    global _tts_engine, TTS_AVAILABLE, _tts_initialized_once

    if _tts_engine is not None:
        return True

    try:
        import pyttsx3

        engine = pyttsx3.init()

        # Configure voice - Try Ravi first, fallback to David, then any available
        voices = engine.getProperty("voices")
        selected_voice = None

        # Priority order: Ravi > David > Zira > Any available
        voice_preferences = ["ravi", "david", "zira"]

        for preference in voice_preferences:
            for voice in voices:
                if preference in voice.name.lower():
                    selected_voice = voice
                    if not _tts_initialized_once:
                        logger.info(f"✅ Found preferred voice: {voice.name}")
                    break
            if selected_voice:
                break

        # If no preferred voice found, use first available
        if not selected_voice and voices:
            selected_voice = voices[0]
            if not _tts_initialized_once:
                logger.warning(f"⚠️ Preferred voices not found. Using: {voices[0].name}")
                logger.warning(
                    f"   To install Microsoft Ravi: Settings > Time & Language > Speech > Add voices"
                )

        if selected_voice:
            engine.setProperty("voice", selected_voice.id)
        else:
            if not _tts_initialized_once:
                logger.error("❌ No TTS voices available on system!")

        engine.setProperty("rate", 200)
        engine.setProperty("volume", 0.9)

        _tts_engine = engine
        TTS_AVAILABLE = True

        # Only log initialization details once at startup
        if not _tts_initialized_once:
            logger.info("✅ Text-to-Speech initialized successfully")
            logger.info(f"   Engine: Windows SAPI (pyttsx3)")
            logger.info(f"   Mode: Offline & Lightweight")
            _tts_initialized_once = True

        return True

    except Exception as e:
        logger.error(f"❌ TTS initialization failed: {e}")
        import traceback

        logger.error(traceback.format_exc())
        TTS_AVAILABLE = False
        return False


def speak_text(text: str) -> bool:
    """
    Speak text using TTS (blocking call)
    Tries Windows OneCore voices first (for Ravi), then falls back to SAPI5

    Args:
        text: Text to speak

    Returns:
        bool: True if speech was successful
    """
    global _tts_lock

    # Ensure only one TTS call at a time
    with _tts_lock:
        # Method 1: Try C# PowerShell for OneCore Ravi
        try:
            temp_wav = os.path.join(tempfile.gettempdir(), f"ravi_tts_{int(time.time()*1000)}.wav")

            # Escape for PowerShell
            safe_text = text.replace("'", "''")
            safe_path = temp_wav.replace("\\", "/")

            ps_code = f"""
$OutputEncoding = [Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName 'System.Runtime.WindowsRuntime'
[Windows.Media.SpeechSynthesis.SpeechSynthesizer,Windows.Media.SpeechSynthesis,ContentType=WindowsRuntime] > $null
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer

$ravi = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where {{ $_.DisplayName -match 'Ravi' }} | Select -First 1
if (-not $ravi) {{ Write-Output 'NO_RAVI'; exit 1 }}

$synth.Voice = $ravi
$task = $synth.SynthesizeTextToStreamAsync('{safe_text}')

$task.AsTask().Wait()
$stream = $task.GetResults()

$fs = [IO.File]::Create('{safe_path}')
$stream.AsStreamForRead().CopyTo($fs)
$fs.Close()
$stream.Dispose()
$synth.Dispose()

Write-Output 'SUCCESS'
"""

            result = subprocess.run(
                ["powershell", "-NoProfile", "-Command", ps_code],
                capture_output=True,
                text=True,
                timeout=8,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )

            if (
                "SUCCESS" in result.stdout
                and os.path.exists(temp_wav)
                and os.path.getsize(temp_wav) > 0
            ):
                try:
                    import winsound

                    winsound.PlaySound(temp_wav, winsound.SND_FILENAME)
                    return True
                finally:
                    try:
                        os.remove(temp_wav)
                    except:
                        pass

        except Exception as e:
            pass  # Silently fail to fallback

        # Method 2 Fallback: pyttsx3 with SAPI5 (David/Zira)
        try:
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
            logger.error(f"❌ TTS error: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return False


class WhisperTranscriptionService:
    """
    Service for real-time speech transcription using Whisper GGML (quantized)
    Uses local GGML model file for faster inference
    Runs locally/offline for privacy and speed
    """

    def __init__(
        self, model_path: str = r"C:\Users\chama\OneDrive\Desktop\printchakra\ggml-small-q5_1.bin"
    ):
        """
        Initialize Whisper transcription service with local GGML model

        Args:
            model_path: Path to local GGML whisper model file
        """
        self.model_path = model_path
        self.model = None
        self.is_loaded = False
        self.use_whisper_cpp = False

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
                logger.info("✅ Whisper GGML model loaded successfully with whisper.cpp")
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

            # Check GPU availability
            if torch.cuda.is_available():
                if not hasattr(self, "_logged_load"):  # Only log once
                    logger.info(f"✅ GPU detected: {torch.cuda.get_device_name(0)}")
                    logger.info(f"   CUDA Version: {torch.version.cuda}")
                device = "cuda"
            else:
                if not hasattr(self, "_logged_load"):  # Only log once
                    logger.warning("⚠️ GPU not available, using CPU")
                device = "cpu"

            # Use small model for better accuracy (461MB, good balance)
            if not hasattr(self, "_logged_load"):  # Only log once
                logger.info(f"Loading openai-whisper small model on {device.upper()}")
            self.model = whisper.load_model("small", device=device)
            self.is_loaded = True
            self.use_whisper_cpp = False
            self.device = device
            if not hasattr(self, "_logged_load"):  # Only log once
                logger.info(f"✅ Whisper small model loaded successfully on {device.upper()}")
                logger.info(f"   Model optimized for accuracy (461MB, better transcription)")
                self._logged_load = True
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load base model: {str(e)}")
            import traceback

            logger.error(traceback.format_exc())

            # Fallback to base model if small fails
            try:
                logger.info("Falling back to base model...")
                import torch
                import whisper

                if torch.cuda.is_available():
                    device = "cuda"
                else:
                    device = "cpu"

                self.model = whisper.load_model("base", device=device)
                self.is_loaded = True
                self.use_whisper_cpp = False
                self.device = device
                if not hasattr(self, "_logged_load"):  # Only log once
                    logger.info(f"✅ Whisper base model loaded successfully on {device.upper()}")
                    logger.info(f"   Model with balanced performance (244MB)")
                    self._logged_load = True
                return True
            except Exception as fallback_error:
                logger.error(f"❌ Failed to load fallback model: {str(fallback_error)}")
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
                logger.warning("whisper.cpp not available, falling back to standard model")
            else:
                logger.warning(f"GGML model not found at {self.model_path}, using standard model")

            # Use standard model as fallback
            return self._try_load_with_openai_whisper()

        except Exception as e:
            logger.error(f"❌ Failed to load Whisper model: {str(e)}")
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
            logger.info(f"📝 Audio data size: {len(audio_data)} bytes")

            # Check WAV header
            if audio_data[:4] != b"RIFF":
                logger.warning(
                    f"⚠️ Audio doesn't start with RIFF header. First 4 bytes: {audio_data[:4]}"
                )
                # Try to convert or handle non-WAV format
                if audio_data[:4] == b"\x1aE\xdf\xa3":  # WebM signature
                    logger.info("Detected WebM format, attempting conversion...")
                    # FFmpeg will attempt conversion
                elif audio_data[:2] == b"\xff\xfb":  # MP3 signature
                    logger.info("Detected MP3 format, attempting conversion...")
            else:
                logger.info("✅ Valid RIFF/WAV header detected")

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
                    logger.error(f"❌ Corrupted WAV file! Header is {file_header}, not RIFF")
                    logger.error(f"   First 20 bytes: {audio_data[:20]}")
                    os.unlink(temp_audio_path)
                    return {
                        "success": False,
                        "error": f"Corrupted audio file - invalid WAV header. Got {file_header} instead of RIFF",
                        "text": "",
                    }

            # Transcribe based on model type
            # logger.info(f"Transcribing audio file: {temp_audio_path} with {'whisper.cpp' if self.use_whisper_cpp else 'openai-whisper'}")

            try:
                if self.use_whisper_cpp:
                    # Use whisper.cpp for GGML model
                    result = self.model.transcribe(temp_audio_path)
                    text = result["result"]
                else:
                    # Use openai-whisper with balanced accuracy/speed settings
                    import torch

                    result = self.model.transcribe(
                        temp_audio_path,
                        language=language,
                        task="transcribe",
                        fp16=torch.cuda.is_available(),  # Use FP16 on GPU for speed
                        beam_size=5,  # Better accuracy with beam search
                        best_of=5,  # Sample multiple candidates for accuracy
                        temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),  # Temperature fallback
                        compression_ratio_threshold=2.4,
                        no_speech_threshold=0.6,  # Higher threshold to filter non-speech sounds
                        logprob_threshold=-0.8,  # Stricter filtering for human voice
                        condition_on_previous_text=True,  # Use context for accuracy
                    )
                    text = result.get("text", "").strip()
                    
                    # Check for non-speech detection via probability
                    no_speech_prob = result.get("segments", [{}])[0].get("no_speech_prob", 0) if result.get("segments") else 0
                    
                    # If high probability of no speech (> 0.5), reject and request retry
                    if no_speech_prob > 0.5:
                        logger.warning(f"⚠️ Non-speech audio detected (probability: {no_speech_prob:.2f})")
                        os.unlink(temp_audio_path)
                        return {
                            "success": False,
                            "error": "No human speech detected. Please try again.",
                            "text": "",
                            "no_speech_detected": True,
                            "auto_retry": True
                        }
                    
            except Exception as transcribe_error:
                logger.error(f"❌ Whisper transcription failed: {str(transcribe_error)}")
                logger.error(f"   Error type: {type(transcribe_error).__name__}")

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

            # logger.info(f"✅ Transcription: {text[:100]}...")

            return {
                "success": True,
                "text": text,
                "language": language,
                "segments": result.get("segments", []) if not self.use_whisper_cpp else [],
                "duration": result.get("duration", 0) if not self.use_whisper_cpp else 0,
            }

        except Exception as e:
            logger.error(f"❌ Transcription error: {str(e)}")
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
            return {"success": False, "error": str(e), "text": ""}


class Smollm2ChatService:
    """
    Service for AI chat responses using Smollm2:135m via Ollama
    Fast, efficient local inference
    """

    def __init__(self, model_name: str = "smollm2:135m"):
        """
        Initialize Smollm2 chat service with full orchestration awareness

        Args:
            model_name: Ollama model to use
        """
        self.model_name = model_name
        self.conversation_history = []
        self.pending_orchestration = None  # Track if waiting for confirmation (print/scan)
        self.system_prompt = """You are PrintChakra AI - a direct, action-focused assistant.

⚠️ CRITICAL: The system handles print/scan intents automatically. You should NEVER see messages about printing or scanning - they are intercepted before reaching you.

YOUR ROLE:
- Answer general questions about PrintChakra features (OCR, file conversion, voice commands)
- Help with document questions ("what formats supported?", "how to use OCR?")
- Be friendly but concise (under 10 words)
- If somehow print/scan slips through, immediately say: "Opening interface now!"

TOPICS YOU HANDLE:
✅ "What can PrintChakra do?" → "OCR, file conversion, printing, scanning, voice commands!"
✅ "What formats do you support?" → "PDF, DOCX, images, text files, and more!"
✅ "How does voice work?" → "Just speak naturally - no wake words needed!"

NEVER ASK QUESTIONS LIKE:
❌ "What kind of document?"
❌ "Academic or business?"
❌ "What details do you need?"
❌ "Tell me more about..."

BE DIRECT:
- User: "thanks" → You: "You're welcome!"
- User: "what do you do?" → You: "I help with printing, scanning, and documents!"
- User: "great" → You: "Happy to help!"

Remember: Print/scan requests are handled automatically - you won't see them."""

    def check_ollama_available(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            import requests

            response = requests.get("http://localhost:11434/api/tags", timeout=2)
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [m.get("name", "") for m in models]
                # Check if smollm2 or any smollm2 variant is available
                has_model = any("smollm2" in name.lower() for name in model_names)
                # Only log once at startup
                if not hasattr(self, "_logged_ollama_check"):
                    logger.info(f"Ollama available: {has_model}")
                    logger.info(f"Available models: {model_names}")
                    self._logged_ollama_check = True
                return has_model
            return False
        except Exception as e:
            if not hasattr(self, "_logged_ollama_error"):
                logger.error(f"Ollama check failed: {str(e)}")
                self._logged_ollama_error = True
            return False

    def generate_response(self, user_message: str) -> Dict[str, Any]:
        """
        Generate AI response to user message with orchestration awareness

        Args:
            user_message: User's text input

        Returns:
            Dict with AI response and metadata
        """
        try:
            import requests

            user_lower = user_message.lower().strip()
            
            logger.info(f"🔍 Processing message: '{user_message}' | Pending orchestration: {self.pending_orchestration}")

            # PRIORITY 1: Check for confirmation if we have pending orchestration
            if self.pending_orchestration:
                confirmation_words = ["yes", "proceed", "go ahead", "okay", "ok", "sure", "yep", "yeah", "ye"]
                is_confirmation = any(user_lower == word or user_lower.startswith(word + " ") for word in confirmation_words)
                
                if is_confirmation:
                    mode = self.pending_orchestration
                    self.pending_orchestration = None  # Clear pending state
                    
                    ai_response = f"TRIGGER_ORCHESTRATION:{mode} Opening {mode} interface now!"
                    logger.info(f"✅ TRIGGERING ORCHESTRATION: {mode}")
                    
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
                    logger.info(f"⚠️ User response not a confirmation, clearing pending state")
                    self.pending_orchestration = None
            
            # PRIORITY 2: Check for print/scan intent
            if "print" in user_lower:
                self.pending_orchestration = "print"
                ai_response = "Ready to print. Shall we proceed?"
                logger.info(f"🖨️ Print intent detected, setting pending_orchestration = print")
                
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
            
            if "scan" in user_lower or "capture" in user_lower:
                self.pending_orchestration = "scan"
                ai_response = "Ready to scan. Shall we proceed?"
                logger.info(f"📷 Scan intent detected, setting pending_orchestration = scan")
                
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

            # Add user message to history for general conversation
            self.conversation_history.append({"role": "user", "content": user_message})

            # Build messages for Ollama
            messages = [
                {"role": "system", "content": self.system_prompt}
            ] + self.conversation_history

            # Call Ollama API with speed optimizations
            # logger.info(f"Generating response for: {user_message[:100]}...")
            response = requests.post(
                "http://localhost:11434/api/chat",
                json={
                    "model": self.model_name,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,  # Balanced for natural responses
                        "top_p": 0.9,  # Allow more natural variation
                        "top_k": 40,  # Increased for more natural language
                        "num_predict": 30,  # Short but complete responses
                        "num_ctx": 1024,  # Enough context for conversation
                        "repeat_penalty": 1.2,  # Prevent repetition
                        "stop": ["\n\n", "User:", "Assistant:"],  # Stop at natural breaks
                    },
                },
                timeout=15,  # Allow time for complete responses
            )

            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("message", {}).get("content", "").strip()

                # Clean up response - remove any formatting artifacts
                ai_response = ai_response.replace("**", "").replace("*", "")

                # Take first sentence or two (max 2 sentences for voice)
                sentences = ai_response.split(". ")
                if len(sentences) > 2:
                    ai_response = ". ".join(sentences[:2])
                    if not ai_response.endswith("."):
                        ai_response += "."

                # Enforce reasonable word limit (max 25 words for natural speech)
                words = ai_response.split()
                if len(words) > 25:
                    # Try to find a natural break point
                    truncated = " ".join(words[:25])
                    # Add punctuation if missing
                    if truncated and truncated[-1] not in ".!?":
                        truncated += "."
                    ai_response = truncated

                # Ensure punctuation
                if ai_response and ai_response[-1] not in ".!?":
                    ai_response += "."

                # Filter out gibberish or single-word responses
                if len(words) < 2 or not any(c.isalpha() for c in ai_response):
                    logger.warning(f"⚠️ Invalid response detected: '{ai_response}'")
                    ai_response = "I'm here to help with document scanning and printing!"

                # Add assistant response to history
                self.conversation_history.append({"role": "assistant", "content": ai_response})

                # Keep only last 8 exchanges (16 messages) for context
                if len(self.conversation_history) > 16:
                    self.conversation_history = self.conversation_history[-16:]

                # logger.info(f"✅ AI Response ({len(words)} words): {ai_response}")

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
            logger.error(f"❌ Chat generation error: {str(e)}")
            return {"success": False, "error": str(e), "response": ""}

    def reset_conversation(self):
        """Clear conversation history and pending orchestration"""
        self.conversation_history = []
        self.pending_orchestration = None
        logger.info("Conversation history cleared")


class VoiceAIOrchestrator:
    """
    Orchestrates the complete voice AI workflow:
    Audio → Whisper → Text → Smollm2 → Response
    """

    def __init__(self):
        """Initialize voice AI orchestrator"""
        self.whisper_service = WhisperTranscriptionService()
        self.chat_service = Smollm2ChatService()
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
                    "error": "Ollama not available or smollm2 model not found",
                }

            # Reset conversation
            self.chat_service.reset_conversation()
            self.session_active = True

            # logger.info("✅ Voice AI session started")
            return {
                "success": True,
                "message": "Voice AI session started",
                "whisper_loaded": True,
                "ollama_available": True,
            }

        except Exception as e:
            logger.error(f"❌ Session start error: {str(e)}")
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

            logger.info(f"📝 Transcribed text: {user_text}")

            # Remove optional wake words from beginning (if present)
            wake_words = ["hey", "hi", "hello", "okay"]
            user_text_lower = user_text.lower()

            for wake_word in wake_words:
                if user_text_lower.startswith(wake_word):
                    # Remove wake word from beginning
                    user_text = user_text[len(wake_word) :].strip()
                    user_text_lower = user_text.lower()
                    logger.info(f"✅ Removed wake word, processing: {user_text}")
                    break

            # Process all speech input (no wake word required)
            logger.info(f"✅ Processing speech: {user_text}")

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
            logger.error(f"❌ Voice input processing error: {str(e)}")
            return {"success": False, "error": str(e), "stage": "unknown", "requires_keyword": True}

    def _extract_config_parameters(self, text: str) -> Dict[str, Any]:
        """
        Extract configuration parameters from user text
        
        Args:
            text: User command text (lowercase)
            
        Returns:
            Dict with extracted parameters
        """
        params = {}
        
        # Color mode detection
        if "color" in text and "black" not in text:
            params["colorMode"] = "color"
        elif "black and white" in text or "bw" in text or "monochrome" in text:
            params["colorMode"] = "bw"
        elif "grayscale" in text or "gray scale" in text or "grey" in text:
            params["colorMode"] = "grayscale"
        
        # Layout detection
        if "landscape" in text:
            params["layout"] = "landscape"
        elif "portrait" in text:
            params["layout"] = "portrait"
        
        # Resolution detection
        import re
        dpi_match = re.search(r'(\d+)\s*dpi', text)
        if dpi_match:
            params["resolution"] = dpi_match.group(1)
        elif "high quality" in text or "high res" in text:
            params["resolution"] = "600"
        elif "low quality" in text or "draft" in text:
            params["resolution"] = "150"
        
        # Copies detection (for print)
        copies_match = re.search(r'(\d+)\s*cop(?:y|ies)', text)
        if copies_match:
            params["copies"] = int(copies_match.group(1))
        
        # Paper size detection
        if "a4" in text or "a 4" in text:
            params["paperSize"] = "A4"
        elif "letter" in text and "size" in text:
            params["paperSize"] = "Letter"
        elif "legal" in text and "size" in text:
            params["paperSize"] = "Legal"
        
        # Page range detection
        page_range_match = re.search(r'page(?:s)?\s+(\d+)(?:\s*-\s*|\s+to\s+)(\d+)', text)
        if page_range_match:
            params["pages"] = "custom"
            params["customRange"] = f"{page_range_match.group(1)}-{page_range_match.group(2)}"
        elif "odd pages" in text or "odd page" in text:
            params["pages"] = "odd"
        elif "even pages" in text or "even page" in text:
            params["pages"] = "even"
        
        # Double-sided detection
        if "double sided" in text or "duplex" in text or "both sides" in text:
            params["duplex"] = True
        
        # Text mode detection (for scan)
        if "text mode" in text or "ocr" in text or "extract text" in text:
            params["scanTextMode"] = True
        
        # Format detection
        if "pdf" in text:
            params["format"] = "pdf"
        elif "png" in text:
            params["format"] = "png"
        elif "jpg" in text or "jpeg" in text:
            params["format"] = "jpg"
        
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
                # logger.info("✅ TTS completed successfully")
                return {"success": True, "spoken": True}
            else:
                logger.warning("⚠️  TTS returned False")
                return {"success": False, "error": "TTS failed to speak"}

        except Exception as e:
            logger.error(f"❌ TTS error: {e}")
            import traceback

            logger.error(traceback.format_exc())
            return {"success": False, "error": str(e)}


# Global orchestrator instance
voice_ai_orchestrator = VoiceAIOrchestrator()
