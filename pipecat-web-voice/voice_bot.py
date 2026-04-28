"""
Main Voice Bot Implementation using Pipecat
Handles WebSocket connections and voice conversation pipeline
"""

import asyncio
import io
import logging
import wave
from typing import Optional, Tuple

from fastapi import WebSocket
from pipecat.frames.frames import TextFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.services.ollama.llm import OLLamaLLMService
from pipecat.transports.websocket.fastapi import FastAPIWebsocketTransport, FastAPIWebsocketParams
from pipecat.processors.aggregators.llm_response import LLMFullResponseAggregator
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.frame_processor import FrameProcessor

from config import config
from services import WhisperSTTService, FacebookMMSTTSService
from language_manager import LanguageManager

logger = logging.getLogger(__name__)


def _ollama_openai_base_url(base_url: str) -> str:
    """Normalize Ollama base URL for OpenAI-compatible `/v1` endpoints."""
    base = (base_url or "http://localhost:11434").rstrip("/")
    return base if base.endswith("/v1") else f"{base}/v1"


class LanguageSwitchProcessor(FrameProcessor):
    """Processor to handle language switching based on user input"""
    
    def __init__(self, language_manager: LanguageManager, tts_service: FacebookMMSTTSService):
        super().__init__()
        self.language_manager = language_manager
        self.tts_service = tts_service
    
    async def process_frame(self, frame, direction):
        """Process frames for language switching"""
        # Ensure base lifecycle handling runs first so StartFrame / metadata frames
        # properly initialize processor state in Pipecat 1.x.
        await super().process_frame(frame, direction)

        if isinstance(frame, TextFrame) and direction == "upstream":
            # Check for language switch in user text
            processed_text, was_switched = self.language_manager.process_text_for_language(frame.text)
            
            if was_switched:
                # Update TTS service language
                self.tts_service.set_language(self.language_manager.get_current_language())
                # Replace with confirmation message
                frame.text = processed_text
                logger.info(f"Language switched to: {self.language_manager.get_current_language()}")
        
        await self.push_frame(frame, direction)


