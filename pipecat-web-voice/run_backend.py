#!/usr/bin/env python3
"""
Backend runner for Pipecat Web Voice Bot
This script starts the FastAPI server for the voice bot
"""

import asyncio
import logging
import sys
import os

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

import uvicorn
from app import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main function to start the Pipecat voice bot backend"""
    logger.info("🎤 Starting Pipecat Web Voice Bot Backend")
    logger.info("=" * 50)
    
    # Check if required dependencies are available
    try:
        import pipecat  # distribution name: pipecat-ai
        import fastapi
        import transformers
        import torch
        logger.info("✅ All required packages are available")
    except ImportError as e:
        logger.error(f"❌ Missing required package: {e}")
        logger.error("Please install requirements with: pip install -r requirements.txt")
        sys.exit(1)
    
    # Check Ollama availability (optional)
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            logger.info("✅ Ollama server is running")
        else:
            logger.warning("⚠️  Ollama server responded with error")
    except Exception:
        logger.warning("⚠️  Ollama server not available - make sure it's running on localhost:11434")
    
    logger.info("🚀 Starting FastAPI server...")
    logger.info("   WebSocket: ws://localhost:8765/ws")
    logger.info("   Health: http://localhost:8765/health")
    logger.info("   Status: http://localhost:8765/status")
    logger.info("   Languages: http://localhost:8765/languages")
    logger.info("=" * 50)
    
    try:
        uvicorn.run(
            "app:app",
            host="0.0.0.0",
            port=8765,
            reload=False,
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("\n👋 Server stopped gracefully")
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
