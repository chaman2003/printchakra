/**
 * AI Assist Command Parser
 * Parses natural language input into structured commands
 * Integrates with state machine for validation
 */

import {
  ParsedCommand,
  AppState,
  PrintWorkflowStep,
  ScanWorkflowStep,
  ScanDocumentSource,
} from './types';
import AIAssistConfig from './config';
import {
  isCommandValidForState,
} from './stateManager';
import {
  extractNumber,
  containsSorryKeyword,
  parseModeCommand,
  parseScanSourceCommand,
  parseNaturalDocumentSelection,
  parseDocumentCommand,
  parseWorkflowCommand,
} from './commandParserUtils';
import {
  parsePrintSettingsCommand,
  parseScanSettingsCommand,
} from './commandParserSettings';

const config = AIAssistConfig;

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
