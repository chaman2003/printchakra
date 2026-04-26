"""Parsing helpers for orchestration voice/text commands."""

import re
from typing import Any, Dict, Tuple


def detect_intent_and_parameters(user_input: str) -> Tuple[str, Dict[str, Any]]:
    """Detect a normalized intent key and extracted parameters."""
    user_input_lower = user_input.lower()
    parameters: Dict[str, Any] = {}

    switch_keywords = ["switch to", "change to", "go to", "open", "show me", "navigate to"]
    if any(keyword in user_input_lower for keyword in switch_keywords):
        if "print" in user_input_lower:
            parameters["switch_mode"] = "print"
            parameters["voice_triggered"] = True
            return "print", parameters
        if "scan" in user_input_lower:
            parameters["switch_mode"] = "scan"
            parameters["voice_triggered"] = True
            return "scan", parameters

    print_keywords = ["print", "printing", "printout", "hard copy", "paper copy"]
    if any(keyword in user_input_lower for keyword in print_keywords):
        doc_patterns = [
            r"(?:print|printing)\s+(?:the\s+)?(?:last|latest|newest|most recent)\s+(\d+)\s+(?:documents?|files?)",
            r"(?:print|printing)\s+(?:the\s+)?(?:first|oldest)\s+(\d+)\s+(?:documents?|files?)",
            r"(?:print|printing)\s+(?:the\s+)?(?:last|latest|newest|recent)\s+(?:document|file|one)",
        ]

        for pattern in doc_patterns:
            match = re.search(pattern, user_input_lower)
            if match:
                if match.lastindex and match.lastindex >= 1:
                    count = int(match.group(1))
                    parameters["document_selection"] = "relative"
                    parameters["document_count"] = count
                    parameters["document_position"] = (
                        "last"
                        if "last" in match.group(0)
                        or "latest" in match.group(0)
                        or "newest" in match.group(0)
                        or "recent" in match.group(0)
                        else "first"
                    )
                else:
                    parameters["document_selection"] = "relative"
                    parameters["document_count"] = 1
                    parameters["document_position"] = "last"
                break

        if "color" in user_input_lower or "black" in user_input_lower or "grayscale" in user_input_lower:
            parameters["color_mode"] = "color"

        copy_match = re.search(r"(\d+)\s*cop(?:y|ies)", user_input_lower)
        if copy_match:
            parameters["copies"] = int(copy_match.group(1))

        if "a4" in user_input_lower:
            parameters["paper_size"] = "A4"
        elif "letter" in user_input_lower:
            parameters["paper_size"] = "letter"

        if (
            "both sides" in user_input_lower
            or "duplex" in user_input_lower
            or "double sided" in user_input_lower
        ):
            parameters["duplex"] = True

        return "print", parameters

    scan_keywords = ["scan", "scanning", "capture", "digitize", "photo"]
    if any(keyword in user_input_lower for keyword in scan_keywords):
        if "high quality" in user_input_lower or "high resolution" in user_input_lower:
            parameters["resolution"] = 600
            parameters["quality"] = "high"
        elif "low quality" in user_input_lower or "low resolution" in user_input_lower:
            parameters["resolution"] = 150
            parameters["quality"] = "low"

        if "pdf" in user_input_lower:
            parameters["format"] = "pdf"
        elif "jpg" in user_input_lower or "jpeg" in user_input_lower:
            parameters["format"] = "jpg"

        return "scan", parameters

    status_keywords = ["status", "what's happening", "progress", "how's it going"]
    if any(keyword in user_input_lower for keyword in status_keywords):
        return "view_status", {}

    config_keywords = ["configure", "settings", "set up", "change settings", "options"]
    if any(keyword in user_input_lower for keyword in config_keywords):
        return "configure", parameters

    list_keywords = ["list", "show documents", "what documents", "available files", "show files"]
    if any(keyword in user_input_lower for keyword in list_keywords):
        return "list_documents", {}

    help_keywords = ["help", "what can you do", "capabilities", "how to"]
    if any(keyword in user_input_lower for keyword in help_keywords):
        return "help", {}

    return "unknown", {}


