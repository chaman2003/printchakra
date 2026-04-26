import { ParsedCommand } from './types';
import AIAssistConfig from './config';
import {
  extractNumber,
  containsKeyword,
  findMatchingKey,
  calculateConfidence,
} from './commandParserUtils';

const config = AIAssistConfig;

export function parsePrintSettingsCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();

  const layoutMatch = findMatchingKey(lowerText, config.printCommands.layout);
  if (layoutMatch) {
    return {
      action: 'SET_LAYOUT',
      category: 'settings_change',
      params: { layout: layoutMatch },
      confidence: calculateConfidence(text, config.printCommands.layout[layoutMatch as keyof typeof config.printCommands.layout]),
      originalText: text,
    };
  }

  const paperSizeMatch = findMatchingKey(lowerText, config.printCommands.paperSize);
  if (paperSizeMatch) {
    return {
      action: 'SET_PAPER_SIZE',
      category: 'settings_change',
      params: { paperSize: paperSizeMatch },
      confidence: 0.9,
      originalText: text,
    };
  }

  const colorModeMatch = findMatchingKey(lowerText, config.printCommands.colorMode);
  if (colorModeMatch) {
    return {
      action: 'SET_COLOR_MODE',
      category: 'settings_change',
      params: { colorMode: colorModeMatch },
      confidence: calculateConfidence(text, config.printCommands.colorMode[colorModeMatch as keyof typeof config.printCommands.colorMode]),
      originalText: text,
    };
  }

  const pagesMatch = findMatchingKey(lowerText, config.printCommands.pages);
  if (pagesMatch) {
    let customRange = '';
    if (pagesMatch === 'custom') {
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
      originalText: text,
    };
  }

  const marginsMatch = findMatchingKey(lowerText, config.printCommands.margins);
  if (marginsMatch) {
    return {
      action: 'SET_MARGINS',
      category: 'settings_change',
      params: { margins: marginsMatch },
      confidence: 0.85,
      originalText: text,
    };
  }

  const qualityMatch = findMatchingKey(lowerText, config.printCommands.quality);
  if (qualityMatch) {
    return {
      action: 'SET_QUALITY',
      category: 'settings_change',
      params: { quality: qualityMatch },
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.printCommands.duplex.enable)) {
    return {
      action: 'SET_DUPLEX',
      category: 'settings_change',
      params: { duplex: true },
      confidence: 0.85,
      originalText: text,
    };
  }
  if (containsKeyword(text, config.printCommands.duplex.disable)) {
    return {
      action: 'SET_DUPLEX',
      category: 'settings_change',
      params: { duplex: false },
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.printCommands.copies)) {
    const num = extractNumber(text);
    if (num) {
      return {
        action: 'SET_COPIES',
        category: 'settings_change',
        params: { copies: num },
        confidence: 0.9,
        originalText: text,
      };
    }
  }

  if (containsKeyword(text, config.printCommands.scale)) {
    const num = extractNumber(text);
    if (num) {
      return {
        action: 'SET_SCALE',
        category: 'settings_change',
        params: { scale: num },
        confidence: 0.85,
        originalText: text,
      };
    }
  }

  if (containsKeyword(text, config.printCommands.resolution)) {
    const num = extractNumber(text);
    if (num) {
      return {
        action: 'SET_RESOLUTION',
        category: 'settings_change',
        params: { resolution: num },
        confidence: 0.9,
        originalText: text,
      };
    }
  }

  if (containsKeyword(text, config.printCommands.pagesPerSheet)) {
    const num = extractNumber(text);
    return {
      action: 'SET_PAGES_PER_SHEET',
      category: 'settings_change',
      params: { pagesPerSheet: num || 1 },
      confidence: 0.85,
      originalText: text,
    };
  }

  return null;
}

export function parseScanSettingsCommand(text: string): ParsedCommand | null {
  const lowerText = text.toLowerCase();

  const formatMatch = findMatchingKey(lowerText, config.scanCommands.format);
  if (formatMatch) {
    return {
      action: 'SET_FORMAT',
      category: 'settings_change',
      params: { format: formatMatch },
      confidence: 0.9,
      originalText: text,
    };
  }

  const resolutionMatch = findMatchingKey(lowerText, config.scanCommands.resolution);
  if (resolutionMatch) {
    const dpiValues: Record<string, string> = {
      low: '150',
      medium: '300',
      high: '600',
      ultra: '1200',
    };
    return {
      action: 'SET_RESOLUTION',
      category: 'settings_change',
      params: { resolution: dpiValues[resolutionMatch] || '300' },
      confidence: 0.9,
      originalText: text,
    };
  }

  const colorModeMatch = findMatchingKey(lowerText, config.printCommands.colorMode);
  if (colorModeMatch) {
    return {
      action: 'SET_COLOR_MODE',
      category: 'settings_change',
      params: { colorMode: colorModeMatch },
      confidence: 0.85,
      originalText: text,
    };
  }

  const modeMatch = findMatchingKey(lowerText, config.scanCommands.mode);
  if (modeMatch) {
    return {
      action: 'SET_SCAN_MODE',
      category: 'settings_change',
      params: { scanMode: modeMatch },
      confidence: 0.85,
      originalText: text,
    };
  }

  if (containsKeyword(text, config.scanCommands.textMode.enable)) {
    return {
      action: 'TOGGLE_TEXT_MODE',
      category: 'settings_change',
      params: { enabled: true },
      confidence: 0.9,
      originalText: text,
    };
  }
  if (containsKeyword(text, config.scanCommands.textMode.disable)) {
    return {
      action: 'TOGGLE_TEXT_MODE',
      category: 'settings_change',
      params: { enabled: false },
      confidence: 0.9,
      originalText: text,
    };
  }

  return null;
}
