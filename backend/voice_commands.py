"""
Voice Command Mapping Reference
Unified source of truth for all voice commands, phonetic alternatives, and their handlers

This file documents ALL voice commands supported by PrintChakra's voice AI system.
Backend: modules/voice/__init__.py processes these commands
Frontend: components/voice/VoiceAIChat.tsx handles voice interaction

Usage:
- Each command has main phrase, phonetic alternatives, description, and handler
- Used by voice processing to interpret user intent
- Helps developers understand and extend voice capabilities
"""

from typing import Dict, List, Any

# =============================================================================
# PRINT COMMANDS
# =============================================================================

PRINT_COMMANDS = {
    "trigger": {
        "phrases": [
            "print",
            "print document",
            "print file",
            "print this",
            "print the document",
            "printout",
            "make a printout",
            "give me a printout",
            "hard copy",
            "paper copy",
        ],
        "description": "Opens print configuration interface with AI-detected settings",
        "handler": "orchestration_service.detect_intent() -> IntentType.PRINT",
        "backend_route": "/voice/process -> orchestrator.process_command()",
        "frontend_handler": "handleVoiceOrchestrationTrigger(mode='print')",
        "example": "User: 'Print this document' → Opens print config with defaults",
    },
    "print_with_copies": {
        "phrases": [
            "print {N} copies",
            "print {N} copy",
            "make {N} copies",
            "{N} copies please",
        ],
        "description": "Print with specified number of copies",
        "handler": "detect_intent() extracts copies parameter via regex",
        "regex": r"(\d+)\s*cop(?:y|ies)",
        "example": "User: 'Print 3 copies' → config.copies = 3",
    },
    "print_color": {
        "phrases": [
            "print in color",
            "color print",
            "colored printout",
        ],
        "description": "Print in color mode",
        "handler": "detect_intent() sets color_mode='color'",
        "example": "User: 'Print in color' → config.color_mode = 'color'",
    },
    "print_bw": {
        "phrases": [
            "print in black and white",
            "black and white print",
            "grayscale print",
            "monochrome print",
        ],
        "description": "Print in black/white or grayscale",
        "handler": "detect_intent() sets color_mode='grayscale'",
        "example": "User: 'Print in grayscale' → config.color_mode = 'grayscale'",
    },
    "print_duplex": {
        "phrases": [
            "print double sided",
            "print both sides",
            "duplex print",
            "two sided print",
        ],
        "description": "Print on both sides of paper",
        "handler": "detect_intent() sets duplex=True",
        "example": "User: 'Print double sided' → config.duplex = True",
    },
    "print_landscape": {
        "phrases": [
            "print in landscape",
            "landscape orientation",
            "horizontal print",
        ],
        "description": "Print in landscape orientation",
        "handler": "detect_intent() sets orientation='landscape'",
        "example": "User: 'Print in landscape' → config.orientation = 'landscape'",
    },
    "print_relative_docs": {
        "phrases": [
            "print the last {N} documents",
            "print the latest {N} files",
            "print the most recent {N} documents",
            "print the last document",
            "print the latest file",
            "print last captured",
        ],
        "description": "Print specific documents by relative position",
        "handler": "get_documents_by_relative_position() -> select docs",
        "regex": r"(?:last|latest|newest|most recent)\s+(\d+)\s+(?:documents?|files?)",
        "example": "User: 'Print the last 2 documents' → Selects newest 2 files",
    },
}

# =============================================================================
# SCAN COMMANDS
# =============================================================================

SCAN_COMMANDS = {
    "trigger": {
        "phrases": [
            "scan",
            "scan document",
            "scan a document",
            "capture document",
            "take a scan",
            "digitize",
            "photo document",
        ],
        "description": "Opens scan configuration interface",
        "handler": "orchestration_service.detect_intent() -> IntentType.SCAN",
        "backend_route": "/voice/process -> orchestrator.process_command()",
        "frontend_handler": "handleVoiceOrchestrationTrigger(mode='scan')",
        "example": "User: 'Scan a document' → Opens scan config",
    },
    "scan_high_quality": {
        "phrases": [
            "scan high quality",
            "scan high resolution",
            "scan at 600 dpi",
            "high quality scan",
        ],
        "description": "Scan at high resolution",
        "handler": "detect_intent() sets resolution=600",
        "example": "User: 'Scan high quality' → config.resolution = 600",
    },
    "scan_as_pdf": {
        "phrases": [
            "scan as PDF",
            "save as PDF",
            "PDF scan",
        ],
        "description": "Scan and save as PDF format",
        "handler": "detect_intent() sets format='pdf'",
        "example": "User: 'Scan as PDF' → config.format = 'pdf'",
    },
    "scan_with_ocr": {
        "phrases": [
            "scan with OCR",
            "scan with text extraction",
            "scan in text mode",
            "extract text while scanning",
        ],
        "description": "Scan with OCR text extraction enabled",
        "handler": "detect_intent() sets scanTextMode=True",
        "example": "User: 'Scan with OCR' → config.scanTextMode = True",
    },
}

