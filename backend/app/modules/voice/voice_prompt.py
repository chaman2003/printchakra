"""
Voice AI Chat Service Prompts and Query Logic
Centralized management of Voice AI system prompts, command mappings, and response generation

This module contains:
1. System prompt for PrintChakra AI context
2. Voice command mappings for document control
3. Query generation logic for Ollama API
4. Response formatting and validation
"""

from typing import Dict, Any, List, Optional, Tuple
import copy
import json
import logging
from datetime import datetime
from pathlib import Path

from app.config.settings import AI_PROMPT_CONFIG, COMMAND_MAPPINGS_FILE, SYSTEM_PROMPT_FILE

logger = logging.getLogger(__name__)


# ============================================================================
DEFAULT_SYSTEM_PROMPT = """You are PrintChakra AI - a voice-controlled document assistant.

GREETING (always start with):
"How can I help you? You can say print a document or scan a document."

[WARN] CRITICAL: Print/scan intents are intercepted before reaching you.

YOUR CAPABILITIES:

1. DOCUMENT SELECTOR CONTROL (per-section 1-based numbering):
   - "select original number 2" -> Select doc #2 from Originals
   - "switch to converted" -> Switch to Converted section
   - "show uploaded" -> Switch to Uploaded section
   - "next document" -> Move to next in current section
   - "previous document" -> Move to previous in current section
   - "upload a document" -> Trigger upload modal

2. PARAMETER MODIFICATION (real-time UI updates):
   - "switch to grayscale" -> Change color mode
   - "set DPI to 300" -> Change resolution
   - "landscape orientation" -> Change layout
   - "2 copies" -> Set copy count
   - "double sided" -> Enable duplex
   - "turn on OCR" -> Enable text mode

3. GLOBAL COMMANDS:
   - "cancel" -> Cancel current operation
   - "status" -> Report current workflow state
   - "repeat settings" -> Read back current config
   - "help" -> List available commands
   - "stop recording" -> End voice session

4. CONFIRMATION:
   - "confirm print" / "confirm scan" -> Execute operation
   - Always repeat settings before confirming

5. REAL-TIME UPDATES (announce these):
   - Processing progress percentages
   - Page capture events
   - OCR progress
   - Completion status

BE CONCISE (under 15 words). Answer questions directly.

Remember: You control the ENTIRE workflow through voice."""


DEFAULT_COMMAND_CONFIG = {
    "voice_commands": {
        "select_document": [
            "select document", "choose document", "pick document", "open document",
            "select original document", "select converted document", "select uploaded document",
            "document number", "file number", "document", "file"
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
        "confirm": [
            "confirm", "confirm print", "confirm scan",
            "yes proceed", "execute", "do it", "start", "begin"
        ],
        "cancel": [
            "cancel", "stop", "abort",
            "don't do it", "nevermind", "forget it"
        ],
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
        "stop_recording": [
            "stop recording", "stop listening", "end session",
            "bye", "goodbye", "stop voice"
        ],
    },
    "friendly_responses": {
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
    },
    "confirmation_words": [
        "yes", "proceed", "go ahead", "okay", "ok",
        "sure", "yep", "yeah", "ye"
    ],
    "print_keywords": [
        "print", "printing", "printout",
        "print doc", "print file", "print paper", "print document", "i want to print", "need to print"
    ],
    "scan_keywords": [
        "scan", "scanning", "capture",
        "scan doc", "scan file", "capture doc", "capture document", "scan document"
    ],
    "question_words": [
        "what", "can you", "how do", "help", "how to",
        "tell me", "can i", "what is", "can print", "help me", "show me"
    ],
    "ollama": {
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "num_predict": 30,
            "num_ctx": 1024,
            "repeat_penalty": 1.2,
            "stop": ["\n\n", "User:", "Assistant:"],
        },
        "timeout": 60,
    },
}


def _load_system_prompt() -> str:
    prompt_path = Path(AI_PROMPT_CONFIG.get("system_prompt_file", SYSTEM_PROMPT_FILE))
    try:
        if prompt_path.exists():
            content = prompt_path.read_text(encoding="utf-8").strip()
            if content:
                logger.info(f"[OK] Loaded system prompt from {prompt_path}")
                return content
            logger.warning(f"[WARN] System prompt file is empty: {prompt_path}")
        else:
            logger.warning(f"[WARN] System prompt file not found: {prompt_path}")
    except Exception as exc:  # pragma: no cover - filesystem edge cases
        logger.error(f"[ERROR] Failed to load system prompt ({prompt_path}): {exc}")
    return DEFAULT_SYSTEM_PROMPT


def _deep_merge(base: dict, override: dict) -> dict:
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            base[key] = _deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def _load_command_config() -> dict:
    config_path = Path(AI_PROMPT_CONFIG.get("command_mappings_file", COMMAND_MAPPINGS_FILE))
    try:
        if config_path.exists():
            with config_path.open("r", encoding="utf-8") as file:
                payload = json.load(file)
                if isinstance(payload, dict):
                    logger.info(f"[OK] Loaded command mappings from {config_path}")
                    return payload
                logger.warning(f"[WARN] Command mapping file must contain a JSON object: {config_path}")
        else:
            logger.warning(f"[WARN] Command mapping file not found: {config_path}")
    except json.JSONDecodeError as exc:
        logger.error(f"[ERROR] Invalid JSON in {config_path}: {exc}")
    except Exception as exc:  # pragma: no cover - filesystem edge cases
        logger.error(f"[ERROR] Failed to read {config_path}: {exc}")
    return {}


def _build_command_config() -> dict:
    override_config = _load_command_config()
    return _deep_merge(copy.deepcopy(DEFAULT_COMMAND_CONFIG), override_config if isinstance(override_config, dict) else {})


