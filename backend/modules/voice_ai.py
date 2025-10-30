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

def _init_tts_engine():
    """Initialize TTS engine (called lazily on first use)"""
    global _tts_engine, TTS_AVAILABLE
    
    if _tts_engine is not None:
        return True
    
    try:
        import pyttsx3
        engine = pyttsx3.init()
        
        # Configure voice
        voices = engine.getProperty('voices')
        david_voice = None
        
        for voice in voices:
            if 'david' in voice.name.lower() and 'desktop' in voice.name.lower():
                david_voice = voice
                logger.info(f"✅ Found preferred voice: {voice.name}")
                break
        
        if david_voice:
            engine.setProperty('voice', david_voice.id)
        elif voices:
            engine.setProperty('voice', voices[0].id)
            logger.info(f"✅ Using available voice: {voices[0].name}")
        
        engine.setProperty('rate', 200)
        engine.setProperty('volume', 0.9)
        
        _tts_engine = engine
        TTS_AVAILABLE = True
        logger.info("✅ Text-to-Speech initialized successfully")
        logger.info(f"   Engine: Windows SAPI (pyttsx3)")
        logger.info(f"   Mode: Offline & Lightweight")
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
    Uses lock to prevent concurrent calls and completely reinitializes engine
    
    Args:
        text: Text to speak
        
    Returns:
        bool: True if speech was successful
    """
    global _tts_lock
    
    # Ensure only one TTS call at a time
    with _tts_lock:
        try:
            # Force garbage collection of any existing engines
            import gc
            gc.collect()
            
            # Create a completely new engine with explicit driver
            import pyttsx3
            # Use 'sapi5' driver explicitly for Windows
            engine = pyttsx3.init('sapi5', debug=False)
            
            # Configure voice
            voices = engine.getProperty('voices')
            david_voice = None
            
            for voice in voices:
                if 'david' in voice.name.lower() and 'desktop' in voice.name.lower():
                    david_voice = voice
                    break
            
            if david_voice:
                engine.setProperty('voice', david_voice.id)
            elif voices:
                engine.setProperty('voice', voices[0].id)
            
            engine.setProperty('rate', 220)  # Increased from 200 for faster speech
            engine.setProperty('volume', 0.9)
            
            logger.info(f"🔊 Speaking: {text[:50]}...")
            engine.say(text)
            engine.runAndWait()
            
            # Critical: Stop and delete engine completely
            try:
                engine.stop()
            except:
                pass
            
            del engine
            gc.collect()  # Force cleanup
            
            logger.info("✅ Speech completed")
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
            logger.info(f"Loading GGML model with whisper.cpp: {self.model_path}")
            self.model = whisper_cpp_python.Whisper(self.model_path)
            self.is_loaded = True
            self.use_whisper_cpp = True
            logger.info("✅ Whisper GGML model loaded successfully with whisper.cpp")
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
                logger.info(f"✅ GPU detected: {torch.cuda.get_device_name(0)}")
                logger.info(f"   CUDA Version: {torch.version.cuda}")
                device = 'cuda'
            else:
                logger.warning("⚠️ GPU not available, using CPU")
                device = 'cpu'
            
            # Use base model for fastest transcription (244MB, 4x faster than large-v3-turbo)
            logger.info(f"Loading openai-whisper base model on {device.upper()}")
            self.model = whisper.load_model("base", device=device)
            self.is_loaded = True
            self.use_whisper_cpp = False
            self.device = device
            logger.info(f"✅ Whisper base model loaded successfully on {device.upper()}")
            logger.info(f"   Model optimized for speed (244MB, ~4x faster)")
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
                logger.info(f"✅ Whisper tiny model loaded successfully on {device.upper()}")
                logger.info(f"   Model optimized for maximum speed (75MB)")
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
            
            logger.info(f"Created temp audio file: {temp_audio_path}")
            
            # Verify file was created and has content
            if not os.path.exists(temp_audio_path):
                return {
                    'success': False,
                    'error': 'Failed to save temporary audio file',
                    'text': ''
                }
            
            file_size = os.path.getsize(temp_audio_path)
            logger.info(f"Temporary audio file size: {file_size} bytes")
            
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
            logger.info(f"Transcribing audio file: {temp_audio_path} with {'whisper.cpp' if self.use_whisper_cpp else 'openai-whisper'}")
            
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
            
            logger.info(f"✅ Transcription: {text[:100]}...")
            
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
        self.system_prompt = """You are PrintChakra AI assistant. ULTRA-CONCISE responses only.

