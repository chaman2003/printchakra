/**
 * Voice Document Selection Parser
 * Parses advanced voice commands for document selection with patterns like:
 * - "Select the first 2 documents"
 * - "Select documents 2 to 5"
 * - "Select documents 5, 6, 7, 8, and 10"
 * - "Select documents 1 to 3 and 7"
 * - "Select all documents except 1 and 2"
 * - etc.
 */

export interface SelectionResult {
  indices: number[]; // 0-based indices
  description: string;
}

/**
 * Parse a voice selection command and return 0-based indices
 * @param input - The voice command text (e.g., "Select documents 2 to 5")
 * @param totalDocuments - Total number of documents available
 * @returns SelectionResult with indices and description
 */
export function parseVoiceDocumentSelection(
  input: string,
  totalDocuments: number
): SelectionResult | null {
  if (!input || totalDocuments <= 0) {
    return null;
  }

  const text = input.toLowerCase().trim();
  const indices = new Set<number>();

  // Pattern 1: "the first N documents" or "first N documents"
  const firstNMatch = text.match(/(?:the\s+)?first\s+(\d+)\s+documents?/i);
  if (firstNMatch) {
    const count = Math.min(parseInt(firstNMatch[1], 10), totalDocuments);
    for (let i = 0; i < count; i++) {
      indices.add(i);
    }
    return {
      indices: Array.from(indices).sort((a, b) => a - b),
      description: `First ${count} document(s)`,
    };
  }

  // Pattern 2: "the last N documents" or "last N documents"
  const lastNMatch = text.match(/(?:the\s+)?last\s+(\d+)\s+documents?/i);
  if (lastNMatch) {
    const count = Math.min(parseInt(lastNMatch[1], 10), totalDocuments);
    const startIdx = totalDocuments - count;
    for (let i = startIdx; i < totalDocuments; i++) {
      indices.add(i);
    }
    return {
      indices: Array.from(indices).sort((a, b) => a - b),
      description: `Last ${count} document(s)`,
    };
  }

  // Pattern 3: "all documents" (with optional exceptions)
  if (text.match(/all\s+documents/i)) {
    for (let i = 0; i < totalDocuments; i++) {
      indices.add(i);
    }

    // Check for exceptions: "all documents except 1 and 2"
    const exceptMatch = text.match(/all\s+documents\s+except\s+(.+?)(?:\.|$)/i);
    if (exceptMatch) {
      const exceptStr = exceptMatch[1];
      const exceptIndices = parseNumberList(exceptStr, totalDocuments);
      exceptIndices.forEach(idx => indices.delete(idx - 1)); // Convert to 0-based and remove
      const exceptNums = exceptIndices.join(', ');
      return {
        indices: Array.from(indices).sort((a, b) => a - b),
        description: `All documents except ${exceptNums}`,
      };
    }

    return {
      indices: Array.from(indices).sort((a, b) => a - b),
      description: 'All documents',
    };
  }

  // Pattern 4: "every second/third/etc document from N to M"
  const everyNMatch = text.match(/every\s+(?:second|2nd|third|3rd|(\d+)(?:st|nd|rd|th)?)\s+document(?:\s+from\s+(\d+)\s+to\s+(\d+))?/i);
  if (everyNMatch) {
    let step = 2; // default every second
    if (everyNMatch[1]) {
      step = parseInt(everyNMatch[1], 10);
    } else if (text.includes('third') || text.includes('3rd')) {
      step = 3;
    }

    let startIdx = 0;
    let endIdx = totalDocuments - 1;

    if (everyNMatch[2] && everyNMatch[3]) {
      startIdx = Math.max(0, parseInt(everyNMatch[2], 10) - 1);
      endIdx = Math.min(totalDocuments - 1, parseInt(everyNMatch[3], 10) - 1);
    }

    for (let i = startIdx; i <= endIdx; i += step) {
      indices.add(i);
    }

    return {
      indices: Array.from(indices).sort((a, b) => a - b),
      description: `Every ${step}${step === 2 ? 'nd' : step === 3 ? 'rd' : 'th'} document`,
    };
  }

  // Pattern 5: "every document from N onward"
  const everyFromMatch = text.match(/every\s+document\s+from\s+(\d+)\s+onward/i);
  if (everyFromMatch) {
    const startNum = parseInt(everyFromMatch[1], 10);
    const startIdx = Math.max(0, startNum - 1);
    for (let i = startIdx; i < totalDocuments; i++) {
      indices.add(i);
    }
    return {
      indices: Array.from(indices).sort((a, b) => a - b),
      description: `Documents from ${startNum} onward`,
    };
  }

  // Pattern 6: Complex patterns with ranges and lists
  // "Select documents 1 to 3 and 7" or "Select documents 5 to 8, and 10"
  // or "Select documents 2, 4 to 6, and 9"
  // or "Select document numbers 4 and 12"
  let complexMatch = text.match(
    /(?:select\s+)?documents?\s+(.+?)(?:\.|$)/i
  );
  
  // If the above doesn't match, try "document numbers X and Y" pattern
  if (!complexMatch) {
    complexMatch = text.match(
      /(?:select\s+)?document\s+numbers?\s+(.+?)(?:\.|$)/i
    );
  }
  
  if (complexMatch) {
    const selectionStr = complexMatch[1];
    const result = parseComplexSelection(selectionStr, totalDocuments);
    if (result && result.length > 0) {
      const uniqueIndices = Array.from(new Set(result)).sort((a, b) => a - b);
      return {
        indices: uniqueIndices,
        description: `Document(s) ${uniqueIndices.map(i => i + 1).join(', ')}`,
      };
    }
  }

  return null;
}

