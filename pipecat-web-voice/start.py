#!/usr/bin/env python3
"""
Startup script for Pipecat Web Voice Bot
Handles virtual environment activation and server startup
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Main startup function"""
    print("🎤 Pipecat Web Voice Bot Startup")
    print("=" * 40)
    
    # Check if we're in the correct virtual environment
    venv_path = Path("C:/Python/envs/ml-base")
    current_python = Path(sys.executable)
    
    if not str(current_python).startswith(str(venv_path)):
        print(f"⚠️  Warning: Not running in ml-base venv")
        print(f"   Current: {current_python}")
        print(f"   Expected: {venv_path}")
        print()
        print("Please activate the correct virtual environment:")
        print(f'   "{venv_path}\\Scripts\\activate"')
        print("Then run this script again.")
        return False
    
    print(f"✅ Running in correct venv: {current_python}")
    print()
    
    # Check if required packages are installed
    try:
        import pipecat  # distribution name: pipecat-ai
        import fastapi
        import uvicorn
        import openai
        import transformers
        import torch
        print("✅ All required packages are available")
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print()
        print("Install requirements with:")
        print("   pip install -r requirements.txt")
        return False
    
    print()
    print("🚀 Starting server...")
    print("   Web interface: http://localhost:8765")
    print("   WebSocket: ws://localhost:8765/ws")
    print("   Health check: http://localhost:8765/health")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 40)
    
    # Start the FastAPI server
    try:
        import uvicorn
        uvicorn.run(
            "app:app",
            host="0.0.0.0",
            port=8765,
            reload=False,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Server error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