# =============================================================================
# MODE SWITCHING COMMANDS
# =============================================================================

MODE_SWITCH_COMMANDS = {
    "switch_to_print": {
        "phrases": [
            "switch to print",
            "switch to print configuration",
            "change to print mode",
            "go to print settings",
            "open print config",
            "show print options",
        ],
        "description": "Switch from scan to print configuration",
        "handler": "detect_intent() with switch_mode='print'",
        "example": "User: 'Switch to print configuration' → Changes mode to print",
    },
    "switch_to_scan": {
        "phrases": [
            "switch to scan",
            "switch to scan configuration",
            "change to scan mode",
            "go to scan settings",
            "open scan config",
            "show scan options",
        ],
        "description": "Switch from print to scan configuration",
        "handler": "detect_intent() with switch_mode='scan'",
        "example": "User: 'Switch to scan configuration' → Changes mode to scan",
    },
}

# =============================================================================
# NAVIGATION & CONTROL COMMANDS
# =============================================================================

NAVIGATION_COMMANDS = {
    "confirm": {
        "phrases": [
            "yes",
            "okay",
            "ok",
            "confirm",
            "proceed",
            "go ahead",
            "do it",
            "apply",
            "submit",
            "continue",
            "next",
        ],
        "description": "Confirm current action or proceed to next step",
        "handler": "VoiceAIChatService.interpret_voice_command() -> 'confirm'",
        "example": "User: 'Yes, proceed' → Confirms print/scan job",
    },
    "cancel": {
        "phrases": [
            "no",
            "cancel",
            "stop",
            "exit",
            "quit",
            "back",
            "nope",
            "don't",
            "abort",
            "nevermind",
        ],
        "description": "Cancel current action or go back",
        "handler": "VoiceAIChatService.interpret_voice_command() -> 'cancel'",
        "example": "User: 'Cancel' → Cancels pending operation",
    },
    "help": {
        "phrases": [
            "help",
            "assist",
            "how to",
            "guide",
            "help me",
            "what can you do",
            "show commands",
        ],
        "description": "Show help information",
        "handler": "detect_intent() -> IntentType.HELP",
        "example": "User: 'Help' → Shows available commands",
    },
}

# =============================================================================
# DOCUMENT MANAGEMENT COMMANDS
# =============================================================================

DOCUMENT_COMMANDS = {
    "list_documents": {
        "phrases": [
            "list documents",
            "show documents",
            "what documents",
            "available files",
            "show files",
            "what files do I have",
        ],
        "description": "List all available documents",
        "handler": "detect_intent() -> IntentType.LIST_DOCUMENTS",
        "example": "User: 'Show documents' → Lists all processed files",
    },
    "document_status": {
        "phrases": [
            "status",
            "what's happening",
            "progress",
            "current status",
            "show status",
        ],
        "description": "Show current workflow status",
        "handler": "detect_intent() -> IntentType.VIEW_STATUS",
        "example": "User: 'Status' → Shows current operation state",
    },
}

# =============================================================================
# CONFIGURATION COMMANDS (During Print/Scan Setup)
# =============================================================================

CONFIG_COMMANDS = {
    "change_copies": {
        "phrases": [
            "{N} copies",
            "change copies to {N}",
            "set copies {N}",
            "make it {N} copies",
        ],
        "description": "Change number of copies during configuration",
        "handler": "parse_voice_configuration() extracts copies",
        "regex": r"(\d+)\s*cop(?:y|ies)",
        "example": "User: '5 copies' → Updates config.copies = 5",
    },
    "change_orientation": {
        "phrases": [
            "landscape",
            "portrait",
            "change to landscape",
            "switch to portrait",
        ],
        "description": "Change page orientation",
        "handler": "parse_voice_configuration() sets orientation",
        "example": "User: 'Landscape' → config.orientation = 'landscape'",
    },
    "change_color": {
        "phrases": [
            "color",
            "black and white",
            "grayscale",
            "color mode",
        ],
        "description": "Change color mode",
        "handler": "parse_voice_configuration() sets color_mode",
        "example": "User: 'Color mode' → config.color_mode = 'color'",
    },
    "done_configuring": {
        "phrases": [
            "no changes",
            "that's all",
            "nothing else",
            "done",
            "looks good",
            "all set",
            "i'm good",
            "perfect",
        ],
        "description": "Signal configuration is complete",
        "handler": "parse_voice_configuration() returns no_changes=True",
        "example": "User: 'That's all' → Readies config for execution",
    },
}

