"""
Voice AI Module - Whisper + Smollm2:135m Integration
Handles speech-to-text transcription and AI chat responses with TTS output
"""

import os
import io
import wave
import tempfile
import logging
import threading
import queue
import shutil
import time
from datetime import datetime
from typing import Optional, Dict, Any
import subprocess

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
        voices = engine.getProperty('voices')
        selected_voice = None
        
        # Priority order: Ravi > David > Zira > Any available
        voice_preferences = ['ravi', 'david', 'zira']
        
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
                logger.warning(f"   To install Microsoft Ravi: Settings > Time & Language > Speech > Add voices")
        
        if selected_voice:
            engine.setProperty('voice', selected_voice.id)
        else:
            if not _tts_initialized_once:
                logger.error("❌ No TTS voices available on system!")
        
        engine.setProperty('rate', 200)
        engine.setProperty('volume', 0.9)
        
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
            temp_wav = os.path.join(tempfile.gettempdir(), f'ravi_tts_{int(time.time()*1000)}.wav')
            
            # Escape for PowerShell
            safe_text = text.replace("'", "''")
            safe_path = temp_wav.replace('\\', '/')
            
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
                ['powershell', '-NoProfile', '-Command', ps_code],
                capture_output=True,
                text=True,
                timeout=8,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            
            if 'SUCCESS' in result.stdout and os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 0:
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
            engine = pyttsx3.init('sapi5', debug=False)
            
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
    
    def __init__(self, model_path: str = r"C:\Users\chama\OneDrive\Desktop\printchakra\ggml-small-q5_1.bin"):
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
            if not hasattr(self, '_logged_load'):  # Only log once
                logger.info("✅ Whisper GGML model loaded successfully with whisper.cpp")
                self._logged_load = True
            return True
        except Exception as e:
            logger.debug(f"whisper.cpp not available: {e}")
            return False
    
    def _try_load_with_openai_whisper(self):
        """Fallback to openai-whisper with GPU support - optimized for speed"""
        try:
            import whisper  # type: ignore
            import torch
            
            # Check GPU availability
            if torch.cuda.is_available():
                if not hasattr(self, '_logged_load'):  # Only log once
                    logger.info(f"✅ GPU detected: {torch.cuda.get_device_name(0)}")
                    logger.info(f"   CUDA Version: {torch.version.cuda}")
                device = 'cuda'
            else:
                if not hasattr(self, '_logged_load'):  # Only log once
                    logger.warning("⚠️ GPU not available, using CPU")
                device = 'cpu'
            
            # Use base model for fastest transcription (244MB, 4x faster than large-v3-turbo)
            if not hasattr(self, '_logged_load'):  # Only log once
                logger.info(f"Loading openai-whisper base model on {device.upper()}")
            self.model = whisper.load_model("base", device=device)
            self.is_loaded = True
            self.use_whisper_cpp = False
            self.device = device
            if not hasattr(self, '_logged_load'):  # Only log once
                logger.info(f"✅ Whisper base model loaded successfully on {device.upper()}")
                logger.info(f"   Model optimized for speed (244MB, ~4x faster)")
                self._logged_load = True
            return True
        except Exception as e:
            logger.error(f"❌ Failed to load base model: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Fallback to tiny model if base fails (fastest option)
            try:
                logger.info("Falling back to tiny model...")
                import whisper
                import torch
                
                if torch.cuda.is_available():
                    device = 'cuda'
                else:
                    device = 'cpu'
                
                self.model = whisper.load_model("tiny", device=device)
                self.is_loaded = True
                self.use_whisper_cpp = False
                self.device = device
                if not hasattr(self, '_logged_load'):  # Only log once
                    logger.info(f"✅ Whisper tiny model loaded successfully on {device.upper()}")
                    logger.info(f"   Model optimized for maximum speed (75MB)")
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
                return {
                    'success': False,
                    'error': 'Whisper model not loaded',
                    'text': ''
                }
        
        try:
            # Validate audio data
            if not audio_data:
                return {
                    'success': False,
                    'error': 'Audio data is empty',
                    'text': ''
                }
            
            if len(audio_data) < 100:  # Minimum reasonable audio file size
                return {
                    'success': False,
                    'error': 'Audio data too small to process',
                    'text': ''
                }
            
            # Validate WAV format
            logger.info(f"📝 Audio data size: {len(audio_data)} bytes")
            
            # Check WAV header
            if audio_data[:4] != b'RIFF':
                logger.warning(f"⚠️ Audio doesn't start with RIFF header. First 4 bytes: {audio_data[:4]}")
                # Try to convert or handle non-WAV format
                if audio_data[:4] == b'\x1aE\xdf\xa3':  # WebM signature
                    logger.info("Detected WebM format, attempting conversion...")
                    # FFmpeg will attempt conversion
                elif audio_data[:2] == b'\xff\xfb':  # MP3 signature
                    logger.info("Detected MP3 format, attempting conversion...")
            else:
                logger.info("✅ Valid RIFF/WAV header detected")
            
            # Save audio to temporary file with proper extension
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio:
                temp_audio.write(audio_data)
                temp_audio_path = temp_audio.name
            
            # logger.info(f"Created temp audio file: {temp_audio_path}")
            
            # Verify file was created and has content
            if not os.path.exists(temp_audio_path):
                return {
                    'success': False,
                    'error': 'Failed to save temporary audio file',
                    'text': ''
                }
            
            file_size = os.path.getsize(temp_audio_path)
            # logger.info(f"Temporary audio file size: {file_size} bytes")
            
            # Verify file is not corrupted by checking RIFF structure
            with open(temp_audio_path, 'rb') as f:
                file_header = f.read(4)
                if file_header != b'RIFF':
                    logger.error(f"❌ Corrupted WAV file! Header is {file_header}, not RIFF")
                    logger.error(f"   First 20 bytes: {audio_data[:20]}")
                    os.unlink(temp_audio_path)
                    return {
                        'success': False,
                        'error': f'Corrupted audio file - invalid WAV header. Got {file_header} instead of RIFF',
                        'text': ''
                    }
            
            # Transcribe based on model type
            # logger.info(f"Transcribing audio file: {temp_audio_path} with {'whisper.cpp' if self.use_whisper_cpp else 'openai-whisper'}")
            
            try:
                if self.use_whisper_cpp:
                    # Use whisper.cpp for GGML model
                    result = self.model.transcribe(temp_audio_path)
                    text = result["result"]
                else:
                    # Use openai-whisper with speed optimizations
                    import torch
                    result = self.model.transcribe(
                        temp_audio_path,
                        language=language,
                        task="transcribe",
                        fp16=torch.cuda.is_available(),  # Use FP16 on GPU for 2x speed
                        beam_size=1,  # Greedy decoding for speed (no beam search)
                        best_of=1,  # No sampling, fastest option
                        temperature=0,  # Deterministic for speed
                        compression_ratio_threshold=2.4,
                        no_speech_threshold=0.6
                    )
                    text = result.get('text', '').strip()
            except Exception as transcribe_error:
                logger.error(f"❌ Whisper transcription failed: {str(transcribe_error)}")
                logger.error(f"   Error type: {type(transcribe_error).__name__}")
                
                # Check if it's a file access error
                if "End of file" in str(transcribe_error) or "invalid" in str(transcribe_error).lower():
                    logger.error(f"   This suggests the audio file is corrupted or not in valid WAV format")
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
                'success': True,
                'text': text,
                'language': language,
                'segments': result.get('segments', []) if not self.use_whisper_cpp else [],
                'duration': result.get('duration', 0) if not self.use_whisper_cpp else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Transcription error: {str(e)}")
            logger.error(f"   Error type: {type(e).__name__}")
            # Try to clean up temp file if it exists
            try:
                if 'temp_audio_path' in locals() and os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
            except:
                # Force cleanup with garbage collection
                import gc
                gc.collect()
                try:
                    if 'temp_audio_path' in locals() and os.path.exists(temp_audio_path):
                        os.unlink(temp_audio_path)
                except:
                    pass
            return {
                'success': False,
                'error': str(e),
                'text': ''
            }


class Smollm2ChatService:
    """
    Service for AI chat responses using Smollm2:135m via Ollama
    Fast, efficient local inference
    """

    def __init__(self, model_name: str = "smollm2:135m"):
        """
        Initialize Smollm2 chat service

        Args:
            model_name: Ollama model to use
        """
        self.model_name = model_name
        self.conversation_history = []
        self.system_prompt = """You are PrintChakra AI, a helpful voice assistant for document scanning and printing.

Be friendly and conversational. Keep responses SHORT but natural.

Response guidelines:
- Use 5-12 words per response
- Be warm and helpful
- Give direct, clear answers
- Sound like a friendly assistant, not a robot

Example conversations:
User: "who are you" → You: "I'm PrintChakra AI, your document assistant!"
User: "what can you do" → You: "I help scan and print documents easily."
User: "how are you" → You: "Doing great! How can I help you?"

Be natural and conversational!"""
        
    def check_ollama_available(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            import requests
            response = requests.get('http://localhost:11434/api/tags', timeout=2)
            if response.status_code == 200:
                models = response.json().get('models', [])
                model_names = [m.get('name', '') for m in models]
                # Check if smollm2 or any smollm2 variant is available
                has_model = any('smollm2' in name.lower() for name in model_names)
                # Only log once at startup
                if not hasattr(self, '_logged_ollama_check'):
                    logger.info(f"Ollama available: {has_model}")
                    logger.info(f"Available models: {model_names}")
                    self._logged_ollama_check = True
                return has_model
            return False
        except Exception as e:
            if not hasattr(self, '_logged_ollama_error'):
                logger.error(f"Ollama check failed: {str(e)}")
                self._logged_ollama_error = True
            return False
    
    def generate_response(self, user_message: str) -> Dict[str, Any]:
        """
        Generate AI response to user message
        Spawns TTS in background thread FIRST, then returns response
        
        Args:
            user_message: User's text input
            
        Returns:
            Dict with AI response and metadata
        """
        try:
            import requests
            
            # Add user message to history
            self.conversation_history.append({
                'role': 'user',
                'content': user_message
            })
            
            # Build messages for Ollama
            messages = [
                {'role': 'system', 'content': self.system_prompt}
            ] + self.conversation_history
            
            # Call Ollama API with speed optimizations
            # logger.info(f"Generating response for: {user_message[:100]}...")
            response = requests.post(
                'http://localhost:11434/api/chat',
                json={
                    'model': self.model_name,
                    'messages': messages,
                    'stream': False,
                    'options': {
                        'temperature': 0.7,  # Balanced for natural responses
                        'top_p': 0.9,  # Allow more natural variation
                        'top_k': 40,  # Increased for more natural language
                        'num_predict': 30,  # Short but complete responses
                        'num_ctx': 1024,  # Enough context for conversation
                        'repeat_penalty': 1.2,  # Prevent repetition
                        'stop': ['\n\n', 'User:', 'Assistant:']  # Stop at natural breaks
                    }
                },
                timeout=15  # Allow time for complete responses
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('message', {}).get('content', '').strip()
                
                # Clean up response - remove any formatting artifacts
                ai_response = ai_response.replace('**', '').replace('*', '')
                
                # Take first sentence or two (max 2 sentences for voice)
                sentences = ai_response.split('. ')
                if len(sentences) > 2:
                    ai_response = '. '.join(sentences[:2])
                    if not ai_response.endswith('.'):
                        ai_response += '.'
                
                # Enforce reasonable word limit (max 25 words for natural speech)
                words = ai_response.split()
                if len(words) > 25:
                    # Try to find a natural break point
                    truncated = ' '.join(words[:25])
                    # Add punctuation if missing
                    if truncated and truncated[-1] not in '.!?':
                        truncated += '.'
                    ai_response = truncated
                
                # Ensure punctuation
                if ai_response and ai_response[-1] not in '.!?':
                    ai_response += '.'
                
                # Filter out gibberish or single-word responses
                if len(words) < 2 or not any(c.isalpha() for c in ai_response):
                    logger.warning(f"⚠️ Invalid response detected: '{ai_response}'")
                    ai_response = "I'm here to help with document scanning and printing!"
                
                # Add assistant response to history
                self.conversation_history.append({
                    'role': 'assistant',
                    'content': ai_response
                })
                
                # Keep only last 8 exchanges (16 messages) for context
                if len(self.conversation_history) > 16:
                    self.conversation_history = self.conversation_history[-16:]
                
                # logger.info(f"✅ AI Response ({len(words)} words): {ai_response}")
                
                # Return response FIRST (so frontend displays it immediately)
                # TTS will be triggered separately by frontend
                return {
                    'success': True,
                    'response': ai_response,
                    'model': self.model_name,
                    'timestamp': datetime.now().isoformat(),
                    'tts_enabled': TTS_AVAILABLE,
                    'spoken': False  # Will be spoken by separate endpoint
                }
            else:
                logger.error(f"Ollama API error: {response.status_code}")
                return {
                    'success': False,
                    'error': f'Ollama API error: {response.status_code}',
                    'response': ''
                }
                
        except Exception as e:
            logger.error(f"❌ Chat generation error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'response': ''
            }
    
    def reset_conversation(self):
        """Clear conversation history"""
        self.conversation_history = []
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
                    return {
                        'success': False,
                        'error': 'Failed to load Whisper model'
                    }
            
            # Check Ollama
            ollama_available = self.chat_service.check_ollama_available()
            if not ollama_available:
                return {
                    'success': False,
                    'error': 'Ollama not available or smollm2 model not found'
                }
            
            # Reset conversation
            self.chat_service.reset_conversation()
            self.session_active = True
            
            # logger.info("✅ Voice AI session started")
            return {
                'success': True,
                'message': 'Voice AI session started',
                'whisper_loaded': True,
                'ollama_available': True
            }
            
        except Exception as e:
            logger.error(f"❌ Session start error: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
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
            return {
                'success': False,
                'error': 'No active session. Start a session first.'
            }
        
        try:
            # Step 1: Transcribe audio
            transcription = self.whisper_service.transcribe_audio(audio_data)
            
            if not transcription.get('success'):
                return {
                    'success': False,
                    'error': f"Transcription failed: {transcription.get('error')}",
                    'stage': 'transcription',
                    'requires_keyword': True
                }
            
            user_text = transcription.get('text', '').strip()
            
            if not user_text:
                return {
                    'success': False,
                    'error': 'No speech detected - please speak clearly',
                    'stage': 'transcription',
                    'requires_keyword': True
                }
            
            logger.info(f"📝 Transcribed text: {user_text}")
            
            # Check for wake words (must start with these)
            wake_words = ['hey', 'hi', 'hello', 'okay']
            user_text_lower = user_text.lower()
            
            has_wake_word = False
            for wake_word in wake_words:
                if user_text_lower.startswith(wake_word):
                    has_wake_word = True
                    # Remove wake word from beginning
                    user_text = user_text[len(wake_word):].strip()
                    break
            
            # If no wake word detected, prompt user
            if not has_wake_word:
                logger.warning(f"⚠️ No wake word detected in: {user_text}")
                return {
                    'success': False,
                    'user_text': transcription.get('text', ''),
                    'ai_response': 'Please say "Hey" first to talk with PrintChakra AI.',
                    'error': 'Wake word not detected',
                    'stage': 'wake_word',
                    'requires_keyword': True,
                    'wake_word_missing': True
                }
            
            logger.info(f"✅ Wake word detected! Processing: {user_text}")
            
            # Check for exit keyword
            if 'bye printchakra' in user_text_lower or 'goodbye' in user_text_lower:
                self.session_active = False
                return {
                    'success': True,
                    'user_text': user_text,
                    'ai_response': 'Goodbye! Voice session ended.',
                    'session_ended': True,
                    'requires_keyword': False
                }
            
            # Step 2: Generate AI response (wake word validated)
            chat_response = self.chat_service.generate_response(user_text)
            
            if not chat_response.get('success'):
                return {
                    'success': False,
                    'error': f"Chat generation failed: {chat_response.get('error')}",
                    'user_text': user_text,
                    'stage': 'chat',
                    'requires_keyword': False
                }
            
            ai_response = chat_response.get('response', '')
            
            return {
                'success': True,
                'user_text': user_text,
                'ai_response': ai_response,
                'transcription_language': transcription.get('language'),
                'model': chat_response.get('model'),
                'session_ended': False,
                'requires_keyword': False
            }
            
        except Exception as e:
            logger.error(f"❌ Voice input processing error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'stage': 'unknown',
                'requires_keyword': True
            }
    
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
                return {
                    'success': False,
                    'error': 'TTS not available'
                }
            
            # logger.info("🔊 Starting TTS (blocking)...")
            speak_success = speak_text(text)
            
            if speak_success:
                # logger.info("✅ TTS completed successfully")
                return {
                    'success': True,
                    'spoken': True
                }
            else:
                logger.warning("⚠️  TTS returned False")
                return {
                    'success': False,
                    'error': 'TTS failed to speak'
                }
                
        except Exception as e:
            logger.error(f"❌ TTS error: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'error': str(e)
            }


# Global orchestrator instance
voice_ai_orchestrator = VoiceAIOrchestrator()
