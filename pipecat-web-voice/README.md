# Pipecat Web Voice Bot

A multi-language voice conversation bot using Pipecat, Whisper STT, Facebook MMS TTS, and Ollama LLM.

## Features

- **Real-time Voice Conversation**: WebSocket-based bidirectional audio streaming
- **Multi-language Support**: English, Hindi, Telugu, Kannada with automatic language switching
- **STT**: Whisper Medium model for accurate speech transcription
- **TTS**: Facebook MMS models for natural-sounding speech synthesis
- **LLM**: Qwen2.5:3b-instruct-q4_K_M via Ollama for intelligent responses
- **Web Interface**: Clean, responsive HTML/JS frontend
- **React Integration**: Easy to embed in React applications

## Quick Start

### 1. Setup Environment

```bash
# Activate the ml-base virtual environment
"C:\Python\envs\ml-base\Scripts\activate"

# Navigate to the project directory
cd "c:\Users\chama\OneDrive\Desktop\printchakra-new\pipecat-web-voice"

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# Make sure Ollama is running and the model is available
```

### 3. Start Ollama

```bash
# Make sure Ollama is installed and running
ollama serve

# Pull the required model
ollama pull qwen2.5:3b-instruct-q4_K_M
```

### 4. Run the Bot

```bash
# Using the startup script (recommended)
python start.py

# Or directly with uvicorn
uvicorn app:app --host 0.0.0.0 --port 8765
```

### 5. Access the Web Interface

Open your browser and navigate to: `http://localhost:8765`

## Language Support

The bot supports the following languages with automatic detection and switching:

- **English** - Say "speak english" or "change to english"
- **हिंदी (Hindi)** - Say "हिंदी बोलो" or "हिंदी में बात करो"
- **తెలుగు (Telugu)** - Say "తెలుగు మాట్లాడండి" or "తెలుగులో మాట్లాడండి"
- **ಕನ್ನಡ (Kannada)** - Say "ಕನ್ನಡ ಮಾತನಾಡಿ" or "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ"

## API Endpoints

- `GET /` - Web interface
- `GET /health` - Health check with bot status
- `GET /status` - Current bot status and configuration
- `GET /languages` - Supported languages and current language
- `POST /reset-language` - Reset to default language
- `WebSocket /ws` - Real-time voice conversation

## React Integration

To integrate this voice bot into your React application:

### 1. Add the WebSocket client

```javascript
class VoiceBotClient {
    constructor(wsUrl = 'ws://localhost:8765/ws') {
        this.ws = null;
        this.audioContext = null;
        this.isRecording = false;
        this.wsUrl = wsUrl;
    }
    
    async connect() {
        this.ws = new WebSocket(this.wsUrl);
        // Setup WebSocket handlers
        // See static/index.html for full implementation
    }
    
    async startRecording() {
        // Setup microphone and audio processing
        // Send audio chunks to WebSocket
    }
    
    async playAudio(audioData) {
        // Play received TTS audio
    }
}
```

### 2. Use in React Component

```jsx
import React, { useState, useEffect } from 'react';

const VoiceBot = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState('en');
    
    useEffect(() => {
        const client = new VoiceBotClient();
        client.connect();
        
        return () => client.disconnect();
    }, []);
    
    const toggleRecording = () => {
        // Handle recording state
    };
    
    return (
        <div>
            <button onClick={toggleRecording}>
                {isRecording ? 'Stop' : 'Start'} Recording
            </button>
            <p>Current Language: {currentLanguage}</p>
        </div>
    );
};
```

## Configuration

### Environment Variables

```env
# Server
HOST=0.0.0.0
PORT=8765
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b-instruct-q4_K_M

# Whisper
WHISPER_MODEL=medium
WHISPER_LANGUAGE=auto

# MMS TTS
MMS_MODEL_ID=facebook/mms-tts
MMS_SAMPLE_RATE=16000

# Languages
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,hi,te,kn
```

### Customization

- **System Instructions**: Modify `config.py` to change bot personality
- **Language Patterns**: Update `language_manager.py` for custom language detection
- **Audio Settings**: Adjust sample rates and VAD thresholds in configuration

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser       │    │   FastAPI        │    │   Pipecat       │
│   (React/HTML)  │◄──►│   WebSocket      │◄──►│   Pipeline      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Audio Stream   │    │   STT: Whisper  │
                       │   (16kHz PCM)    │    │   Medium Model  │
                       └──────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   LLM: Ollama   │
                                               │   Qwen2.5       │
                                               └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │   TTS: MMS      │
                                               │   Multi-lang    │
                                               └─────────────────┘
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if the server is running on the correct port
   - Verify CORS origins in configuration

2. **Audio Not Working**
   - Ensure microphone permissions are granted
   - Check browser console for Web Audio API errors

3. **Model Loading Errors**
   - Verify Ollama is running and model is available
   - Check GPU memory for Whisper and MMS models

4. **Language Detection Issues**
   - Review language patterns in `language_manager.py`
   - Check supported languages configuration

### Logs

Check the server logs for detailed error information:
```bash
# Run with debug logging
LOG_LEVEL=DEBUG python start.py
```

## Development

### Project Structure

```
pipecat-web-voice/
├── app.py                 # FastAPI server
├── config.py              # Configuration management
├── voice_bot.py           # Main Pipecat pipeline
├── language_manager.py    # Multi-language handling
├── services/              # Custom Pipecat services
│   ├── __init__.py
│   ├── whisper_stt.py     # Whisper STT service
│   └── mms_tts.py         # MMS TTS service
├── static/                # Web frontend
│   └── index.html
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
├── start.py              # Startup script
└── README.md             # This file
```

### Adding New Languages

1. Add language code to `SUPPORTED_LANGUAGES` in config
2. Add MMS model mapping in `mms_tts.py`
3. Add language patterns in `language_manager.py`
4. Add translation strings in `voice_bot.py`

## License

This project builds upon Pipecat and various open-source models. Please check individual licenses for components.
