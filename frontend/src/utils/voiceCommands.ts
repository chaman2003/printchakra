/**
 * Voice Command Mapping Reference (Frontend)
 * Unified source of truth for all voice commands and their phonetic alternatives
 * 
 * This file mirrors backend/voice_commands.py for frontend reference
 * Used by: components/voice/VoiceAIChat.tsx
 * 
 * Each command includes:
 * - Main phrases and phonetic alternatives
 * - Description of what it does
 * - Which handler processes it
 * - Example usage
 */

export interface VoiceCommand {
  phrases: string[];
  description: string;
  handler: string;
  example: string;
  regex?: string;
  frontendHandler?: string;
  backendRoute?: string;
}

export interface CommandCategory {
  [key: string]: VoiceCommand;
}

// =============================================================================
// PRINT COMMANDS
// =============================================================================

export const PRINT_COMMANDS: CommandCategory = {
  trigger: {
    phrases: [
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
    description: "Opens print configuration interface with AI-detected settings",
    handler: "orchestration_service.detect_intent() -> IntentType.PRINT",
    backendRoute: "/voice/process -> orchestrator.process_command()",
    frontendHandler: "handleVoiceOrchestrationTrigger(mode='print')",
    example: "User: 'Print this document' → Opens print config with defaults",
  },
  
  printWithCopies: {
    phrases: [
      "print {N} copies",
      "print {N} copy",
      "make {N} copies",
      "{N} copies please",
    ],
    description: "Print with specified number of copies",
    handler: "detect_intent() extracts copies parameter via regex",
    regex: "(\\d+)\\s*cop(?:y|ies)",
    example: "User: 'Print 3 copies' → config.copies = 3",
  },
  
  printColor: {
    phrases: [
      "print in color",
      "color print",
      "colored printout",
    ],
    description: "Print in color mode",
    handler: "detect_intent() sets color_mode='color'",
    example: "User: 'Print in color' → config.color_mode = 'color'",
  },
  
  printBW: {
    phrases: [
      "print in black and white",
      "black and white print",
      "grayscale print",
      "monochrome print",
    ],
    description: "Print in black/white or grayscale",
    handler: "detect_intent() sets color_mode='grayscale'",
    example: "User: 'Print in grayscale' → config.color_mode = 'grayscale'",
  },
  
  printDuplex: {
    phrases: [
      "print double sided",
      "print both sides",
      "duplex print",
      "two sided print",
    ],
    description: "Print on both sides of paper",
    handler: "detect_intent() sets duplex=True",
    example: "User: 'Print double sided' → config.duplex = True",
  },
  
  printLandscape: {
    phrases: [
      "print in landscape",
      "landscape orientation",
      "horizontal print",
    ],
    description: "Print in landscape orientation",
    handler: "detect_intent() sets orientation='landscape'",
    example: "User: 'Print in landscape' → config.orientation = 'landscape'",
  },
  
  printRelativeDocs: {
    phrases: [
      "print the last {N} documents",
      "print the latest {N} files",
      "print the most recent {N} documents",
      "print the last document",
      "print the latest file",
      "print last captured",
    ],
    description: "Print specific documents by relative position",
    handler: "get_documents_by_relative_position() -> select docs",
    regex: "(?:last|latest|newest|most recent)\\s+(\\d+)\\s+(?:documents?|files?)",
    example: "User: 'Print the last 2 documents' → Selects newest 2 files",
  },
};

// =============================================================================
// SCAN COMMANDS
// =============================================================================

export const SCAN_COMMANDS: CommandCategory = {
  trigger: {
    phrases: [
      "scan",
      "scan document",
      "scan a document",
      "capture document",
      "take a scan",
      "digitize",
      "photo document",
    ],
    description: "Opens scan configuration interface",
    handler: "orchestration_service.detect_intent() -> IntentType.SCAN",
    backendRoute: "/voice/process -> orchestrator.process_command()",
    frontendHandler: "handleVoiceOrchestrationTrigger(mode='scan')",
    example: "User: 'Scan a document' → Opens scan config",
  },
  
  scanHighQuality: {
    phrases: [
      "scan high quality",
      "scan high resolution",
      "scan at 600 dpi",
      "high quality scan",
    ],
    description: "Scan at high resolution",
    handler: "detect_intent() sets resolution=600",
    example: "User: 'Scan high quality' → config.resolution = 600",
  },
  
  scanAsPDF: {
    phrases: [
      "scan as PDF",
      "save as PDF",
      "PDF scan",
    ],
    description: "Scan and save as PDF format",
    handler: "detect_intent() sets format='pdf'",
    example: "User: 'Scan as PDF' → config.format = 'pdf'",
  },
  
  scanWithOCR: {
    phrases: [
      "scan with OCR",
      "scan with text extraction",
      "scan in text mode",
      "extract text while scanning",
    ],
    description: "Scan with OCR text extraction enabled",
    handler: "detect_intent() sets scanTextMode=True",
    example: "User: 'Scan with OCR' → config.scanTextMode = True",
  },
};

// =============================================================================
// MODE SWITCHING COMMANDS
// =============================================================================

export const MODE_SWITCH_COMMANDS: CommandCategory = {
  switchToPrint: {
    phrases: [
      "switch to print",
      "switch to print configuration",
      "change to print mode",
      "go to print settings",
      "open print config",
      "show print options",
    ],
    description: "Switch from scan to print configuration",
    handler: "detect_intent() with switch_mode='print'",
    example: "User: 'Switch to print configuration' → Changes mode to print",
  },
  
  switchToScan: {
    phrases: [
      "switch to scan",
      "switch to scan configuration",
      "change to scan mode",
      "go to scan settings",
      "open scan config",
      "show scan options",
    ],
    description: "Switch from print to scan configuration",
    handler: "detect_intent() with switch_mode='scan'",
    example: "User: 'Switch to scan configuration' → Changes mode to scan",
  },
};

// =============================================================================
// NAVIGATION & CONTROL COMMANDS
// =============================================================================

export const NAVIGATION_COMMANDS: CommandCategory = {
  confirm: {
    phrases: [
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
    description: "Confirm current action or proceed to next step",
    handler: "VoiceAIChatService.interpret_voice_command() -> 'confirm'",
    example: "User: 'Yes, proceed' → Confirms print/scan job",
  },
  
  cancel: {
    phrases: [
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
    description: "Cancel current action or go back",
    handler: "VoiceAIChatService.interpret_voice_command() -> 'cancel'",
    example: "User: 'Cancel' → Cancels pending operation",
  },
  
  help: {
    phrases: [
      "help",
      "assist",
      "how to",
      "guide",
      "help me",
      "what can you do",
      "show commands",
    ],
    description: "Show help information",
    handler: "detect_intent() -> IntentType.HELP",
    example: "User: 'Help' → Shows available commands",
  },
};

// =============================================================================
// DOCUMENT MANAGEMENT COMMANDS
// =============================================================================

export const DOCUMENT_COMMANDS: CommandCategory = {
  listDocuments: {
    phrases: [
      "list documents",
      "show documents",
      "what documents",
      "available files",
      "show files",
      "what files do I have",
    ],
    description: "List all available documents",
    handler: "detect_intent() -> IntentType.LIST_DOCUMENTS",
    example: "User: 'Show documents' → Lists all processed files",
  },
  
  documentStatus: {
    phrases: [
      "status",
      "what's happening",
      "progress",
      "current status",
      "show status",
    ],
    description: "Show current workflow status",
    handler: "detect_intent() -> IntentType.VIEW_STATUS",
    example: "User: 'Status' → Shows current operation state",
  },
};

// =============================================================================
// CONFIGURATION COMMANDS (During Print/Scan Setup)
// =============================================================================

export const CONFIG_COMMANDS: CommandCategory = {
  changeCopies: {
    phrases: [
      "{N} copies",
      "change copies to {N}",
      "set copies {N}",
      "make it {N} copies",
    ],
    description: "Change number of copies during configuration",
    handler: "parse_voice_configuration() extracts copies",
    regex: "(\\d+)\\s*cop(?:y|ies)",
    example: "User: '5 copies' → Updates config.copies = 5",
  },
  
  changeOrientation: {
    phrases: [
      "landscape",
      "portrait",
      "change to landscape",
      "switch to portrait",
    ],
    description: "Change page orientation",
    handler: "parse_voice_configuration() sets orientation",
    example: "User: 'Landscape' → config.orientation = 'landscape'",
  },
  
  changeColor: {
    phrases: [
      "color",
      "black and white",
      "grayscale",
      "color mode",
    ],
    description: "Change color mode",
    handler: "parse_voice_configuration() sets color_mode",
    example: "User: 'Color mode' → config.color_mode = 'color'",
  },
  
  doneConfiguring: {
    phrases: [
      "no changes",
      "that's all",
      "nothing else",
      "done",
      "looks good",
      "all set",
      "i'm good",
      "perfect",
    ],
    description: "Signal configuration is complete",
    handler: "parse_voice_configuration() returns no_changes=True",
    example: "User: 'That's all' → Readies config for execution",
  },
};

// =============================================================================
// SESSION CONTROL COMMANDS
// =============================================================================

export const SESSION_COMMANDS: CommandCategory = {
  endSession: {
    phrases: [
      "bye printchakra",
      "goodbye",
      "end session",
      "stop listening",
      "exit voice mode",
    ],
    description: "End voice AI session",
    handler: "process_voice_input() detects bye keyword",
    example: "User: 'Bye PrintChakra' → Ends voice session",
  },
};

// =============================================================================
// FILLER SPEECH (Ignored by System)
// =============================================================================

export const FILLER_SPEECH = {
  ignoredPhrases: [
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
  description: "These phrases are filtered out to prevent accidental triggers",
  handler: "process_voice_input() returns auto_retry=True",
  example: "User: 'Thank you' → Ignored, continues listening",
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export interface AllCommands {
  print: CommandCategory;
  scan: CommandCategory;
  modeSwitch: CommandCategory;
  navigation: CommandCategory;
  documents: CommandCategory;
  configuration: CommandCategory;
  session: CommandCategory;
  fillerSpeech: typeof FILLER_SPEECH;
}

/**
 * Get all command categories
 */
export function getAllCommands(): AllCommands {
  return {
    print: PRINT_COMMANDS,
    scan: SCAN_COMMANDS,
    modeSwitch: MODE_SWITCH_COMMANDS,
    navigation: NAVIGATION_COMMANDS,
    documents: DOCUMENT_COMMANDS,
    configuration: CONFIG_COMMANDS,
    session: SESSION_COMMANDS,
    fillerSpeech: FILLER_SPEECH,
  };
}

/**
 * Get all example commands
 */
export function getCommandExamples(): string[] {
  const examples: string[] = [];
  const allCommands = getAllCommands();
  
  Object.values(allCommands).forEach(category => {
    if (typeof category === 'object') {
      Object.values(category).forEach((cmd: any) => {
        if (cmd.example) {
          examples.push(cmd.example);
        }
      });
    }
  });
  
  return examples;
}

/**
 * Search for commands matching a query
 */
export function searchCommand(query: string): Array<VoiceCommand & { category: string; command: string }> {
  const queryLower = query.toLowerCase();
  const results: Array<VoiceCommand & { category: string; command: string }> = [];
  const allCommands = getAllCommands();
  
  Object.entries(allCommands).forEach(([categoryName, category]) => {
    if (typeof category === 'object') {
      Object.entries(category).forEach(([cmdName, cmdData]: [string, any]) => {
        if (cmdData.phrases) {
          // Search in phrases
          const foundInPhrase = cmdData.phrases.some((phrase: string) => 
            phrase.toLowerCase().includes(queryLower)
          );
          
          if (foundInPhrase) {
            results.push({
              category: categoryName,
              command: cmdName,
              ...cmdData,
            });
            return;
          }
        }
        
        // Search in description
        if (cmdData.description && cmdData.description.toLowerCase().includes(queryLower)) {
          if (!results.some(r => r.command === cmdName)) {
            results.push({
              category: categoryName,
              command: cmdName,
              ...cmdData,
            });
          }
        }
      });
    }
  });
  
  return results;
}

/**
 * Check if text matches any filler speech pattern
 */
export function isFillerSpeech(text: string): boolean {
  const textLower = text.toLowerCase().trim().replace(/[.,!?]/g, '');
  return FILLER_SPEECH.ignoredPhrases.includes(textLower) || textLower.length < 3;
}

/**
 * Get formatted command help text
 */
export function getCommandHelp(): string {
  return `
📋 PrintChakra Voice Commands

🖨️ PRINT:
• "Print this document" - Open print config
• "Print 3 copies in color" - Print with settings
• "Print the last 2 documents" - Print recent files

📸 SCAN:
• "Scan a document" - Open scan config
• "Scan high quality as PDF" - Scan with settings

🔄 SWITCH MODES:
• "Switch to print configuration" - Change to print mode
• "Switch to scan configuration" - Change to scan mode

📄 DOCUMENTS:
• "List documents" - Show all files
• "Status" - Show current progress

⚙️ CONFIGURATION:
• "5 copies" - Change copies
• "Landscape" - Change orientation
• "Color mode" - Change to color
• "That's all" - Finish configuration

✅ CONFIRM/CANCEL:
• "Yes" / "Proceed" - Confirm action
• "No" / "Cancel" - Cancel action

🚪 EXIT:
• "Bye PrintChakra" - End voice session

💡 TIP: Just speak naturally - no wake words needed!
`.trim();
}

// Export default for convenience
export default {
  PRINT_COMMANDS,
  SCAN_COMMANDS,
  MODE_SWITCH_COMMANDS,
  NAVIGATION_COMMANDS,
  DOCUMENT_COMMANDS,
  CONFIG_COMMANDS,
  SESSION_COMMANDS,
  FILLER_SPEECH,
  getAllCommands,
  getCommandExamples,
  searchCommand,
  isFillerSpeech,
  getCommandHelp,
};
