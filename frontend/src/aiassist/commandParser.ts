/**
 * AI Assist Command Parser
 * Parses natural language input into structured commands
 * Integrates with state machine for validation
 */

import {
  ParsedCommand,
  CommandAction,
  CommandCategory,
  AppState,
  PrintWorkflowStep,
  ScanWorkflowStep,
  ScanDocumentSource,
} from './types';
import AIAssistConfig from './config';
import { 
  isCommandValidForState, 
  requiresSorryForSwitch,
  getModeSwitchRejectionMessage,
} from './stateManager';
import {
  parseDocumentSelectionCommand,
  DocumentSelectionCommand,
} from './documentSelectionParser';

const config = AIAssistConfig;

/**
 * Extract number from text (handles both numeric and word forms)
 */
export function extractNumber(text: string): number | null {
  // Check for word numbers first
  const lowerText = text.toLowerCase();
  for (const [word, num] of Object.entries(config.numberPatterns.wordNumbers)) {
    if (lowerText.includes(word)) {
      return num;
    }
  }
  
  // Then check for numeric digits
  const match = text.match(config.numberPatterns.cardinal);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  return null;
}

/**
 * Check if text contains any of the given keywords
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Find which keyword group matches and return its key
 */
function findMatchingKey(text: string, keywordGroups: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();
  for (const [key, keywords] of Object.entries(keywordGroups)) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

/**
 * Calculate confidence score based on keyword matches
 */
function calculateConfidence(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  let matchCount = 0;
  let totalKeywordLength = 0;
  
  for (const kw of keywords) {
    if (lowerText.includes(kw.toLowerCase())) {
      matchCount++;
      totalKeywordLength += kw.length;
    }
  }
  
  if (matchCount === 0) return 0;
  
  // Higher confidence for longer keyword matches
  const lengthScore = Math.min(totalKeywordLength / text.length, 1);
  const matchScore = Math.min(matchCount / 2, 1);
  
  return (lengthScore * 0.6 + matchScore * 0.4);
}

/**
 * Check if text contains the "sorry" keyword for mode switching
 */
function containsSorryKeyword(text: string): boolean {
  const sorryPatterns = [
    /\bsorry\b/i,
    /\bapologies\b/i,
    /\bexcuse me\b/i,
    /\bpardon\b/i,
  ];
  return sorryPatterns.some(pattern => pattern.test(text));
}

/**
 * Parse mode switching commands (print/scan with optional sorry)
 */
function parseModeCommand(text: string, currentState: AppState): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  const hasSorry = containsSorryKeyword(text);
  
  // Check for print mode
  const printKeywords = ['print', 'printing', 'open print', 'start print'];
  const isPrint = printKeywords.some(kw => lowerText.includes(kw));
  
  // Check for scan mode
  const scanKeywords = ['scan', 'scanning', 'open scan', 'start scan'];
  const isScan = scanKeywords.some(kw => lowerText.includes(kw));
  
  if (!isPrint && !isScan) {
    return null;
  }
  
  const targetMode = isPrint ? 'print' : 'scan';
  const needsSorry = requiresSorryForSwitch(currentState, targetMode);
  
  // If in dashboard, directly open mode
  if (currentState === 'DASHBOARD') {
    return {
      action: isPrint ? 'OPEN_PRINT_MODE' : 'OPEN_SCAN_MODE',
      category: 'workflow_action',
      params: { mode: targetMode },
      confidence: 0.95,
      originalText: text,
    };
  }
  
  // If switching modes, check for sorry keyword
  if (needsSorry) {
    return {
      action: 'REQUEST_MODE_SWITCH',
      category: 'workflow_action',
      params: { 
        targetMode, 
        hasSorry,
        needsSorry: true,
      },
      confidence: hasSorry ? 0.95 : 0.5,
      originalText: text,
      stateValidation: {
        valid: hasSorry,
        reason: hasSorry ? undefined : getModeSwitchRejectionMessage(currentState, targetMode),
      },
    };
  }
  
  return {
    action: isPrint ? 'OPEN_PRINT_MODE' : 'OPEN_SCAN_MODE',
    category: 'workflow_action',
    params: { mode: targetMode },
    confidence: 0.95,
    originalText: text,
  };
}

