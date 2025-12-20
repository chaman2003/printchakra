/**
 * Document Selection Parser
 * Parses natural language commands for document selection
 * 
 * Supports:
 * - "Select the first 2 documents"
 * - "Select document 1"
 * - "Select documents 1, 2, 3, 5, and 7"
 * - "Select the last 2 documents"
 * - "Select documents from 1 to 10"
 * - "Select documents between 3 and 8"
 * - "Select every second document"
 * - "Select all documents"
 * - "Select all documents except 1 and 2"
 * - "Select every document from 3 onward"
 * - "Deselect document 5"
 * - "Clear selection"
 */

export interface DocumentSelectionCommand {
  type: 'select' | 'deselect' | 'select_all' | 'clear' | 'toggle';
  indices: number[];           // 0-based indices to select/deselect
  isRange: boolean;            // Whether this was a range selection
  originalText: string;
  confidence: number;
}

// Word to number mappings
const WORD_NUMBERS: Record<string, number> = {
  'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
  'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
  'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
  'last': -1, // Special marker for last
};

// Keywords for selection actions
const SELECT_KEYWORDS = ['select', 'choose', 'pick', 'get', 'use', 'add', 'include'];
const DESELECT_KEYWORDS = ['deselect', 'unselect', 'remove', 'exclude', 'drop', 'uncheck'];
const CLEAR_KEYWORDS = ['clear', 'reset', 'none', 'nothing', 'remove all', 'deselect all', 'unselect all'];
const ALL_KEYWORDS = ['all', 'everything', 'every'];

/**
 * Extract all numbers from text (both numeric and word forms)
 */
function extractNumbers(text: string): number[] {
  const numbers: number[] = [];
  const lowerText = text.toLowerCase();
  
  // Extract word numbers first
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(lowerText)) {
      numbers.push(num);
    }
  }
  
  // Extract numeric digits
  const digitMatches = text.match(/\b\d+\b/g);
  if (digitMatches) {
    digitMatches.forEach(match => {
      const num = parseInt(match, 10);
      if (!numbers.includes(num)) {
        numbers.push(num);
      }
    });
  }
  
  return numbers.sort((a, b) => a - b);
}

/**
 * Check if text contains any of the given keywords
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Parse range expressions like "1 to 10", "between 3 and 8", "from 1 to 5"
 */