STRICT RULES:
1. Maximum 8 words per response
2. Single short sentence
3. No fluff or elaboration

Examples:
- "what time?" → "It's 3:45 PM"
- "how are you?" → "Great! Need help?"
- "what can you do?" → "Scan and print documents"

Keep it ultra-short!"""
        
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
                logger.info(f"Ollama available: {has_model}")
                logger.info(f"Available models: {model_names}")
                return has_model
            return False
        except Exception as e:
            logger.error(f"Ollama check failed: {str(e)}")
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
            
            # Call Ollama API with aggressive speed optimizations
            logger.info(f"Generating response for: {user_message[:100]}...")
            response = requests.post(
                'http://localhost:11434/api/chat',
                json={
                    'model': self.model_name,
                    'messages': messages,
                    'stream': False,
                    'options': {
                        'temperature': 0.5,  # Lower for faster, more focused responses
                        'top_p': 0.8,  # Reduced for faster sampling
                        'top_k': 20,  # Limit token choices for speed
                        'num_predict': 20,  # Very short responses (reduced from 50)
                        'num_ctx': 512,  # Smaller context window for speed (reduced from default 2048)
                        'repeat_penalty': 1.1  # Prevent repetition
                    }
                },
                timeout=10  # Reduced from 30 to 10 seconds
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get('message', {}).get('content', '').strip()
                
                # Ensure response is ultra-concise (max 1 sentence, 15 words)
                sentences = ai_response.split('. ')
                ai_response = sentences[0]  # Take only first sentence
                
                # Enforce word limit (15 words max)
                words = ai_response.split()
                if len(words) > 15:
                    ai_response = ' '.join(words[:15])
                
                # Add punctuation if missing
                if ai_response and ai_response[-1] not in '.!?':
                    ai_response += '.'
                
                # Add assistant response to history
                self.conversation_history.append({
                    'role': 'assistant',
                    'content': ai_response
                })
                
                # Keep only last 6 exchanges (12 messages) for speed
                if len(self.conversation_history) > 12:
                    self.conversation_history = self.conversation_history[-12:]
                
                logger.info(f"✅ AI Response ({len(words)} words): {ai_response}")
                
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
            
            logger.info("✅ Voice AI session started")
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
        Requires "hey" keyword to trigger AI processing
        
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
            
            # Check for exit keyword
            if 'bye printchakra' in user_text.lower():
                self.session_active = False
                return {
                    'success': True,
                    'user_text': user_text,
                    'ai_response': 'Goodbye! Voice session ended.',
                    'session_ended': True,
                    'requires_keyword': False
                }
            
            # Step 2: Check for "hey" keyword to trigger AI processing
            user_text_lower = user_text.lower()
            if 'hey' not in user_text_lower:
                logger.info(f"⏭️ Skipping processing - 'hey' keyword not detected in: {user_text}")
                return {
                    'success': False,
                    'user_text': user_text,
                    'stage': 'keyword_detection',
                    'requires_keyword': True,
                    'skipped': True,
                    'silent': True  # Don't show error message to user
                }
            
            # Extract text after "hey" keyword
            hey_index = user_text_lower.find('hey')
            # Get text after "hey" and any following word (usually the command starts after)
            remaining_text = user_text[hey_index + 3:].strip()
            
            if not remaining_text:
                logger.info(f"⏭️ Only 'hey' keyword found, no command following")
                return {
                    'success': False,
                    'user_text': user_text,
                    'stage': 'keyword_detection',
                    'requires_keyword': True,
                    'skipped': True,
                    'silent': True  # Don't show error message to user
                }
            
            logger.info(f"✅ 'hey' keyword detected! Processing command: {remaining_text}")
            
            # Step 3: Generate AI response for the command after "hey"
            chat_response = self.chat_service.generate_response(remaining_text)
            
            if not chat_response.get('success'):
                return {
                    'success': False,
                    'error': f"Chat generation failed: {chat_response.get('error')}",
                    'user_text': remaining_text,
                    'stage': 'chat',
                    'requires_keyword': False
                }
            
            ai_response = chat_response.get('response', '')
            
            return {
                'success': True,
                'user_text': remaining_text,  # Only the command part
                'full_text': user_text,  # Full text including "hey"
                'ai_response': ai_response,
                'transcription_language': transcription.get('language'),
                'model': chat_response.get('model'),
                'session_ended': False,
                'requires_keyword': False,
                'keyword_detected': True
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
            
            logger.info("🔊 Starting TTS (blocking)...")
            speak_success = speak_text(text)
            
            if speak_success:
                logger.info("✅ TTS completed successfully")
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
