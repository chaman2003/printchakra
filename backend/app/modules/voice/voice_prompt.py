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
DEFAULT_SYSTEM_PROMPT = """You are PrintChakra AI - a concise voice assistant for document printing and scanning.

CRITICAL RULES:
1. NEVER say more than 15 words.
2. Be direct and action-focused.
3. Use simple confirmations like "Got it", "Done", "Ready".
4. Print/scan intents are handled automatically - don't repeat them.

RESPONSE STYLE:
- "Got it, printing." NOT "I'll start the printing process for you now."
- "Landscape." NOT "I've changed the layout to landscape orientation."
- "3 copies." NOT "I've set the number of copies to 3."
- "Ready?" NOT "Are you ready to proceed with the operation?"

DOCUMENT CONTROL (per-section 1-based numbering):
- select document 2 -> "Got it, document 2."
- switch to converted -> "Converted."
- next document -> "Next."

SETTINGS (confirm briefly):
- grayscale -> "Grayscale."
- 300 DPI -> "300 DPI."
- landscape -> "Landscape."
- 2 copies -> "2 copies."

GLOBAL:
- confirm -> "Done!"
- cancel -> "Cancelled."
- help -> "Say: print, scan, select document, or settings."
- status -> "Print mode." or "Ready."

Keep responses under 10 words when possible."""


DEFAULT_COMMAND_CONFIG = {
    "voice_commands": {
        "select_document": [
            "select document", "choose document", "pick document", "open document",
            "select original document", "select converted document", "select uploaded document",
            "document number", "file number", "document", "file"
        ],
        "select_multiple_documents": [
            "select first two", "select first three", "select first four", "select first five",
            "select two documents", "select three documents", "select four documents",
            "select documents 1 and 2", "select documents 1 2", "select 1 and 2",
            "first two documents", "first three documents", "first four documents",
            "select all documents", "select all", "choose all"
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
        "greeting": [
            "hello", "hi", "hey", "greetings", "howdy",
            "good morning", "good afternoon", "good evening",
            "hi there", "hello there"
        ],
    },
    "friendly_responses": {
        "select_document": "Got it, document {document_number}.",
        "select_multiple_documents": "{count} documents selected.",
        "switch_section": "{section}.",
        "next_document": "Next.",
        "previous_document": "Previous.",
        "upload_document": "Upload.",
        "confirm": "Done!",
        "cancel": "Cancelled.",
        "status": "Ready.",
        "repeat_settings": "Settings...",
        "help": "Say: print, scan, or select document.",
        "stop_recording": "Stopping.",
        "greeting": "Hi! Print or scan?",
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
        Format AI response for concise, human-like voice playback.
        
        Transforms:
        - Remove markdown formatting
        - Limit to 1 sentence, max 15 words
        - Keep only essential information
        
        Args:
            ai_response: Raw response from the model
            
        Returns:
            Short, voice-friendly response
        """
        import re
        
        # Clean up markdown formatting
        ai_response = ai_response.replace("**", "").replace("*", "")
        
        # Remove code blocks
        ai_response = re.sub(r'```[\s\S]*?```', '', ai_response)
        ai_response = re.sub(r'`[^`]*`', '', ai_response)
        
        # Remove URLs
        ai_response = re.sub(r'https?://\S+', '', ai_response)
        
        # Remove emojis
        ai_response = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0001F900-\U0001F9FF]', '', ai_response)
        
        # Only allow English letters, numbers, basic punctuation
        ai_response = re.sub(r"[^a-zA-Z0-9\s.,!?'\-:;]", '', ai_response)
        
        # Clean up multiple spaces
        ai_response = re.sub(r'\s+', ' ', ai_response).strip()
        
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
    
    @staticmethod
    def is_greeting(user_message: str) -> bool:
        """
        Check if user message is a greeting
        
        Args:
            user_message: User's text input
            
        Returns:
            True if message appears to be a greeting
            
        Example:
            >>> VoicePromptManager.is_greeting("hello")
            True
            >>> VoicePromptManager.is_greeting("hi there")
            True
        """
        user_lower = user_message.lower().strip()
        
        # Get greeting keywords from config
        greeting_keywords = DEFAULT_COMMAND_CONFIG.get("voice_commands", {}).get("greeting", [])
        
        # Check if message matches greeting pattern
        return any(
            user_lower == kw or user_lower.startswith(kw + " ") or kw in user_lower
            for kw in greeting_keywords
        )


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