function parseRange(text: string): { start: number; end: number } | null {
  const lowerText = text.toLowerCase();
  
  // Pattern: "from X to Y", "X to Y", "between X and Y", "X through Y", "X - Y"
  const patterns = [
    /from\s+(\d+)\s+to\s+(\d+)/i,
    /(\d+)\s+to\s+(\d+)/i,
    /between\s+(\d+)\s+and\s+(\d+)/i,
    /(\d+)\s+through\s+(\d+)/i,
    /(\d+)\s*[-–]\s*(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = lowerText.match(pattern);
    if (match) {
      return {
        start: parseInt(match[1], 10),
        end: parseInt(match[2], 10),
      };
    }
  }
  
  return null;
}

/**
 * Parse "first N" or "last N" expressions
 */
function parseFirstLast(text: string, totalDocuments: number): number[] | null {
  const lowerText = text.toLowerCase();
  
  // Pattern: "first N documents", "first N", "the first N"
  const firstMatch = lowerText.match(/(?:the\s+)?first\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
  if (firstMatch) {
    let count = WORD_NUMBERS[firstMatch[1].toLowerCase()] ?? parseInt(firstMatch[1], 10);
    count = Math.min(count, totalDocuments);
    return Array.from({ length: count }, (_, i) => i);
  }
  
  // Pattern: "last N documents", "last N", "the last N"
  const lastMatch = lowerText.match(/(?:the\s+)?last\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
  if (lastMatch) {
    let count = WORD_NUMBERS[lastMatch[1].toLowerCase()] ?? parseInt(lastMatch[1], 10);
    count = Math.min(count, totalDocuments);
    const startIdx = totalDocuments - count;
    return Array.from({ length: count }, (_, i) => startIdx + i);
  }
  
  return null;
}

/**
 * Parse comma-separated or "and" separated list
 * "1, 2, 3, 5, and 7" -> [1, 2, 3, 5, 7]
 */
function parseList(text: string): number[] {
  const numbers: number[] = [];
  
  // Remove "documents" and similar words
  let cleanText = text.toLowerCase()
    .replace(/documents?/g, '')
    .replace(/files?/g, '')
    .replace(/items?/g, '')
    .replace(/numbers?/g, '');
  
  // Split by comma, "and", or spaces
  const parts = cleanText.split(/[,\s]+(?:and\s+)?/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    
    // Check for word number
    if (WORD_NUMBERS[trimmed] !== undefined) {
      numbers.push(WORD_NUMBERS[trimmed]);
      continue;
    }
    
    // Check for digit
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num > 0) {
      numbers.push(num);
    }
  }
  
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

/**
 * Main document selection parser
 * @param text - The natural language command
 * @param totalDocuments - Total number of documents available
 * @returns Parsed command or null if not a document selection command
 */
export function parseDocumentSelectionCommand(
  text: string,
  totalDocuments: number
): DocumentSelectionCommand | null {
  const lowerText = text.toLowerCase().trim();
  
  // Check for clear/reset commands
  if (containsKeyword(lowerText, CLEAR_KEYWORDS)) {
    return {
      type: 'clear',
      indices: [],
      isRange: false,
      originalText: text,
      confidence: 0.95,
    };
  }
  
  // Check for deselect commands
  const isDeselect = containsKeyword(lowerText, DESELECT_KEYWORDS);
  
  // Check for select commands
  const isSelect = containsKeyword(lowerText, SELECT_KEYWORDS) || 
                   lowerText.includes('document') ||
                   lowerText.includes('file');
  
  if (!isSelect && !isDeselect) {
    return null; // Not a document selection command
  }
  
  const type = isDeselect ? 'deselect' : 'select';
  
  // Check for "select all"
  if (type === 'select' && containsKeyword(lowerText, ALL_KEYWORDS)) {
    // Check for exceptions: "all documents except 1 and 2"
    const exceptMatch = lowerText.match(/all\s+documents\s+except\s+(.+?)(?:\.|$)/i);
    if (exceptMatch) {
      const exceptStr = exceptMatch[1];
      const allIndices = Array.from({ length: totalDocuments }, (_, i) => i);
      const exceptNumbers = parseList(exceptStr);
      const exceptIndices = exceptNumbers
        .map(n => n - 1)
        .filter(i => i >= 0 && i < totalDocuments);
      
      const indices = allIndices.filter(i => !exceptIndices.includes(i));
      return {
        type: 'select',
        indices,
        isRange: false,
        originalText: text,
        confidence: 0.95,
      };
    }

    return {
      type: 'select_all',
      indices: Array.from({ length: totalDocuments }, (_, i) => i),
      isRange: false,
      originalText: text,
      confidence: 0.95,
    };
  }

  // Parse "every second/third/Nth document"
  const everyNMatch = lowerText.match(/every\s+(?:second|2nd|third|3rd|(\d+)(?:st|nd|rd|th)?)\s+document/i);
  if (everyNMatch) {
    let step = 2; // default every second
    if (everyNMatch[1]) {
      step = parseInt(everyNMatch[1], 10);
    } else if (lowerText.includes('third') || lowerText.includes('3rd')) {
      step = 3;
    }

    // Check for range: "every second document from 1 to 10"
    const rangeMatch = lowerText.match(/from\s+(\d+)\s+to\s+(\d+)/i);
    let startIdx = 0;
    let endIdx = totalDocuments - 1;
    if (rangeMatch) {
      startIdx = Math.max(0, parseInt(rangeMatch[1], 10) - 1);
      endIdx = Math.min(totalDocuments - 1, parseInt(rangeMatch[2], 10) - 1);
    }

    const indices: number[] = [];
    for (let i = startIdx; i <= endIdx; i += step) {
      indices.push(i);
    }

    if (indices.length > 0) {
      return {
        type: 'select',
        indices,
        isRange: false,
        originalText: text,
        confidence: 0.9,
      };
    }
  }

  // Parse "every document from N onward"
  const everyFromMatch = lowerText.match(/every\s+document\s+from\s+(\d+)\s+onward/i);
  if (everyFromMatch) {
    const startNum = parseInt(everyFromMatch[1], 10);
    const startIdx = Math.max(0, startNum - 1);
    const indices: number[] = [];
    for (let i = startIdx; i < totalDocuments; i++) {
      indices.push(i);
    }
    if (indices.length > 0) {
      return {
        type: 'select',
        indices,
        isRange: false,
        originalText: text,
        confidence: 0.9,
      };
    }
  }

  // Try to parse "first N" or "last N"
  const firstLastIndices = parseFirstLast(text, totalDocuments);
  if (firstLastIndices && firstLastIndices.length > 0) {
    return {
      type,
      indices: firstLastIndices,
      isRange: false,
      originalText: text,
      confidence: 0.9,
    };
  }

  // Try to parse range
  const range = parseRange(text);
  if (range) {
    const start = Math.max(0, range.start - 1); // Convert to 0-based
    const end = Math.min(totalDocuments - 1, range.end - 1);
    const indices: number[] = [];
    for (let i = start; i <= end; i++) {
      indices.push(i);
    }
    return {
      type,
      indices,
      isRange: true,
      originalText: text,
      confidence: 0.9,
    };
  }

  // Try to parse comma/and separated list
  const listNumbers = parseList(text);
  if (listNumbers.length > 0) {
    // Convert from 1-based (user input) to 0-based indices
    const indices = listNumbers
      .map(n => n - 1)
      .filter(i => i >= 0 && i < totalDocuments);
    
    if (indices.length > 0) {
      return {
        type,
        indices,
        isRange: false,
        originalText: text,
        confidence: 0.85,
      };
    }
  }

  // Try to extract any single number
  const numbers = extractNumbers(text);
  if (numbers.length > 0) {
    const indices = numbers
      .filter(n => n > 0) // Exclude negative markers
      .map(n => n - 1)    // Convert to 0-based
      .filter(i => i >= 0 && i < totalDocuments);
    
    if (indices.length > 0) {
      return {
        type,
        indices,
        isRange: false,
        originalText: text,
        confidence: 0.8,
      };
    }
  }

  // If we got here with select/deselect keywords but no numbers,
  // it might be "select the document" meaning current focus
  if (isSelect || isDeselect) {
    return {
      type: type === 'deselect' ? 'deselect' : 'toggle',
      indices: [], // Empty means toggle current selection
      isRange: false,
      originalText: text,
      confidence: 0.6,
    };
  }

  return null;
}

/**
 * Apply document selection command to current selection
 */
export function applyDocumentSelection(
  currentSelection: number[],
  command: DocumentSelectionCommand,
  totalDocuments: number
): number[] {
  switch (command.type) {
    case 'select':
      // Add to selection
      const combined = currentSelection.concat(command.indices);
      return Array.from(new Set(combined)).sort((a, b) => a - b);
      
    case 'deselect':
      // Remove from selection
      return currentSelection.filter(i => !command.indices.includes(i));
      
    case 'select_all':
      // Select all documents
      return Array.from({ length: totalDocuments }, (_, i) => i);
      
    case 'clear':
      // Clear all selection
      return [];
      
    case 'toggle':
      // Toggle the specified indices
      if (command.indices.length === 0) {
        // If no indices, do nothing
        return currentSelection;
      }
      const result = [...currentSelection];
      for (const idx of command.indices) {
        const existingIdx = result.indexOf(idx);
        if (existingIdx >= 0) {
          result.splice(existingIdx, 1);
        } else {
          result.push(idx);
        }
      }
      return result.sort((a, b) => a - b);
      
    default:
      return currentSelection;
  }
}

/**
 * Generate human-readable description of selection action
 */
export function describeSelectionAction(command: DocumentSelectionCommand): string {
  const { type, indices, isRange } = command;
  
  switch (type) {
    case 'select_all':
      return 'Selected all documents.';
      
    case 'clear':
      return 'Cleared document selection.';
      
    case 'select': {
      if (indices.length === 0) return 'No documents to select.';
      if (indices.length === 1) return `Selected document ${indices[0] + 1}.`;
      if (isRange) {
        return `Selected documents ${indices[0] + 1} to ${indices[indices.length - 1] + 1}.`;
      }
      const nums = indices.map(i => i + 1).join(', ');
      return `Selected documents ${nums}.`;
    }
      
    case 'deselect': {
      if (indices.length === 0) return 'No documents to deselect.';
      if (indices.length === 1) return `Deselected document ${indices[0] + 1}.`;
      const nums = indices.map(i => i + 1).join(', ');
      return `Deselected documents ${nums}.`;
    }
      
    case 'toggle': {
      if (indices.length === 0) return 'Toggling current document.';
      return `Toggled document ${indices[0] + 1}.`;
    }
      
    default:
      return 'Document selection updated.';
  }
}

export default {
  parseDocumentSelectionCommand,
  applyDocumentSelection,
  describeSelectionAction,
};
