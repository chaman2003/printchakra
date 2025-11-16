"""
SmolLM2 Chat Service Prompts and Query Logic
Centralized management of SmolLM2:135m system prompts, command mappings, and response generation

This module contains:
1. System prompt for PrintChakra AI context
2. Voice command mappings for document control
3. Query generation logic for Ollama API
4. Response formatting and validation
"""

from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


# ============================================================================
# SYSTEM PROMPT - Defines SmolLM2 behavior and capabilities
# ============================================================================

SMOLLM_SYSTEM_PROMPT = """You are PrintChakra AI - a voice-controlled document assistant.

GREETING (always start with):
"How can I help you? You can say print a document or scan a document."

[WARN] CRITICAL: Print/scan intents are intercepted before reaching you.

YOUR CAPABILITIES:

1. DOCUMENT SELECTOR CONTROL (per-section 1-based numbering):
   - "select original number 2" → Select doc #2 from Originals
   - "switch to converted" → Switch to Converted section
   - "show uploaded" → Switch to Uploaded section
   - "next document" → Move to next in current section
   - "previous document" → Move to previous in current section
   - "upload a document" → Trigger upload modal

2. PARAMETER MODIFICATION (real-time UI updates):
   - "switch to grayscale" → Change color mode
   - "set DPI to 300" → Change resolution
   - "landscape orientation" → Change layout
   - "2 copies" → Set copy count
   - "double sided" → Enable duplex
   - "turn on OCR" → Enable text mode

3. GLOBAL COMMANDS:
   - "cancel" → Cancel current operation
   - "status" → Report current workflow state
   - "repeat settings" → Read back current config
   - "help" → List available commands
   - "stop recording" → End voice session

4. CONFIRMATION:
   - "confirm print" / "confirm scan" → Execute operation
   - Always repeat settings before confirming

5. REAL-TIME UPDATES (announce these):
   - Processing progress percentages
   - Page capture events
   - OCR progress
   - Completion status

BE CONCISE (under 15 words). Answer questions directly.

Remember: You control the ENTIRE workflow through voice."""


# ============================================================================
# VOICE COMMAND MAPPINGS - Commands that don't need LLM processing
# ============================================================================

VOICE_COMMAND_MAPPINGS = {
    # Document selector control
    "select_document": [
        "select", "choose", "pick", "open document", 
        "select original", "select converted", "select uploaded", 
        "document number", "number"
    ],
    "switch_section": [
        "switch to", "show", "go to", "open section", 
        "switch section", "change to"
    ],
    "next_document": [
        "next", "next document", "next file", 
        "forward", "move forward", "go forward"
    ],
    "previous_document": [
        "previous", "previous document", "previous file", 
        "back", "move back", "go back"
    ],
    "upload_document": [
        "upload", "upload document", "upload file", 
        "add document", "add file", "new document"
    ],
    
    # Confirmation and control
    "confirm": [
        "confirm", "confirm print", "confirm scan", 
        "yes proceed", "execute", "do it", "start", "begin"
    ],
    "cancel": [
        "cancel", "stop", "abort", 
        "don't do it", "nevermind", "forget it"
    ],
    
    # Status and info
    "status": [
        "status", "what's happening", "progress", 
        "where are we", "current state"
    ],
    "repeat_settings": [
        "repeat", "repeat settings", "read settings", 
        "what settings", "show settings", "current settings"
    ],
    "help": [
        "help", "what can you do", "commands", 
        "options", "guide"
    ],
    
    # Session control
    "stop_recording": [
        "stop recording", "stop listening", "end session", 
        "bye", "goodbye", "stop voice"
    ],
}


# ============================================================================
# FRIENDLY RESPONSE MAPPING - User-friendly responses for commands
# ============================================================================

COMMAND_RESPONSE_MAPPING = {
    "select_document": "Selecting document {document_number}",
    "switch_section": "Switching to {section} section",
    "next_document": "Moving to next document",
    "previous_document": "Moving to previous document",
    "upload_document": "Opening upload dialog",
    "confirm": "Executing now!",
    "cancel": "Cancelled",
    "status": "Checking status...",
    "repeat_settings": "Reading settings...",
    "help": "Here's what I can do...",
    "stop_recording": "Stopping recording",
}


# ============================================================================
# CONFIRMATION WORDS - Words that confirm user intents
# ============================================================================

CONFIRMATION_WORDS = [
    "yes", "proceed", "go ahead", "okay", "ok", 
    "sure", "yep", "yeah", "ye"
]


# ============================================================================
# PRINT/SCAN KEYWORDS - Keywords for direct orchestration triggering
# ============================================================================

