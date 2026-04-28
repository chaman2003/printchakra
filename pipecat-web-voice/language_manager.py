"""
Language Management for Multi-Language Voice Bot
Handles language detection, switching, and language-specific configurations
"""

import logging
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class LanguagePatterns:
    """Language-specific patterns for detection and responses"""
    
    # Language switching phrases
    SWITCH_PHRASES: Dict[str, List[str]] = None
    
    # Greeting patterns
    GREETING_PATTERNS: Dict[str, List[str]] = None
    
    # Language indicators (words/phrases that strongly indicate language)
    LANGUAGE_INDICATORS: Dict[str, List[str]] = None
    
    def __post_init__(self):
        if self.SWITCH_PHRASES is None:
            self.SWITCH_PHRASES = {
                "en": [
                    "speak english", "change to english", "english please", 
                    "in english", "use english", "switch to english"
                ],
                "hi": [
                    "हिंदी बोलो", "हिंदी में बात करो", "हिंदी चाहिए",
                    "हिंदी में", "हिंदी करो", "हिंदी में बोलो"
                ],
                "te": [
                    "తెలుగు మాట్లాడండి", "తెలుగులో మాట్లాడండి", "తెలుగు చెప్పండి",
                    "తెలుగులో", "తెలుగు వాడండి", "తెలుగు మాట్లాడు"
                ],
                "kn": [
                    "ಕನ್ನಡ ಮಾತನಾಡಿ", "ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ", "ಕನ್ನಡ ಹೇಳಿ",
                    "ಕನ್ನಡದಲ್ಲಿ", "ಕನ್ನಡ ಬಳಸಿ", "ಕನ್ನಡ ಮಾತನಾಡಿ"
                ]
            }
        
        if self.GREETING_PATTERNS is None:
            self.GREETING_PATTERNS = {
                "en": ["hello", "hi", "hey", "good morning", "good evening"],
                "hi": ["नमस्ते", "हेलो", "हाय", "सुप्रभात", "शुभ संध्या"],
                "te": ["హలో", "హాయ్", "సుప్రభాతం", "శుభ సాయంత్రం", "నమస్కారం"],
                "kn": ["ಹಲೋ", "ಹಾಯ್", "ಶುಭ ಬೆಳಿಗ್ಗೆ", "ಶುಭ ಸಂಜೆ", "ನಮಸ್ಕಾರ"]
            }
        
        if self.LANGUAGE_INDICATORS is None:
            self.LANGUAGE_INDICATORS = {
                "en": ["the", "and", "you", "what", "how", "why", "where", "when"],
                "hi": ["है", "हैं", "क्या", "कैसे", "क्यों", "कहां", "कब", "और", "पर"],
                "te": ["ఉంది", "ఉన్నాయి", "ఏమి", "ఎలా", "ఎందుకు", "ఎక్కడ", "ఎప్పుడు", "మరియు"],
                "kn": ["ಇದೆ", "ಇವೆ", "ಏನು", "ಹೇಗೆ", "ಏಕೆ", "ಎಲ್ಲಿ", "ಯಾವಾಗ", "ಮತ್ತು"]
            }


class LanguageManager:
    """Manages language detection and switching for the voice bot"""
    
    def __init__(self, default_language: str = "en", supported_languages: List[str] = None):
        self.default_language = default_language
        self.supported_languages = supported_languages or ["en", "hi", "te", "kn"]
        self.current_language = default_language
        self.patterns = LanguagePatterns()
        
        logger.info(f"Language manager initialized with default: {default_language}")
    
    def detect_language_request(self, text: str) -> Optional[str]:
        """Detect if user is requesting a language switch"""
        text_lower = text.lower().strip()
        
        for language, phrases in self.patterns.SWITCH_PHRASES.items():
            for phrase in phrases:
                if phrase in text_lower:
                    logger.info(f"Language switch request detected: {language}")
                    return language
        
        return None
    
    def detect_language_from_text(self, text: str) -> str:
        """Detect language from text content using patterns and indicators"""
        text_lower = text.lower().strip()
        
        # Count language indicators
        language_scores = {}
        
        for language, indicators in self.patterns.LANGUAGE_INDICATORS.items():
            score = 0
            for indicator in indicators:
                # Count occurrences of each indicator
                count = len(re.findall(r'\b' + re.escape(indicator) + r'\b', text_lower))
                score += count
            language_scores[language] = score
        
        # Find language with highest score
        if language_scores:
            best_language = max(language_scores, key=language_scores.get)
            if language_scores[best_language] > 0:
                logger.debug(f"Detected language: {best_language} (score: {language_scores[best_language]})")
                return best_language
        
        # Fallback to current language
        return self.current_language
    
    def should_switch_language(self, text: str) -> Tuple[bool, Optional[str]]:
        """Check if we should switch language based on text"""
        # First check for explicit switch requests
        requested_lang = self.detect_language_request(text)
        if requested_lang and requested_lang in self.supported_languages:
            return True, requested_lang
        
        # Then check if text strongly indicates a different language
        detected_lang = self.detect_language_from_text(text)
        if detected_lang != self.current_language and detected_lang in self.supported_languages:
            # Only switch if the detected language is strongly indicated
            # (you could add more sophisticated logic here)
            return True, detected_lang
        
        return False, None
    
    def switch_language(self, new_language: str) -> bool:
        """Switch to a new language"""
        if new_language not in self.supported_languages:
            logger.warning(f"Unsupported language: {new_language}")
            return False
        
        if new_language != self.current_language:
            old_language = self.current_language
            self.current_language = new_language
            logger.info(f"Language switched from {old_language} to {new_language}")
            return True
        
        return False
    
    def get_language_response(self, language: str) -> str:
        """Get confirmation message for language switch"""
        responses = {
            "en": "Sure! I'll speak in English now.",
            "hi": "ज़रूर! अब मैं हिंदी में बात करूँगा।",
            "te": "ఖచ్చితం! ఇప్పుడు నేను తెలుగులో మాట్లాడతాను.",
            "kn": "ಖಂಡಿತ! ಈಗ ನಾನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ."
        }
        return responses.get(language, responses["en"])
    
    def process_text_for_language(self, text: str) -> Tuple[str, bool]:
        """Process text and handle language switching if needed"""
        should_switch, new_lang = self.should_switch_language(text)
        
        if should_switch and new_lang:
            self.switch_language(new_lang)
            response = self.get_language_response(new_lang)
            return response, True
        
        return text, False
    
    def get_current_language(self) -> str:
        """Get current active language"""
        return self.current_language
    
    def reset_language(self):
        """Reset to default language"""
        self.current_language = self.default_language
        logger.info(f"Language reset to default: {self.default_language}")
