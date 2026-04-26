import {
  ParsedCommand,
  CommandAction,
  AppState,
} from './types';
import AIAssistConfig from './config';
import {
  requiresSorryForSwitch,
  getModeSwitchRejectionMessage,
} from './stateManager';
import {
  parseDocumentSelectionCommand,
} from './documentSelectionParser';

const config = AIAssistConfig;

export function extractNumber(text: string): number | null {
  const lowerText = text.toLowerCase();
  for (const [word, num] of Object.entries(config.numberPatterns.wordNumbers)) {
    if (lowerText.includes(word)) {
      return num;
    }
  }

  const match = text.match(config.numberPatterns.cardinal);
  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

function findMatchingKey(text: string, keywordGroups: Record<string, string[]>): string | null {
  const lowerText = text.toLowerCase();
  for (const [key, keywords] of Object.entries(keywordGroups)) {
    if (keywords.some(kw => lowerText.includes(kw.toLowerCase()))) {
      return key;
    }
  }
  return null;
}

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

  const lengthScore = Math.min(totalKeywordLength / text.length, 1);
  const matchScore = Math.min(matchCount / 2, 1);

  return (lengthScore * 0.6 + matchScore * 0.4);
}

export function containsSorryKeyword(text: string): boolean {
  const sorryPatterns = [
    /\bsorry\b/i,
    /\bapologies\b/i,
    /\bexcuse me\b/i,
    /\bpardon\b/i,
  ];
  return sorryPatterns.some(pattern => pattern.test(text));
}

export function parseModeCommand(text: string, currentState: AppState): ParsedCommand | null {
  const lowerText = text.toLowerCase();
  const hasSorry = containsSorryKeyword(text);

  const printKeywords = ['print', 'printing', 'open print', 'start print'];
  const isPrint = printKeywords.some(kw => lowerText.includes(kw));

  const scanKeywords = ['scan', 'scanning', 'open scan', 'start scan'];
  const isScan = scanKeywords.some(kw => lowerText.includes(kw));

  if (!isPrint && !isScan) {
    return null;
  }

  const targetMode = isPrint ? 'print' : 'scan';
  const needsSorry = requiresSorryForSwitch(currentState, targetMode);

  if (currentState === 'DASHBOARD') {
    return {
      action: isPrint ? 'OPEN_PRINT_MODE' : 'OPEN_SCAN_MODE',
      category: 'workflow_action',
      params: { mode: targetMode },
      confidence: 0.95,
      originalText: text,
    };
  }

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

export function parseScanSourceCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();

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

export function parseNaturalDocumentSelection(text: string, totalDocuments: number = 20): ParsedCommand | null {
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

export function parseDocumentCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();

  const sectionMatch = findMatchingKey(lowerText, config.documentCommands.switchSection);
  if (sectionMatch && containsKeyword(text, ['switch', 'show', 'go to', 'open'])) {
    return {
      action: 'SWITCH_SECTION',
      category: 'document_selection',
      params: { section: sectionMatch },
      confidence: 0.9,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.documentCommands.navigation.next)) {
    return {
      action: 'NEXT_DOCUMENT',
      category: 'navigation',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.documentCommands.navigation.previous)) {
    return {
      action: 'PREV_DOCUMENT',
      category: 'navigation',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.documentCommands.select)) {
    const docNum = extractNumber(text);
    const section = findMatchingKey(lowerText, config.documentCommands.switchSection) || 'current';

    return {
      action: 'SELECT_DOCUMENT',
      category: 'document_selection',
      params: {
        documentNumber: docNum,
        section,
      },
      confidence: docNum ? 0.9 : 0.7,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.documentCommands.upload)) {
    return {
      action: 'UPLOAD_DOCUMENT',
      category: 'document_selection',
      confidence: 0.85,
      originalText: text,
    };
  }

  return null;
}

export function parseWorkflowCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();

  if (containsKeyword(text, config.workflowCommands.confirm)) {
    return {
      action: 'CONFIRM',
      category: 'confirmation',
      confidence: 0.95,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.cancel)) {
    return {
      action: 'CANCEL',
      category: 'workflow_action',
      confidence: 0.9,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.status)) {
    return {
      action: 'STATUS',
      category: 'system',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.repeatSettings)) {
    return {
      action: 'REPEAT_SETTINGS',
      category: 'system',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.help)) {
    return {
      action: 'HELP',
      category: 'system',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.stopRecording)) {
    return {
      action: 'STOP_RECORDING',
      category: 'system',
      confidence: 0.9,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.feedDocuments)) {
    const num = extractNumber(text);
    return {
      action: 'FEED_DOCUMENTS',
      category: 'workflow_action',
      params: { count: num || 1 },
      confidence: 0.9,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.scroll.down)) {
    return {
      action: 'SCROLL_DOWN',
      category: 'navigation',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.workflowCommands.scroll.up)) {
    return {
      action: 'SCROLL_UP',
      category: 'navigation',
      confidence: 0.85,
      originalText: text,
    };
  }

  if (lowerText.includes('apply') || lowerText.includes('continue') || lowerText.includes('submit')) {
    return {
      action: 'APPLY_SETTINGS',
      category: 'workflow_action',
      confidence: 0.8,
      originalText: text,
    };
  }

  if (lowerText.includes('back') || lowerText.includes('previous step')) {
    return {
      action: 'GO_BACK',
      category: 'navigation',
      confidence: 0.8,
      originalText: text,
    };
  }

  return null;
}

export { calculateConfidence, containsKeyword, findMatchingKey };