PRINT_KEYWORDS = [
    "print", "printing", "printout", 
    "print doc", "print file", "print paper"
]

SCAN_KEYWORDS = [
    "scan", "scanning", "capture", 
    "scan doc", "scan file", "capture doc", "capture document", "scan document"
]

# Words that indicate a question rather than a command
QUESTION_WORDS = [
    "what", "can you", "how do", "help", "how to", 
    "tell me", "can i", "what is", "can print", "help me", "show me"
]


# ============================================================================
# OLLAMA QUERY CONFIGURATION - Optimization parameters for SmolLM2
# ============================================================================

OLLAMA_QUERY_OPTIONS = {
    "temperature": 0.7,       # Balanced for natural responses (0.0-1.0)
    "top_p": 0.9,            # Allow more natural variation (0.0-1.0)
    "top_k": 40,             # Increased for more natural language
    "num_predict": 30,       # Short but complete responses
    "num_ctx": 1024,         # Enough context for conversation
    "repeat_penalty": 1.2,   # Prevent repetition
    "stop": ["\n\n", "User:", "Assistant:"],  # Stop at natural breaks
}

OLLAMA_API_TIMEOUT = 15  # seconds


# ============================================================================
# RESPONSE GENERATION AND FORMATTING
# ============================================================================

class SmolLMPromptManager:
    """Manager for SmolLM2 prompts, commands, and query generation"""
    
    @staticmethod
    def get_system_prompt() -> str:
        """
        Get the system prompt for SmolLM2
        
        Returns:
            System prompt string for Ollama API
        """
        return SMOLLM_SYSTEM_PROMPT
    
    @staticmethod
    def get_command_mappings() -> Dict[str, List[str]]:
        """
        Get voice command keyword mappings
        
        Returns:
            Dict mapping command types to keyword lists
        """
        return VOICE_COMMAND_MAPPINGS
    
    @staticmethod
    def get_confirmation_words() -> List[str]:
        """
        Get list of confirmation words
        
        Returns:
            List of words that indicate user confirmation
        """
        return CONFIRMATION_WORDS
    
    @staticmethod
    def build_ollama_query(
        model_name: str,
        messages: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Build Ollama API query with optimized parameters
        
        Args:
            model_name: Model to use (e.g., "smollm2:135m")
            messages: Conversation messages with system prompt
            
        Returns:
            JSON dict for Ollama API POST request
            
        Example:
            >>> messages = [
            ...     {"role": "system", "content": SMOLLM_SYSTEM_PROMPT},
            ...     {"role": "user", "content": "Print this document"}
            ... ]
            >>> query = SmolLMPromptManager.build_ollama_query("smollm2:135m", messages)
            >>> response = requests.post("http://localhost:11434/api/chat", json=query, timeout=15)
        """
        return {
            "model": model_name,
            "messages": messages,
            "stream": False,
            "options": OLLAMA_QUERY_OPTIONS,
        }
    
    @staticmethod
    def format_response(ai_response: str) -> str:
        """
        Format and validate AI response for voice playback
        
        Applies these transformations:
        - Remove markdown formatting (**text**, *text*)
        - Limit to 2 sentences max
        - Limit to 25 words max for natural speech
        - Ensure proper punctuation
        
        Args:
            ai_response: Raw response from SmolLM2
            
        Returns:
            Formatted, voice-friendly response
            
        Example:
            >>> raw = "**Opening print interface** now! This will start the printing process."
            >>> formatted = SmolLMPromptManager.format_response(raw)
            >>> print(formatted)
            Opening print interface now.
        """
        # Clean up markdown
        ai_response = ai_response.replace("**", "").replace("*", "")
        
        # Take first sentence or two (max 2 sentences for voice)
        sentences = ai_response.split(". ")
        if len(sentences) > 2:
            ai_response = ". ".join(sentences[:2])
            if not ai_response.endswith("."):
                ai_response += "."
        
        # Enforce reasonable word limit (max 25 words for natural speech)
        words = ai_response.split()
        if len(words) > 25:
            # Try to find a natural break point
            truncated = " ".join(words[:25])
            # Add punctuation if missing
            if truncated and truncated[-1] not in ".!?":
                truncated += "."
            ai_response = truncated
        
        # Ensure punctuation
        if ai_response and ai_response[-1] not in ".!?":
            ai_response += "."
        
        # Filter out gibberish or single-word responses
        if len(words) < 2 or not any(c.isalpha() for c in ai_response):
            logger.warning(f"[WARN] Invalid response detected: '{ai_response}'")
            ai_response = "I'm here to help with document scanning and printing!"
        
        return ai_response
    
    @staticmethod
    def get_friendly_command_response(
        command_type: str,
        command_params: Dict[str, Any]
    ) -> str:
        """
        Get friendly response for a voice command
        
        Args:
            command_type: Type of command detected
            command_params: Parameters parsed from user input
            
        Returns:
            User-friendly response string
            
        Example:
            >>> params = {"section": "converted", "document_number": 3}
            >>> response = SmolLMPromptManager.get_friendly_command_response(
            ...     "select_document", params
            ... )
            >>> print(response)
            Selecting document 3
        """
        template = COMMAND_RESPONSE_MAPPING.get(
            command_type,
            f"Got it! {command_type.replace('_', ' ').title()}."
        )
        
        # Format template with parameters
        try:
            return template.format(**command_params)
        except (KeyError, IndexError):
            # If formatting fails, return template as-is
            return template
    
    @staticmethod
    def is_confirmation(user_message: str) -> bool:
        """
        Check if user message is a confirmation
        
        Args:
            user_message: User's text input
            
        Returns:
            True if message confirms an action
            
        Example:
            >>> SmolLMPromptManager.is_confirmation("yes proceed")
            True
            >>> SmolLMPromptManager.is_confirmation("no thanks")
            False
        """
        user_lower = user_message.lower().strip()
        return any(
            user_lower == word or user_lower.startswith(word + " ")
            for word in CONFIRMATION_WORDS
        )
    
    @staticmethod
    def is_print_command(user_message: str, exclude_questions: bool = True) -> bool:
        """
        Check if user message is a print command
        
        Args:
            user_message: User's text input
            exclude_questions: If True, exclude question-style inputs
            
        Returns:
            True if message appears to be a print command
            
        Example:
            >>> SmolLMPromptManager.is_print_command("print this document")
            True
            >>> SmolLMPromptManager.is_print_command("how do I print?")
            False  # if exclude_questions=True
        """
        user_lower = user_message.lower().strip()
        
        # Check for print keywords
        has_print_keyword = any(kw in user_lower for kw in PRINT_KEYWORDS)
        
        if not has_print_keyword:
            return False
        
        # Filter out questions/help requests
        if exclude_questions:
            has_question_word = any(w in user_lower for w in QUESTION_WORDS)
            return not has_question_word
        
        return True
    
    @staticmethod
    def is_scan_command(user_message: str, exclude_questions: bool = True) -> bool:
        """
        Check if user message is a scan command
        
        Args:
            user_message: User's text input
            exclude_questions: If True, exclude question-style inputs
            
        Returns:
            True if message appears to be a scan command
            
        Example:
            >>> SmolLMPromptManager.is_scan_command("scan a document")
            True
            >>> SmolLMPromptManager.is_scan_command("can you scan?")
            False  # if exclude_questions=True
        """
        user_lower = user_message.lower().strip()
        
        # Check for scan keywords
        has_scan_keyword = any(kw in user_lower for kw in SCAN_KEYWORDS)
        
        if not has_scan_keyword:
            return False
        
        # Filter out questions/help requests
        if exclude_questions:
            has_question_word = any(w in user_lower for w in QUESTION_WORDS)
            return not has_question_word
        
        return True


# ============================================================================
# EXAMPLE USAGE
# ============================================================================

if __name__ == "__main__":
    """
    Example usage of SmolLM prompt manager
    """
    
    # Get system prompt
    prompt = SmolLMPromptManager.get_system_prompt()
    print(f"System Prompt Length: {len(prompt)} characters\n")
    
    # Build Ollama query
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "How can I help?"}
    ]
    query = SmolLMPromptManager.build_ollama_query("smollm2:135m", messages)
    print(f"Ollama Query Keys: {query.keys()}\n")
    
    # Format response
    raw_response = "**Opening print interface** now! This will start the entire printing workflow immediately."
    formatted = SmolLMPromptManager.format_response(raw_response)
    print(f"Original: {raw_response}")
    print(f"Formatted: {formatted}\n")
    
    # Test command responses
    params = {"document_number": 2, "section": "converted"}
    response = SmolLMPromptManager.get_friendly_command_response("select_document", params)
    print(f"Command Response: {response}\n")
    
    # Test command detection
    print(f"Is 'print this' a print command? {SmolLMPromptManager.is_print_command('print this')}")
    print(f"Is 'how to print?' a print command? {SmolLMPromptManager.is_print_command('how to print?')}")
    print(f"Is 'scan please' a scan command? {SmolLMPromptManager.is_scan_command('scan please')}")