/**
 * Parse scan source selection commands
 */
function parseScanSourceCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  
  // Feed tray keywords
  const feedKeywords = ['feed', 'tray', 'feeder', 'automatic feed', 'document feeder', 'adf'];
  if (feedKeywords.some(kw => lowerText.includes(kw))) {
    return {
      action: 'SET_SCAN_SOURCE',
      category: 'workflow_action',
      params: { source: 'feed' },
      confidence: 0.9,
      originalText: text,
    };
  }
  
  // Select/upload keywords
  const selectKeywords = ['select document', 'upload', 'choose document', 'pick document', 'select file'];
  if (selectKeywords.some(kw => lowerText.includes(kw))) {
    return {
      action: 'SET_SCAN_SOURCE',
      category: 'workflow_action',
      params: { source: 'select' },
      confidence: 0.9,
      originalText: text,
    };
  }
  
  return null;
}

/**
 * Parse natural language document selection commands
 */
function parseNaturalDocumentSelection(text: string, totalDocuments: number = 20): ParsedCommand | null {
  const selectionCommand = parseDocumentSelectionCommand(text, totalDocuments);
  
  if (!selectionCommand) {
    return null;
  }
  
  let action: CommandAction;
  switch (selectionCommand.type) {
    case 'select':
    case 'select_all':
      action = 'SELECT_MULTIPLE_DOCUMENTS';
      break;
    case 'deselect':
      action = 'DESELECT_DOCUMENT';
      break;
    case 'clear':
      action = 'CLEAR_DOCUMENT_SELECTION';
      break;
    case 'toggle':
      action = 'SELECT_DOCUMENT';
      break;
    default:
      action = 'SELECT_DOCUMENT';
  }
  
  return {
    action,
    category: 'document_selection',
    params: {
      indices: selectionCommand.indices,
      isRange: selectionCommand.isRange,
      selectionType: selectionCommand.type,
    },
    confidence: selectionCommand.confidence,
    originalText: text,
  };
}

/**
 * Parse document selection commands
 */
function parseDocumentCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  
  // Check for section switch
  const sectionMatch = findMatchingKey(lowerText, config.documentCommands.switchSection);
  if (sectionMatch && containsKeyword(text, ['switch', 'show', 'go to', 'open'])) {
    return {
      action: 'SWITCH_SECTION',
      category: 'document_selection',
      params: { section: sectionMatch },
      confidence: 0.9,
      originalText: text
    };
  }
  
  // Check for next/previous navigation
  if (containsKeyword(text, config.documentCommands.navigation.next)) {
    return {
      action: 'NEXT_DOCUMENT',
      category: 'navigation',
      confidence: 0.85,
      originalText: text
    };
  }
  
  if (containsKeyword(text, config.documentCommands.navigation.previous)) {
    return {
      action: 'PREV_DOCUMENT',
      category: 'navigation',
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Check for document selection with number
  if (containsKeyword(text, config.documentCommands.select)) {
    const docNum = extractNumber(text);
    const section = findMatchingKey(lowerText, config.documentCommands.switchSection) || 'current';
    
    return {
      action: 'SELECT_DOCUMENT',
      category: 'document_selection',
      params: { 
        documentNumber: docNum,
        section: section 
      },
      confidence: docNum ? 0.9 : 0.7,
      originalText: text
    };
  }
  
  // Check for upload
  if (containsKeyword(text, config.documentCommands.upload)) {
    return {
      action: 'UPLOAD_DOCUMENT',
      category: 'document_selection',
      confidence: 0.85,
      originalText: text
    };
  }
  
  return null;
}

/**
 * Parse print settings commands
 */
function parsePrintSettingsCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  
  // Layout
  const layoutMatch = findMatchingKey(lowerText, config.printCommands.layout);
  if (layoutMatch) {
    return {
      action: 'SET_LAYOUT',
      category: 'settings_change',
      params: { layout: layoutMatch },
      confidence: calculateConfidence(text, config.printCommands.layout[layoutMatch as keyof typeof config.printCommands.layout]),
      originalText: text
    };
  }
  
  // Paper size
  const paperSizeMatch = findMatchingKey(lowerText, config.printCommands.paperSize);
  if (paperSizeMatch) {
    return {
      action: 'SET_PAPER_SIZE',
      category: 'settings_change',
      params: { paperSize: paperSizeMatch },
      confidence: 0.9,
      originalText: text
    };
  }
  
  // Color mode
  const colorModeMatch = findMatchingKey(lowerText, config.printCommands.colorMode);
  if (colorModeMatch) {
    return {
      action: 'SET_COLOR_MODE',
      category: 'settings_change',
      params: { colorMode: colorModeMatch },
      confidence: calculateConfidence(text, config.printCommands.colorMode[colorModeMatch as keyof typeof config.printCommands.colorMode]),
      originalText: text
    };
  }
  
  // Pages selection
  const pagesMatch = findMatchingKey(lowerText, config.printCommands.pages);
  if (pagesMatch) {
    let customRange = '';
    if (pagesMatch === 'custom') {
      // Try to extract page range like "1-5" or "1,3,5"
      const rangeMatch = text.match(/(\d+[-,\s]+\d+[\d,\s-]*)/);
      if (rangeMatch) {
        customRange = rangeMatch[1].replace(/\s+/g, '');
      }
    }
    return {
      action: 'SET_PAGES',
      category: 'settings_change',
      params: { pages: pagesMatch, customRange },
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Margins
  const marginsMatch = findMatchingKey(lowerText, config.printCommands.margins);
  if (marginsMatch) {
    return {
      action: 'SET_MARGINS',
      category: 'settings_change',
      params: { margins: marginsMatch },
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Quality
  const qualityMatch = findMatchingKey(lowerText, config.printCommands.quality);
  if (qualityMatch) {
    return {
      action: 'SET_QUALITY',
      category: 'settings_change',
      params: { quality: qualityMatch },
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Duplex
  if (containsKeyword(text, config.printCommands.duplex.enable)) {
    return {
      action: 'SET_DUPLEX',
      category: 'settings_change',
      params: { duplex: true },
      confidence: 0.85,
      originalText: text
    };
  }
  if (containsKeyword(text, config.printCommands.duplex.disable)) {
    return {
      action: 'SET_DUPLEX',
      category: 'settings_change',
      params: { duplex: false },
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Copies
  if (containsKeyword(text, config.printCommands.copies)) {
    const num = extractNumber(text);
    if (num) {
      return {
        action: 'SET_COPIES',
        category: 'settings_change',
        params: { copies: num },
        confidence: 0.9,
        originalText: text
      };
    }
  }
  
  // Scale
  if (containsKeyword(text, config.printCommands.scale)) {
    const num = extractNumber(text);
    if (num) {
      return {
        action: 'SET_SCALE',
        category: 'settings_change',
        params: { scale: num },
        confidence: 0.85,
        originalText: text
      };
    }
  }
  
  // Resolution/DPI
  if (containsKeyword(text, config.printCommands.resolution)) {
    const num = extractNumber(text);
    if (num) {
      return {
        action: 'SET_RESOLUTION',
        category: 'settings_change',
        params: { resolution: num },
        confidence: 0.9,
        originalText: text
      };
    }
  }
  
  // Pages per sheet
  if (containsKeyword(text, config.printCommands.pagesPerSheet)) {
    const num = extractNumber(text);
    return {
      action: 'SET_PAGES_PER_SHEET',
      category: 'settings_change',
      params: { pagesPerSheet: num || 1 },
      confidence: 0.85,
      originalText: text
    };
  }
  
  return null;
}

/**
 * Parse scan settings commands
 */
function parseScanSettingsCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  
  // Scan mode
  const modeMatch = findMatchingKey(lowerText, config.scanCommands.mode);
  if (modeMatch) {
    return {
      action: 'SET_PAGES', // Reuse for scan mode
      category: 'settings_change',
      params: { scanMode: modeMatch },
      confidence: 0.85,
      originalText: text
    };
  }
  
  // OCR/Text mode
  if (containsKeyword(text, config.scanCommands.textMode.enable)) {
    return {
      action: 'TOGGLE_TEXT_MODE',
      category: 'settings_change',
      params: { enabled: true },
      confidence: 0.9,
      originalText: text
    };
  }
  if (containsKeyword(text, config.scanCommands.textMode.disable)) {
    return {
      action: 'TOGGLE_TEXT_MODE',
      category: 'settings_change',
      params: { enabled: false },
      confidence: 0.9,
      originalText: text
    };
  }
  
  return null;
}

/**
 * Parse workflow commands (confirm, cancel, status, etc.)
 */
function parseWorkflowCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  
  // Confirm
  if (containsKeyword(text, config.workflowCommands.confirm)) {
    return {
      action: 'CONFIRM',
      category: 'confirmation',
      confidence: 0.95,
      originalText: text
    };
  }
  
  // Cancel
  if (containsKeyword(text, config.workflowCommands.cancel)) {
    return {
      action: 'CANCEL',
      category: 'workflow_action',
      confidence: 0.9,
      originalText: text
    };
  }
  
  // Status
  if (containsKeyword(text, config.workflowCommands.status)) {
    return {
      action: 'STATUS',
      category: 'system',
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Repeat settings
  if (containsKeyword(text, config.workflowCommands.repeatSettings)) {
    return {
      action: 'REPEAT_SETTINGS',
      category: 'system',
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Help
  if (containsKeyword(text, config.workflowCommands.help)) {
    return {
      action: 'HELP',
      category: 'system',
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Stop recording
  if (containsKeyword(text, config.workflowCommands.stopRecording)) {
    return {
      action: 'STOP_RECORDING',
      category: 'system',
      confidence: 0.9,
      originalText: text
    };
  }
  
  // Feed documents
  if (containsKeyword(text, config.workflowCommands.feedDocuments)) {
    const num = extractNumber(text);
    return {
      action: 'FEED_DOCUMENTS',
      category: 'workflow_action',
      params: { count: num || 1 },
      confidence: 0.9,
      originalText: text
    };
  }
  
  // Scroll
  if (containsKeyword(text, config.workflowCommands.scroll.down)) {
    return {
      action: 'SCROLL_DOWN',
      category: 'navigation',
      confidence: 0.85,
      originalText: text
    };
  }
  if (containsKeyword(text, config.workflowCommands.scroll.up)) {
    return {
      action: 'SCROLL_UP',
      category: 'navigation',
      confidence: 0.85,
      originalText: text
    };
  }
  
  // Apply/Continue
  if (lowerText.includes('apply') || lowerText.includes('continue') || lowerText.includes('submit')) {
    return {
      action: 'APPLY_SETTINGS',
      category: 'workflow_action',
      confidence: 0.8,
      originalText: text
    };
  }
  
  // Go back
  if (lowerText.includes('back') || lowerText.includes('previous step')) {
    return {
      action: 'GO_BACK',
      category: 'navigation',
      confidence: 0.8,
      originalText: text
    };
  }
  
  return null;
}

/**
 * Main parsing function - attempts to parse any voice command
 */
export function parseCommand(text: string): ParsedCommand | null {
  if (!text || text.trim().length === 0) {
    return null;
  }
  
  // Try each parser in order of specificity
  let result: ParsedCommand | null = null;
  
  // 1. Workflow commands (highest priority for confirm/cancel)
  result = parseWorkflowCommand(text);
  if (result && result.confidence >= config.thresholds.mediumConfidence) {
    return result;
  }
  
  // 2. Document selection commands
  const docResult = parseDocumentCommand(text);
  if (docResult && (!result || docResult.confidence > result.confidence)) {
    result = docResult;
  }
  
  // 3. Print settings commands
  const printResult = parsePrintSettingsCommand(text);
  if (printResult && (!result || printResult.confidence > result.confidence)) {
    result = printResult;
  }
  
  // 4. Scan settings commands
  const scanResult = parseScanSettingsCommand(text);
  if (scanResult && (!result || scanResult.confidence > result.confidence)) {
    result = scanResult;
  }
  
  return result;
}

/**
 * State-aware command parsing context
 */
export interface StateAwareParseContext {
  appState: AppState;
  printStep: PrintWorkflowStep | null;
  scanStep: ScanWorkflowStep | null;
  scanSource: ScanDocumentSource;
  totalDocuments: number;
}

/**
 * Parse command with full state awareness
 * This is the primary entry point for the state machine integration
 */
export function parseCommandWithState(
  text: string,
  context: StateAwareParseContext
): ParsedCommand | null {
  if (!text || text.trim().length === 0) {
    return null;
  }
  
  const { appState, printStep, scanStep, scanSource, totalDocuments } = context;
  let result: ParsedCommand | null = null;
  
  // 1. Check for mode switching commands first (highest priority)
  const modeCommand = parseModeCommand(text, appState);
  if (modeCommand && modeCommand.confidence >= config.thresholds.mediumConfidence) {
    return modeCommand;
  }
  
  // 2. Check for scan source selection (only in SCAN_WORKFLOW at SOURCE_SELECTION step)
  if (appState === 'SCAN_WORKFLOW' && scanStep === 'SOURCE_SELECTION') {
    const sourceCommand = parseScanSourceCommand(text);
    if (sourceCommand) {
      return sourceCommand;
    }
  }
  
  // 3. Check for natural language document selection
  // (only in SELECT_DOCUMENT steps)
  const isDocumentSelectionStep = 
    (appState === 'PRINT_WORKFLOW' && printStep === 'SELECT_DOCUMENT') ||
    (appState === 'SCAN_WORKFLOW' && scanStep === 'SELECT_DOCUMENT');
  
  if (isDocumentSelectionStep) {
    const naturalDocResult = parseNaturalDocumentSelection(text, totalDocuments);
    if (naturalDocResult && naturalDocResult.confidence >= 0.7) {
      return naturalDocResult;
    }
  }
  
  // 4. Workflow commands (confirm/cancel)
  const workflowResult = parseWorkflowCommand(text);
  if (workflowResult && workflowResult.confidence >= config.thresholds.mediumConfidence) {
    result = workflowResult;
  }
  
  // 5. Document selection commands (basic)
  const docResult = parseDocumentCommand(text);
  if (docResult && (!result || docResult.confidence > result.confidence)) {
    result = docResult;
  }
  
  // 6. Settings commands based on current workflow
  if (appState === 'PRINT_WORKFLOW') {
    const printResult = parsePrintSettingsCommand(text);
    if (printResult && (!result || printResult.confidence > result.confidence)) {
      result = printResult;
    }
  }
  
  if (appState === 'SCAN_WORKFLOW') {
    const scanResult = parseScanSettingsCommand(text);
    if (scanResult && (!result || scanResult.confidence > result.confidence)) {
      result = scanResult;
    }
  }
  
  // 7. Validate command against current state
  if (result) {
    const stateContext = {
      currentState: appState,
      printStep,
      scanStep,
      scanSource,
      selectedDocuments: [],
      isChatAccessible: true,
      lastModeSwitchAttempt: null,
      selectedDocumentIndices: [],
    };
    
    const validation = isCommandValidForState(stateContext, result.action);
    result.stateValidation = validation;
  }
  
  return result;
}

/**
 * Parse and validate command with context (legacy support)
 */
export function parseCommandWithContext(
  text: string, 
  mode: 'print' | 'scan' | null
): ParsedCommand | null {
  const command = parseCommand(text);
  
  if (!command) {
    return null;
  }
  
  // Boost confidence for mode-appropriate commands
  if (mode === 'print' && command.category === 'settings_change') {
    // Print-specific commands get a boost in print mode
    const printKeywords = ['print', 'copies', 'duplex', 'margins', 'pages per sheet'];
    if (printKeywords.some(kw => text.toLowerCase().includes(kw))) {
      command.confidence = Math.min(command.confidence + 0.1, 1.0);
    }
  }
  
  if (mode === 'scan' && command.category === 'settings_change') {
    // Scan-specific commands get a boost in scan mode
    const scanKeywords = ['scan', 'ocr', 'text mode', 'format'];
    if (scanKeywords.some(kw => text.toLowerCase().includes(kw))) {
      command.confidence = Math.min(command.confidence + 0.1, 1.0);
    }
  }
  
  return command;
}

export default {
  parseCommand,
  parseCommandWithContext,
  parseCommandWithState,
  extractNumber,
  containsSorryKeyword,
};