# =============================================================================
# SESSION CONTROL COMMANDS
# =============================================================================

SESSION_COMMANDS = {
    "end_session": {
        "phrases": [
            "bye printchakra",
            "goodbye",
            "end session",
            "stop listening",
            "exit voice mode",
        ],
        "description": "End voice AI session",
        "handler": "process_voice_input() detects bye keyword",
        "example": "User: 'Bye PrintChakra' → Ends voice session",
    },
}

# =============================================================================
# FILLER SPEECH (Ignored by System)
# =============================================================================

FILLER_SPEECH = {
    "ignored_phrases": [
        "thank you",
        "thanks",
        "thank",
        "okay",
        "alright",
        "all right",
        "sure",
        "fine",
        "great",
        "cool",
        "nice",
        "good",
        "perfect",
        "hmm",
        "umm",
        "uh",
        "huh",
        "yeah yeah",
        "yep yep",
        "i see",
        "got it",
        "makes sense",
        "understood",
    ],
    "description": "These phrases are filtered out to prevent accidental triggers",
    "handler": "process_voice_input() returns auto_retry=True",
    "example": "User: 'Thank you' → Ignored, continues listening",
}

# =============================================================================
# COMMAND REFERENCE FOR DEVELOPERS
# =============================================================================

def get_all_commands() -> Dict[str, Any]:
    """
    Get complete command reference
    
    Returns:
        Dictionary with all command categories
    """
    return {
        "print": PRINT_COMMANDS,
        "scan": SCAN_COMMANDS,
        "mode_switch": MODE_SWITCH_COMMANDS,
        "navigation": NAVIGATION_COMMANDS,
        "documents": DOCUMENT_COMMANDS,
        "configuration": CONFIG_COMMANDS,
        "session": SESSION_COMMANDS,
        "filler_speech": FILLER_SPEECH,
    }


def get_command_examples() -> List[str]:
    """
    Get list of example voice commands
    
    Returns:
        List of example command strings
    """
    examples = []
    
    for category in get_all_commands().values():
        for cmd_data in category.values():
            if isinstance(cmd_data, dict) and "example" in cmd_data:
                examples.append(cmd_data["example"])
    
    return examples


def search_command(query: str) -> List[Dict[str, Any]]:
    """
    Search for commands matching a query
    
    Args:
        query: Search term
    
    Returns:
        List of matching command definitions
    """
    query_lower = query.lower()
    results = []
    
    all_commands = get_all_commands()
    for category_name, category in all_commands.items():
        for cmd_name, cmd_data in category.items():
            if isinstance(cmd_data, dict):
                # Search in phrases
                if "phrases" in cmd_data:
                    for phrase in cmd_data["phrases"]:
                        if query_lower in phrase.lower():
                            results.append({
                                "category": category_name,
                                "command": cmd_name,
                                **cmd_data
                            })
                            break
                
                # Search in description
                if "description" in cmd_data and query_lower in cmd_data["description"].lower():
                    if not any(r["command"] == cmd_name for r in results):
                        results.append({
                            "category": category_name,
                            "command": cmd_name,
                            **cmd_data
                        })
    
    return results


# =============================================================================
# USAGE EXAMPLES
# =============================================================================

if __name__ == "__main__":
    print("=" * 80)
    print("PrintChakra Voice Command Reference")
    print("=" * 80)
    
    print("\n📋 Total command categories:", len(get_all_commands()))
    print("📝 Total example commands:", len(get_command_examples()))
    
    print("\n🔍 Searching for 'print' commands:")
    results = search_command("print")
    for result in results[:5]:
        print(f"  • {result['command']}: {result['description']}")
    
    print("\n💡 Example Commands:")
    for example in get_command_examples()[:10]:
        print(f"  {example}")
    
    print("\n" + "=" * 80)
