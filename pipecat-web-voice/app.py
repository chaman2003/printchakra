"""
FastAPI WebSocket Server for Pipecat Web Voice Bot
Provides WebSocket endpoint for real-time voice conversations
"""

import asyncio
import base64
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from config import config
from voice_bot import voice_bot

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    logger.info("Starting Pipecat Web Voice Bot server...")
    preload = os.getenv("PRELOAD_VOICE_MODELS", "1").strip().lower() in ("1", "true", "yes")
    if preload:
        try:
            await asyncio.gather(
                voice_bot.stt_service._load_model(),
                voice_bot.tts_service._load_model(),
            )
            logger.info("STT and TTS models preloaded (set PRELOAD_VOICE_MODELS=0 to skip)")
        except Exception:
            logger.exception("Model preload failed; models will load on first use")
    yield
    logger.info("Shutting down Pipecat Web Voice Bot server...")


# Create FastAPI app
app = FastAPI(
    title="Pipecat Web Voice Bot",
    description="Multi-language voice conversation bot using Pipecat",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (for the frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """Root endpoint - serve the frontend"""
    return FileResponse("static/index.html")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "bot_status": voice_bot.get_status()
    }


@app.get("/status")
async def get_status():
    """Get current bot status"""
    return voice_bot.get_status()


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for voice conversation"""
    await websocket.accept()
    
    try:
        await voice_bot.handle_websocket(websocket)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1000)


@app.get("/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "current": voice_bot.language_manager.get_current_language(),
        "supported": config.supported_languages,
        "default": config.default_language
    }


class TextChatBody(BaseModel):
    text: str


class SwitchLanguageBody(BaseModel):
    language: str


@app.post("/conversation/text")
async def conversation_text(body: TextChatBody):
    """Typed chat: same LLM + TTS stack as voice (without STT)."""
    t = (body.text or "").strip()
    if not t:
        raise HTTPException(status_code=400, detail="text is required")
    try:
        reply, wav = await voice_bot.process_text_chat(t)
        return {
            "reply": reply,
            "audio_wav_base64": base64.b64encode(wav).decode("ascii") if wav else None,
        }
    except Exception as e:
        logger.exception("conversation/text failed")
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/switch-language")
async def switch_language_api(body: SwitchLanguageBody):
    """Keep language state on this server (used by UI + text chat)."""
    lang = (body.language or "").strip()
    if lang not in config.supported_languages:
        raise HTTPException(status_code=400, detail=f"Unsupported language: {lang}")
    if lang != voice_bot.language_manager.get_current_language():
        voice_bot.language_manager.switch_language(lang)
    voice_bot.tts_service.set_language(lang)
    voice_bot.llm_service._settings.system_instruction = config.get_system_instruction(lang)
    resp_msg = voice_bot.language_manager.get_language_response(lang)
    return {"success": True, "message": resp_msg, "language": lang}


@app.post("/reset-language")
async def reset_language_api():
    voice_bot.language_manager.reset_language()
    lang = voice_bot.language_manager.get_current_language()
    voice_bot.tts_service.set_language(lang)
    voice_bot.llm_service._settings.system_instruction = config.get_system_instruction(lang)
    return {
        "success": True,
        "message": "Language reset to default",
        "language": lang,
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {config.host}:{config.port}")
    uvicorn.run(
        "app:app",
        host=config.host,
        port=config.port,
        reload=False,
        log_level="info"
    )
