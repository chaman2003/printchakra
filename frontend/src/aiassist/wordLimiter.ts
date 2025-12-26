/**
 * Word Limiter Utility
 * Enforces a maximum word count on AI responses for concise voice output
 */

const MAX_WORDS = 20;

/**
 * Enforce a maximum word limit on text
 * @param text - The text to limit
 * @param context - Optional context for logging (e.g., action name)
 * @returns Text truncated to MAX_WORDS if needed
 */
export function enforceWordLimit(text: string, context?: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const words = text.trim().split(/\s+/);
  
  if (words.length <= MAX_WORDS) {
    return text;
  }

  // Truncate to MAX_WORDS
  const truncated = words.slice(0, MAX_WORDS).join(' ');
  
  // Log truncation in development
  if (process.env.NODE_ENV === 'development' && context) {
    console.log(`[wordLimiter] ${context}: Truncated from ${words.length} to ${MAX_WORDS} words`);
  }

  // Add ellipsis if truncated mid-sentence
  if (!truncated.endsWith('.') && !truncated.endsWith('!') && !truncated.endsWith('?')) {
    return truncated + '...';
  }

  return truncated;
}

/**
 * Check if text exceeds word limit
 * @param text - The text to check
 * @returns true if text exceeds MAX_WORDS
 */
export function exceedsWordLimit(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }
  return text.trim().split(/\s+/).length > MAX_WORDS;
}

/**
 * Get word count of text
 * @param text - The text to count
 * @returns Number of words in text
 */
export function getWordCount(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export default enforceWordLimit;
