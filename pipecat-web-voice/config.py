"""
Configuration for Pipecat Web Voice Bot
"""

import os
from dataclasses import dataclass, field
from typing import List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class VoiceBotConfig:
    """Configuration for the voice bot"""
    
    # Server Configuration
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8765"))
    cors_origins: List[str] = field(default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","))
    
    # Ollama Configuration
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b-instruct-q4_K_M")
    
    # Whisper Configuration
    whisper_model: str = os.getenv("WHISPER_MODEL", "medium")
    whisper_language: Optional[str] = os.getenv("WHISPER_LANGUAGE", "auto")
    
    # MMS TTS Configuration
    mms_model_id: str = os.getenv("MMS_MODEL_ID", "facebook/mms-tts")
    mms_sample_rate: int = int(os.getenv("MMS_SAMPLE_RATE", "16000"))
    
    # Language Configuration
    default_language: str = os.getenv("DEFAULT_LANGUAGE", "en")
    supported_languages: List[str] = field(default_factory=lambda: os.getenv("SUPPORTED_LANGUAGES", "en,hi,te,kn").split(","))
    
    # VAD Configuration
    vad_threshold: float = float(os.getenv("VAD_THRESHOLD", "0.5"))
    vad_pad_duration_ms: int = int(os.getenv("VAD_PAD_DURATION_MS", "300"))
    
    # System Instructions
    system_instruction: str = """You are a helpful voice assistant. Be conversational and friendly. 
    Respond naturally and keep your answers concise but informative. The user is speaking to you through voice, 
    so avoid using complex formatting or special characters in your responses."""
    
    # Language-specific instructions
    language_instructions: dict = None
    
    def __post_init__(self):
        # Initialize language-specific instructions
        if self.language_instructions is None:
            self.language_instructions = {
                "en": "You are a helpful English voice assistant. Be conversational and friendly.",
                "hi": "आप एक सहायक हिंदी आवाज सहायक हैं। बातचीत करने वाले और मैत्रीपूर्ण रहें।",
                "te": "మీరు సహాయక తెలుగు వాయిస్ అసిస్టెంట్. సంభాషణాత్మకంగా మరియు స్నేహపూర్వకంగా ఉండండి.",
                "kn": "ನೀವು ಸಹಾಯಕ ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ. ಸಂಭಾಷಣಾತ್ಮಕವಾಗಿ ಮತ್ತು ಸ್ನೇಹಿಯಾಗಿರಿ."
            }
    
    def get_system_instruction(self, language: str = None) -> str:
        """Get system instruction for specific language"""
        lang = language or self.default_language
        base_instruction = self.language_instructions.get(lang, self.system_instruction)
        return base_instruction
    
    def validate_language(self, language: str) -> bool:
        """Check if language is supported"""
        return language in self.supported_languages


# Global configuration instance
config = VoiceBotConfig()