class VoiceBot:
    """Main voice bot class that handles the Pipecat pipeline"""
    
    def __init__(self):
        self.language_manager = LanguageManager(
            default_language=config.default_language,
            supported_languages=config.supported_languages
        )
        
        # Initialize services
        self.stt_service = WhisperSTTService(
            model_name=config.whisper_model,
            language=config.whisper_language
        )
        
        self.tts_service = FacebookMMSTTSService(
            language=config.default_language,
            sample_rate=config.mms_sample_rate
        )
        
        self.llm_service = OLLamaLLMService(
            base_url=_ollama_openai_base_url(config.ollama_base_url),
            settings=OLLamaLLMService.Settings(
                model=config.ollama_model,
                system_instruction=config.get_system_instruction(config.default_language),
                temperature=0.1,
            )
        )
        
        self.language_processor = LanguageSwitchProcessor(
            self.language_manager, 
            self.tts_service
        )
        
        self.pipeline_task: Optional[PipelineTask] = None
        # Pipecat 1.0 runner expects a running event loop; create it lazily in handle_websocket.
        self.runner: Optional[PipelineRunner] = None
        
        logger.info("Voice bot initialized")
    
    def _create_pipeline(self, transport: FastAPIWebsocketTransport) -> Pipeline:
        """Create the Pipecat pipeline"""
        
        # Update LLM system instruction based on current language
        self.llm_service._settings.system_instruction = config.get_system_instruction(
            self.language_manager.get_current_language()
        )
        
        pipeline = Pipeline([
            transport.input(),
            self.stt_service,
            self.llm_service,
            LLMFullResponseAggregator(),
            self.tts_service,
            transport.output(),
        ])
        
        return pipeline
    
    async def handle_websocket(self, websocket: WebSocket):
        """Handle WebSocket connection for voice conversation"""
        logger.info("New WebSocket connection established")
        
        try:
            if self.runner is None:
                self.runner = PipelineRunner()

            # Create transport
            transport_params = FastAPIWebsocketParams(
                audio_in_enabled=True,
                audio_in_sample_rate=config.mms_sample_rate,
                audio_in_channels=1,
                audio_out_enabled=True,
                audio_out_sample_rate=config.mms_sample_rate,
                audio_out_channels=1,
                add_wav_header=True,
            )
            transport = FastAPIWebsocketTransport(
                websocket=websocket,
                params=transport_params,
            )
            
            # Create and run pipeline
            pipeline = self._create_pipeline(transport)
            self.pipeline_task = PipelineTask(pipeline)

            # Pipecat 1.0 PipelineTask no longer exposes `.on(...)` event hooks.
            # Connection lifecycle is handled by transport/session flow instead.

            # Start the pipeline
            await self.runner.run(self.pipeline_task)
            
        except Exception as e:
            logger.error(f"WebSocket handler error: {e}")
            raise
        finally:
            logger.info("WebSocket connection closed")
            self.pipeline_task = None

    @staticmethod
    def _pcm_chunks_to_wav(pcm: bytes, sample_rate: int) -> bytes:
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm)
        return buf.getvalue()

    async def process_text_chat(self, user_text: str) -> Tuple[str, bytes]:
        """Run the same LLM + MMS TTS path used by voice (no Whisper). Returns (reply_text, wav_bytes)."""
        processed, _was_switched = self.language_manager.process_text_for_language(user_text)
        lang = self.language_manager.get_current_language()
        self.llm_service._settings.system_instruction = config.get_system_instruction(lang)
        self.tts_service.set_language(lang)

        ctx = LLMContext(messages=[{"role": "user", "content": processed}])
        reply = await self.llm_service.run_inference(
            ctx,
            system_instruction=config.get_system_instruction(lang),
        )
        text_out = (reply or "").strip()
        if not text_out:
            return ("", b"")

        pcm_parts: list[bytes] = []
        async for frame in self.tts_service.run_tts(text_out):
            if hasattr(frame, "audio") and frame.audio:
                pcm_parts.append(frame.audio)

        pcm = b"".join(pcm_parts)
        if not pcm:
            return (text_out, b"")

        wav = self._pcm_chunks_to_wav(pcm, config.mms_sample_rate)
        return (text_out, wav)
    
    async def _on_client_connected(self, task: PipelineTask):
        """Handle client connection event"""
        logger.info("Client connected to voice bot")
        
        # Send welcome message in current language
        welcome_messages = {
            "en": "Hello! I'm your voice assistant. How can I help you today?",
            "hi": "नमस्ते! मैं आपका वॉइस असिस्टेंट हूं। मैं आज आपकी क्या मदद कर सकता हूं?",
            "te": "హలో! నేను మీ వాయిస్ అసిస్టెంట్. నేను ఈ రోజు మీకు ఎలా సహాయం చేయగలను?",
            "kn": "ಹಲೋ! ನಾನು ನಿಮ್ಮ ಧ್ವನಿ ಸಹಾಯಕ. ನಾನು ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?"
        }
        
        welcome_msg = welcome_messages.get(
            self.language_manager.get_current_language(), 
            welcome_messages["en"]
        )
        
        # Send welcome message through the pipeline
        if task.pipeline:
            await task.queue_frame(TextFrame(welcome_msg))
    
    async def _on_client_disconnected(self, task: PipelineTask):
        """Handle client disconnection event"""
        logger.info("Client disconnected from voice bot")
    
    async def _on_error(self, task: PipelineTask, error: Exception):
        """Handle pipeline errors"""
        logger.error(f"Pipeline error: {error}")
    
    def get_status(self) -> dict:
        """Get current bot status"""
        stt_service = getattr(self, "stt_service", None)
        tts_service = getattr(self, "tts_service", None)
        llm_service = getattr(self, "llm_service", None)

        stt_model_loaded = getattr(stt_service, "model", None) is not None
        tts_model_loaded = (
            getattr(tts_service, "model", None) is not None
            and getattr(tts_service, "tokenizer", None) is not None
        )

        return {
            "current_language": self.language_manager.get_current_language(),
            "supported_languages": config.supported_languages,
            "whisper_model": config.whisper_model,
            "ollama_model": config.ollama_model,
            "mms_model": config.mms_model_id,
            "is_active": self.pipeline_task is not None,
            "components": {
                "stt": {
                    "connected": stt_service is not None,
                    "model_loaded": stt_model_loaded,
                    "provider": "whisper",
                },
                "tts": {
                    "connected": tts_service is not None,
                    "model_loaded": tts_model_loaded,
                    "provider": "facebook_mms",
                },
                "llm": {
                    "connected": llm_service is not None,
                    "provider": "ollama",
                    "base_url": config.ollama_base_url,
                },
            },
        }


# Global bot instance
voice_bot = VoiceBot()
