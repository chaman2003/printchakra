"""
Custom Facebook MMS TTS Service for Pipecat
Supports multi-language TTS for English, Hindi, Telugu, Kannada
"""

import asyncio
import logging
import os
import tempfile
from typing import AsyncGenerator, Optional

import numpy as np
import torch
import torchaudio
from pipecat.frames.frames import AudioRawFrame, TextFrame
from pipecat.services.settings import TTSSettings
from pipecat.services.tts_service import TTSService
from pipecat.transcriptions.language import Language
from transformers import VitsModel, AutoTokenizer

logger = logging.getLogger(__name__)


class FacebookMMSTTSService(TTSService):
    """Custom Facebook MMS TTS Service with multi-language support"""

    # Language mappings for MMS models
    LANGUAGE_MAPPINGS = {
        "en": "facebook/mms-tts-eng",  # English
        "hi": "facebook/mms-tts-hin",  # Hindi  
        "te": "facebook/mms-tts-tel",  # Telugu
        "kn": "facebook/mms-tts-kan",  # Kannada
    }

    # Language codes for tokenizer
    LANGUAGE_CODES = {
        "en": "eng",
        "hi": "hin", 
        "te": "tel",
        "kn": "kan",
    }

    def __init__(
        self,
        language: str = "en",
        sample_rate: int = 16000,
        device: Optional[str] = None,
        **kwargs
    ):
        # Validate language
        if language not in self.LANGUAGE_MAPPINGS:
            raise ValueError(f"Unsupported language: {language}. Supported: {list(self.LANGUAGE_MAPPINGS.keys())}")

        self.language = language
        self.model_id = self.LANGUAGE_MAPPINGS[language]
        self.language_code = self.LANGUAGE_CODES[language]
        self._sample_rate = sample_rate
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        super().__init__(
            sample_rate=sample_rate,
            settings=TTSSettings(
                model=self.model_id,
                voice=None,
                language=language,
            ),
            **kwargs,
        )
        
        self.model = None
        self.tokenizer = None
        self._model_lock = asyncio.Lock()
        
        logger.info(f"Initializing MMS TTS for language: {language} ({self.model_id}) on device: {self.device}")

    async def _load_model(self):
        """Load MMS model and tokenizer asynchronously"""
        async with self._model_lock:
            if self.model is not None and self.tokenizer is not None:
                return
            
            logger.info(f"Loading MMS TTS model: {self.model_id}")
            try:
                # Load model and tokenizer in thread pool to avoid blocking
                loop = asyncio.get_event_loop()
                
                self.model, self.tokenizer = await loop.run_in_executor(
                    None,
                    lambda: (
                        VitsModel.from_pretrained(self.model_id).to(self.device),
                        AutoTokenizer.from_pretrained(self.model_id)
                    )
                )
                
                logger.info(f"MMS TTS model loaded successfully for {self.language}")
            except Exception as e:
                logger.error(f"Failed to load MMS TTS model: {e}")
                raise

    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for MMS TTS"""
        # Remove any special characters that might cause issues
        # Add language-specific preprocessing if needed
        if self.language == "hi":
            # Hindi-specific preprocessing
            text = text.replace(".", "।")  # Use Hindi danda
        elif self.language == "te":
            # Telugu-specific preprocessing  
            text = text.replace(".", ".")  # Keep period
        elif self.language == "kn":
            # Kannada-specific preprocessing
            text = text.replace(".", ".")  # Keep period
            
        # Ensure text ends with proper punctuation
        if not text.endswith((".", "!", "?", "।")):
            text += "."
            
        return text.strip()

    async def run_tts(self, text: str, _retrying: bool = False) -> AsyncGenerator[AudioRawFrame, None]:
        """Convert text to speech using MMS TTS"""
        if not text or not text.strip():
            logger.warning("Empty text provided to TTS")
            return

        await self._load_model()
        
        # Preprocess text
        processed_text = self._preprocess_text(text.strip())
        logger.debug(f"TTS input: '{processed_text}'")

        try:
            # Tokenize text
            loop = asyncio.get_event_loop()
            inputs = await loop.run_in_executor(
                None,
                lambda: self.tokenizer(processed_text, return_tensors="pt").to(self.device)
            )

            # Generate speech (VitsModel returns waveform via forward pass)
            with torch.no_grad():
                speech = await loop.run_in_executor(
                    None,
                    lambda: self.model(**inputs).waveform.detach().cpu().numpy()
                )

            # Convert to AudioRawFrame
            audio_array = speech.squeeze()  # Remove batch dimension
            audio_bytes = (audio_array * 32767).astype(np.int16).tobytes()

            yield AudioRawFrame(
                audio=audio_bytes,
                sample_rate=self._sample_rate,
                num_channels=1
            )

            logger.debug(f"Generated {len(audio_bytes)} bytes of audio for {self.language}")

        except Exception as e:
            logger.error(f"TTS generation failed: {e}")
            # Fallback once with shorter text; avoid recursive loops.
            if len(processed_text) > 50 and not _retrying:
                shorter_text = processed_text[:50] + "."
                logger.info(f"Retrying with shorter text: '{shorter_text}'")
                async for frame in self.run_tts(shorter_text, _retrying=True):
                    yield frame

    def set_language(self, language: str):
        """Change the TTS language"""
        if language not in self.LANGUAGE_MAPPINGS:
            raise ValueError(f"Unsupported language: {language}")
            
        if language != self.language:
            self.language = language
            self.model_id = self.LANGUAGE_MAPPINGS[language]
            self.language_code = self.LANGUAGE_CODES[language]
            
            # Reset model to force reload with new language
            self.model = None
            self.tokenizer = None
            
            logger.info(f"TTS language changed to: {language} ({self.model_id})")
