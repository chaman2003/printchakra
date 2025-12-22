"""
Voice AI TTS Formatting Module
Provides response formatting for text-to-speech output

SIMPLIFIED: Only TTS formatting functions retained
Command parsing, system prompts, and command mappings removed (handled by frontend)
"""

import re
import logging

logger = logging.getLogger(__name__)


class VoicePromptManager:
    """Manager for Voice AI TTS formatting"""
    
    @staticmethod
    def format_response(ai_response: str) -> str:
        """
        Format AI response for display.
        
        Transforms:
        - Remove markdown formatting
        - Remove code blocks and URLs
        - Keep full text for chat display
        
        Args:
            ai_response: Raw response from the model
            
        Returns:
            Clean, full-text response for chat display
        """
        # Clean up markdown formatting
        ai_response = ai_response.replace("**", "").replace("*", "")
        
        # Remove code blocks
        ai_response = re.sub(r'```[\s\S]*?```', '', ai_response)
        ai_response = re.sub(r'`[^`]*`', '', ai_response)
        
        # Remove URLs
        ai_response = re.sub(r'https?://\S+', '', ai_response)
        
        # Remove emojis
        ai_response = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001F900-\U0001F9FF]', '', ai_response)
        
        # Clean up multiple spaces
        ai_response = re.sub(r'\s+', ' ', ai_response).strip()
        
        # Filter out invalid responses
        words = ai_response.split()
        if len(words) < 1 or not any(c.isalpha() for c in ai_response):
            ai_response = "Ready."
        
        return ai_response
    
    @staticmethod
    def format_response_for_tts(ai_response: str) -> str:
        """
        Format AI response for concise, human-like voice playback (TTS).
        
        Transforms:
        - Remove markdown formatting
        - Limit to 1 sentence, max 15 words
        - Keep only essential information
        
        Args:
            ai_response: Raw response from the model
            
        Returns:
            Short, voice-friendly response for TTS
        """
        # Start with clean response
        ai_response = VoicePromptManager.format_response(ai_response)
        
        # Take ONLY first sentence (max 1 sentence for brevity)
        sentences = ai_response.split(". ")
        ai_response = sentences[0]
        if ai_response and ai_response[-1] not in ".!?":
            ai_response += "."
        
        # Strict word limit (max 15 words for concise speech)
        words = ai_response.split()
        if len(words) > 15:
            ai_response = " ".join(words[:15])
            if ai_response[-1] not in ".!?":
                ai_response += "."
        
        # Filter out invalid responses
        words = ai_response.split()
        if len(words) < 1 or not any(c.isalpha() for c in ai_response):
            ai_response = "Ready."
        
        return ai_response