/**
 * Parse a complex selection string like "1 to 3 and 7" or "5, 6, 7, 8, and 10"
 * or "from 5 to 20" or "between 2 and 10" or "numbers 4 and 12"
 * Returns 0-based indices
 */
function parseComplexSelection(
  selectionStr: string,
  totalDocuments: number
): number[] {
  const indices: number[] = [];
  
  // Remove common leading words like "numbers", "numbers are", etc.
  let cleanStr = selectionStr.replace(/^(?:numbers?|the\s+)?/i, '').trim();
  
  // First check for "from X to Y" pattern
  const fromToMatch = cleanStr.match(/from\s+(\d+)\s+to\s+(\d+)/i);
  if (fromToMatch) {
    const start = parseInt(fromToMatch[1], 10);
    const end = parseInt(fromToMatch[2], 10);
    const min = Math.max(1, Math.min(start, end));
    const max = Math.min(totalDocuments, Math.max(start, end));
    for (let i = min; i <= max; i++) {
      indices.push(i - 1);
    }
    return indices;
  }
  
  // Check for "between X and Y" pattern
  const betweenMatch = cleanStr.match(/between\s+(\d+)\s+and\s+(\d+)/i);
  if (betweenMatch) {
    const start = parseInt(betweenMatch[1], 10);
    const end = parseInt(betweenMatch[2], 10);
    const min = Math.max(1, Math.min(start, end));
    const max = Math.min(totalDocuments, Math.max(start, end));
    for (let i = min; i <= max; i++) {
      indices.push(i - 1);
    }
    return indices;
  }

  // Normalize: replace "and" with commas, handle "to" as range
  let normalized = cleanStr
    .replace(/\s+and\s+/gi, ',')
    .replace(/\s+to\s+/gi, '..');

  // Split by commas
  const parts = normalized.split(',').map(p => p.trim());

  for (const part of parts) {
    if (part.includes('..')) {
      // Range like "1..3" or "5..8"
      const [startStr, endStr] = part.split('..');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);

      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalDocuments, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          indices.push(i - 1); // Convert to 0-based
        }
      }
    } else {
      // Single number (extract just the number from the string)
      const numMatch = part.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num >= 1 && num <= totalDocuments) {
          indices.push(num - 1); // Convert to 0-based
        }
      }
    }
  }

  return indices;
}

/**
 * Parse a simple number list like "1 and 2" or "4 and 12"
 * Returns 1-based numbers (as spoken)
 */
function parseNumberList(str: string, totalDocuments: number): number[] {
  const numbers: number[] = [];
  const normalized = str.replace(/\s+and\s+/gi, ',');
  const parts = normalized.split(',').map(p => p.trim());

  for (const part of parts) {
    const num = parseInt(part, 10);
    if (!isNaN(num) && num >= 1 && num <= totalDocuments) {
      numbers.push(num);
    }
  }

  return numbers;
}