def parse_voice_configuration_updates(voice_text: str, action_type: str) -> Dict[str, Any]:
    """Parse configuration updates from voice text."""
    updates: Dict[str, Any] = {}
    text_lower = voice_text.lower()

    def contains_any(phrases):
        return any(phrase in text_lower for phrase in phrases)

    stop_phrases = [
        "no changes",
        "that's all",
        "nothing else",
        "done",
        "proceed",
        "continue",
        "i'm good",
        "all set",
        "looks good",
    ]
    if any(phrase in text_lower for phrase in stop_phrases):
        return {"no_changes": True}

    if action_type == "print":
        if contains_any(["landscape", "horizontal", "wide"]):
            updates["orientation"] = "landscape"
        elif contains_any(["portrait", "vertical", "tall"]):
            updates["orientation"] = "portrait"

        copies_match = re.search(r"(\d+)\s*(?:cop(?:y|ies)|prints|pages)", text_lower)
        if copies_match:
            updates["copies"] = int(copies_match.group(1))
        elif contains_any(["single copy", "one copy"]):
            updates["copies"] = 1

        if contains_any([
            "full color",
            "print in color",
            "color mode",
            "black and white",
            "black & white",
            "bw",
            "monochrome",
            "mono",
            "gray scale",
            "grey scale",
            "grayscale",
            "greyscale",
        ]):
            updates["color_mode"] = "color"
        elif "color" in text_lower:
            updates["color_mode"] = "color"

        if contains_any(["double sided", "two sided", "both sides", "duplex", "front and back"]):
            updates["duplex"] = True
        elif contains_any(["single sided", "one sided", "front only", "simplex"]):
            updates["duplex"] = False

        page_range_match = re.search(r"page(?:s)?\s+(\d+)(?:\s*-\s*|\s+to\s+)(\d+)", text_lower)
        if page_range_match:
            updates["pages"] = "custom"
            updates["custom_range"] = f"{page_range_match.group(1)}-{page_range_match.group(2)}"
        elif contains_any(["odd page", "odd pages", "only odd", "odd only", "just odd"]):
            updates["pages"] = "odd"
        elif contains_any(["even page", "even pages", "only even", "even only", "just even"]):
            updates["pages"] = "even"
        elif contains_any(["all pages", "entire document", "every page"]):
            updates["pages"] = "all"

        paper_sizes = ["a5", "a4", "a3", "letter", "legal", "tabloid"]
        for size in paper_sizes:
            if size in text_lower:
                updates["paper_size"] = size
                break
        if "custom" in text_lower and re.search(r"(\d+(?:\.\d+)?)\s*(?:x|by)\s*(\d+(?:\.\d+)?)", text_lower):
            updates["paper_size"] = "custom"

        dpi_match = re.search(r"(\d+)\s*dpi", text_lower)
        if dpi_match:
            updates["resolution"] = int(dpi_match.group(1))
        elif contains_any(["high resolution", "high quality", "ultra quality"]):
            updates["resolution"] = 600
            updates["quality"] = "high"
        elif contains_any(["draft quality", "draft mode", "low quality", "fast draft"]):
            updates["resolution"] = 150
            updates["quality"] = "draft"

        scale_match = re.search(r"(\d{2,3})\s*(?:%|percent)", text_lower)
        if scale_match:
            updates["scale"] = int(scale_match.group(1))
        elif contains_any(["fit to page", "fit page", "full size"]):
            updates["scale"] = 100

        pps_match = re.search(r"(\d+)\s*(?:per\s*(?:sheet|page|side))", text_lower)
        if pps_match:
            updates["pages_per_sheet"] = pps_match.group(1)
        elif contains_any(["two up", "2-up", "2 up"]):
            updates["pages_per_sheet"] = "2"
        elif contains_any(["four up", "4-up", "4 up"]):
            updates["pages_per_sheet"] = "4"

        if contains_any(["no margin", "borderless", "edge to edge", "full bleed"]):
            updates["margins"] = "none"
        elif contains_any(["narrow margin", "thin margin", "small margin"]):
            updates["margins"] = "narrow"
        elif contains_any(["default margin", "standard margin", "normal margin"]):
            updates["margins"] = "default"

        if contains_any(["ultra quality", "high quality", "best quality", "premium quality"]):
            updates["quality"] = "high"
        elif contains_any(["draft", "eco mode", "low quality", "economy mode"]):
            updates["quality"] = "draft"
        elif contains_any(["normal quality", "standard quality"]):
            updates["quality"] = "normal"

    elif action_type == "scan":
        dpi_match = re.search(r"(\d+)\s*dpi", text_lower)
        if dpi_match:
            updates["resolution"] = int(dpi_match.group(1))
        elif contains_any(["1200", "twelve hundred"]):
            updates["resolution"] = 1200
        elif contains_any(["600", "six hundred"]):
            updates["resolution"] = 600
        elif contains_any(["300", "three hundred"]):
            updates["resolution"] = 300

        if contains_any(["full color", "color scan", "scan in color"]):
            updates["color_mode"] = "color"
        elif contains_any(["black and white", "black & white", "grayscale", "greyscale", "mono", "monochrome"]) or "color" in text_lower:
            updates["color_mode"] = "color"

        formats = ["pdf", "png", "jpg", "jpeg", "tiff"]
        for fmt in formats:
            if fmt in text_lower:
                updates["format"] = fmt
                break
        if "image" in text_lower and "pdf" not in text_lower:
            updates.setdefault("format", "png")

        page_sizes = ["a5", "a4", "letter", "legal", "a3"]
        for size in page_sizes:
            if size in text_lower:
                updates["paper_size"] = size
                break

        if contains_any(["landscape", "horizontal", "wide"]):
            updates["orientation"] = "landscape"
        elif contains_any(["portrait", "vertical", "tall"]):
            updates["orientation"] = "portrait"

        page_range_match = re.search(r"page(?:s)?\s+(\d+)(?:\s*-\s*|\s+to\s+)(\d+)", text_lower)
        if page_range_match:
            updates["page_mode"] = "custom"
            updates["custom_range"] = f"{page_range_match.group(1)}-{page_range_match.group(2)}"
        elif contains_any(["odd page", "odd pages", "only odd", "odd only", "just odd"]):
            updates["page_mode"] = "odd"
        elif contains_any(["even page", "even pages", "only even", "even only", "just even"]):
            updates["page_mode"] = "even"
        elif contains_any(["all pages", "entire document", "everything"]):
            updates["page_mode"] = "all"

        if contains_any(["text mode", "ocr", "extract text", "enable ocr", "turn on ocr"]):
            updates["text_mode"] = True
        elif contains_any(["disable ocr", "turn off ocr", "no text"]):
            updates["text_mode"] = False

        if contains_any(["multi", "batch", "continuous", "auto feed"]):
            updates["mode"] = "multi"
        elif contains_any(["single", "one page", "single shot"]):
            updates["mode"] = "single"

        if contains_any(["high quality", "best quality", "premium quality"]):
            updates["quality"] = "high"
        elif contains_any(["draft", "eco mode", "low quality"]):
            updates["quality"] = "draft"
        elif contains_any(["normal quality", "standard quality"]):
            updates["quality"] = "normal"

    return updates