VOICE_SYSTEM_PROMPT = _load_system_prompt()
COMMAND_CONFIG = _build_command_config()
VOICE_COMMAND_MAPPINGS = COMMAND_CONFIG["voice_commands"]
COMMAND_RESPONSE_MAPPING = COMMAND_CONFIG["friendly_responses"]
CONFIRMATION_WORDS = COMMAND_CONFIG["confirmation_words"]
PRINT_KEYWORDS = COMMAND_CONFIG["print_keywords"]
SCAN_KEYWORDS = COMMAND_CONFIG["scan_keywords"]
QUESTION_WORDS = COMMAND_CONFIG["question_words"]
OLLAMA_QUERY_OPTIONS = COMMAND_CONFIG["ollama"]["options"]
OLLAMA_API_TIMEOUT = COMMAND_CONFIG["ollama"].get("timeout", 60)  # Default voice AI timeout


# ============================================================================
# RESPONSE GENERATION AND FORMATTING
# ============================================================================

class VoicePromptManager:
    """Manager for Voice AI prompts, commands, and query generation"""
    
    @staticmethod
    def get_system_prompt() -> str:
        """
        Get the system prompt for Voice AI
        
        Returns:
            System prompt string for Ollama API
        """
        return VOICE_SYSTEM_PROMPT
    
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
            ...     {"role": "system", "content": SYSTEM_PROMPT},
            ...     {"role": "user", "content": "Print this document"}
            ... ]
            >>> query = VoicePromptManager.build_ollama_query("smollm2:135m", messages)
            >>> response = requests.post("http://localhost:11434/api/chat", json=query, timeout=60)
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
        - Remove code blocks and special symbols
        - Only allow English letters, numbers, and basic punctuation
        - Limit to 2 sentences max
        - Limit to 25 words max for natural speech
        - Ensure proper punctuation
        
        Args:
            ai_response: Raw response from the selected model
            
        Returns:
            Formatted, voice-friendly response with only English and numbers
            
        Example:
            >>> raw = "**Opening print interface** now! This will start the printing process."
            >>> formatted = VoicePromptManager.format_response(raw)
            >>> print(formatted)
            Opening print interface now.
        """
        import re
        
        # Clean up markdown formatting
        ai_response = ai_response.replace("**", "").replace("*", "")
        
        # Remove code blocks (```code```)
        ai_response = re.sub(r'```[\s\S]*?```', '', ai_response)
        ai_response = re.sub(r'`[^`]*`', '', ai_response)
        
        # Remove URLs
        ai_response = re.sub(r'https?://\S+', '', ai_response)
        
        # Remove emojis and special unicode characters
        ai_response = re.sub(r'[\U0001F600-\U0001F64F]', '', ai_response)  # emoticons
        ai_response = re.sub(r'[\U0001F300-\U0001F5FF]', '', ai_response)  # symbols & pictographs
        ai_response = re.sub(r'[\U0001F680-\U0001F6FF]', '', ai_response)  # transport & map symbols
        ai_response = re.sub(r'[\U0001F1E0-\U0001F1FF]', '', ai_response)  # flags
        ai_response = re.sub(r'[\U00002702-\U000027B0]', '', ai_response)  # dingbats
        ai_response = re.sub(r'[\U0001F900-\U0001F9FF]', '', ai_response)  # supplemental symbols
        
        # Only allow: English letters (a-z, A-Z), numbers (0-9), 
        # basic punctuation (. , ! ? ' - : ;), and spaces
        ai_response = re.sub(r"[^a-zA-Z0-9\s.,!?'\-:;]", '', ai_response)
        
        # Clean up multiple spaces
        ai_response = re.sub(r'\s+', ' ', ai_response).strip()
        
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
        words = ai_response.split()
        if len(words) < 2 or not any(c.isalpha() for c in ai_response):
            logger.warning(f"[WARN] Invalid response detected: '{ai_response}'")
            ai_response = "I am here to help with document scanning and printing."
        
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
            >>> response = VoicePromptManager.get_friendly_command_response(
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
            >>> VoicePromptManager.is_confirmation("yes proceed")
            True
            >>> VoicePromptManager.is_confirmation("no thanks")
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
            >>> VoicePromptManager.is_print_command("print this document")
            True
            >>> VoicePromptManager.is_print_command("how do I print?")
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
            >>> VoicePromptManager.is_scan_command("scan a document")
            True
            >>> VoicePromptManager.is_scan_command("can you scan?")
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
    Example usage of Voice AI prompt manager
    """
    
    # Get system prompt
    prompt = VoicePromptManager.get_system_prompt()
    print(f"System Prompt Length: {len(prompt)} characters\n")
    
    # Build Ollama query
    messages = [
        {"role": "system", "content": prompt},
        {"role": "user", "content": "How can I help?"}
    ]
    query = VoicePromptManager.build_ollama_query("smollm2:135m", messages)
    print(f"Ollama Query Keys: {query.keys()}\n")
    
    # Format response
    raw_response = "**Opening print interface** now! This will start the entire printing workflow immediately."
    formatted = VoicePromptManager.format_response(raw_response)
    print(f"Original: {raw_response}")
    print(f"Formatted: {formatted}\n")
    
    # Test command responses
    params = {"document_number": 2, "section": "converted"}
    response = VoicePromptManager.get_friendly_command_response("select_document", params)
    print(f"Command Response: {response}\n")
    
    # Test command detection
    print(f"Is 'print this' a print command? {VoicePromptManager.is_print_command('print this')}")
    print(f"Is 'how to print?' a print command? {VoicePromptManager.is_print_command('how to print?')}")
    print(f"Is 'scan please' a scan command? {VoicePromptManager.is_scan_command('scan please')}")
