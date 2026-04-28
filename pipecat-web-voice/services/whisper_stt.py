"""
Custom Whisper STT Service for Pipecat
Supports Whisper Medium model with GPU acceleration
"""

import asyncio
import logging
import os
import tempfile
from typing import AsyncGenerator, Optional

import torch
import whisper
from pipecat.frames.frames import AudioRawFrame, TextFrame
from pipecat.services.settings import STTSettings
from pipecat.services.stt_service import STTService
from pipecat.transcriptions.language import Language

logger = logging.getLogger(__name__)


class WhisperSTTService(STTService):
    """Custom Whisper STT Service using OpenAI Whisper with Medium model"""

    def __init__(
        self,
        model_name: str = "medium",
        device: Optional[str] = None,
        language: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            ttfs_p99_latency=1.0,
            settings=STTSettings(
                model=model_name,
                language=language if language and language != "auto" else None,
            ),
            **kwargs,
        )
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.language = language
        self.model = None
        self._model_lock = asyncio.Lock()
        
        logger.info(f"Initializing Whisper STT with model: {model_name} on device: {self.device}")

    async def _load_model(self):
        """Load Whisper model asynchronously"""
        async with self._model_lock:
            if self.model is not None:
                return
            
            logger.info(f"Loading Whisper {self.model_name} model...")
            try:
                # Load model in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                self.model = await loop.run_in_executor(
                    None, 
                    lambda: whisper.load_model(self.model_name, device=self.device)
                )
                logger.info(f"Whisper {self.model_name} model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load Whisper model: {e}")
                raise

    async def run_stt(self, frames: AsyncGenerator[AudioRawFrame, None]) -> AsyncGenerator[TextFrame, None]:
        """Process audio frames and transcribe to text"""
        await self._load_model()
        
        # Collect audio frames
        audio_data = b""
        sample_rate = None
        
        async for frame in frames:
            if not isinstance(frame, AudioRawFrame):
                continue
                
            if sample_rate is None:
                sample_rate = frame.sample_rate
            elif frame.sample_rate != sample_rate:
                logger.warning(f"Sample rate mismatch: {sample_rate} vs {frame.sample_rate}")
                
            audio_data += frame.audio

        if not audio_data:
            logger.warning("No audio data received")
            return

        try:
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                temp_path = temp_file.name
                
                # Convert raw audio to WAV format
                import numpy as np
                import wave
                
                # Convert bytes to numpy array (assuming 16-bit PCM)
                audio_array = np.frombuffer(audio_data, dtype=np.int16)
                
                # Create WAV file
                with wave.open(temp_path, 'wb') as wav_file:
                    wav_file.setnchannels(1)  # Mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(sample_rate)
                    wav_file.writeframes(audio_array.tobytes())

            # Transcribe using Whisper
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.model.transcribe(
                    temp_path,
                    language=self.language if self.language and self.language != "auto" else None,
                    fp16=self.device == "cuda",
                    verbose=False
                )
            )
            
            text = result.get("text", "").strip()
            if text:
                logger.info(f"Transcribed: {text}")
                yield TextFrame(text)
            else:
                logger.debug("No speech detected in audio")
                
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
        finally:
            # Clean up temporary file
            try:
                if 'temp_path' in locals():
                    os.unlink(temp_path)
            except:
                pass
