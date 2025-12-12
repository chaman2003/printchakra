/**
 * AI Assist Settings Handler
 * Manages print/scan settings modifications through voice commands
 */

import {
  PrintSettings,
  ScanSettings,
  ParsedCommand,
  AIResponse,
  WorkflowContext,
} from './types';
import AIAssistConfig from './config';

const responses = AIAssistConfig.responses;

/**
 * Default print settings
 */
export const defaultPrintSettings: PrintSettings = {
  pages: 'all',
  customRange: '',
  layout: 'portrait',
  paperSize: 'A4',
  resolution: '300',
  colorMode: 'color',
  scale: '100',
  margins: 'default',
  marginsCustom: '',
  pagesPerSheet: '1',
  pagesPerSheetCustom: '',
  copies: '1',
  duplex: false,
  quality: 'normal',
  selectedFiles: [],
  convertedFiles: [],
};

/**
 * Default scan settings
 */
export const defaultScanSettings: ScanSettings = {
  mode: 'single',
  textMode: false,
  pageMode: 'all',
  customRange: '',
  layout: 'portrait',
  paperSize: 'A4',
  paperSizeCustom: '',
  resolution: '300',
  resolutionCustom: '',
  colorMode: 'color',
  format: 'pdf',
  quality: 'normal',
};

/**
 * Apply setting change from parsed command
 */
export function applySettingChange(
  command: ParsedCommand,
  currentSettings: Partial<PrintSettings & ScanSettings>,
  mode: 'print' | 'scan'
): { settings: Partial<PrintSettings & ScanSettings>; response: AIResponse } {
  const settings = { ...currentSettings };
  let responseText = '';
  let feedbackType: 'success' | 'info' | 'warning' | 'error' = 'success';

  switch (command.action) {
    case 'SET_LAYOUT': {
      const layout = command.params?.layout as 'portrait' | 'landscape';
      if (mode === 'print') {
        (settings as PrintSettings).layout = layout;
      } else {
        (settings as ScanSettings).layout = layout;
      }
      responseText = responses.settingChanged('Layout', layout);
      break;
    }

    case 'SET_PAPER_SIZE': {
      const paperSize = command.params?.paperSize as string;
      if (mode === 'print') {
        (settings as PrintSettings).paperSize = paperSize;
      } else {
        (settings as ScanSettings).paperSize = paperSize;
      }
      responseText = responses.settingChanged('Paper size', paperSize);
      break;
    }

    case 'SET_COLOR_MODE': {
      const colorMode = command.params?.colorMode as 'color' | 'grayscale' | 'bw';
      if (mode === 'print') {
        (settings as PrintSettings).colorMode = colorMode;
      } else {
        (settings as ScanSettings).colorMode = colorMode;
      }
      const displayMode = colorMode === 'bw' ? 'Black & White' : colorMode;
      responseText = responses.settingChanged('Color mode', displayMode);
      break;
    }

    case 'SET_RESOLUTION': {
      const resolution = String(command.params?.resolution);
      if (mode === 'print') {
        (settings as PrintSettings).resolution = resolution;
      } else {
        (settings as ScanSettings).resolution = resolution;
      }
      responseText = responses.settingChanged('Resolution', `${resolution} DPI`);
      break;
    }

    case 'SET_PAGES': {
      const pages = command.params?.pages as 'all' | 'odd' | 'even' | 'custom';
      const customRange = command.params?.customRange || '';
      if (mode === 'print') {
        (settings as PrintSettings).pages = pages;
        (settings as PrintSettings).customRange = customRange;
      } else {
        (settings as ScanSettings).pageMode = pages;
        (settings as ScanSettings).customRange = customRange;
      }
      const displayValue = pages === 'custom' && customRange 
        ? `Custom (${customRange})`
        : pages === 'all' ? 'All pages' 
        : pages === 'odd' ? 'Odd pages only'
        : 'Even pages only';
      responseText = responses.settingChanged('Page selection', displayValue);
      break;
    }

    case 'SET_COPIES': {
      const copies = String(command.params?.copies || 1);
      (settings as PrintSettings).copies = copies;
      responseText = responses.settingChanged('Copies', copies);
      break;
    }

    case 'SET_DUPLEX': {
      const duplex = command.params?.duplex as boolean;
      (settings as PrintSettings).duplex = duplex;
      responseText = responses.settingChanged('Double-sided', duplex ? 'enabled' : 'disabled');
      break;
    }

    case 'SET_MARGINS': {
      const margins = command.params?.margins as 'default' | 'narrow' | 'none';
      (settings as PrintSettings).margins = margins;
      const displayMargin = margins === 'default' ? 'Default (1")' 
        : margins === 'narrow' ? 'Narrow' 
        : 'None (borderless)';
      responseText = responses.settingChanged('Margins', displayMargin);
      break;
    }

    case 'SET_SCALE': {
      const scale = String(command.params?.scale || 100);
      (settings as PrintSettings).scale = scale;
      responseText = responses.settingChanged('Scale', `${scale}%`);
      break;
    }

    case 'SET_PAGES_PER_SHEET': {
      const pps = String(command.params?.pagesPerSheet || 1);
      (settings as PrintSettings).pagesPerSheet = pps;
      responseText = responses.settingChanged('Pages per sheet', pps);
      break;
    }

    case 'SET_QUALITY': {
      const quality = command.params?.quality as 'draft' | 'normal' | 'high' | 'professional';
      if (mode === 'print') {
        (settings as PrintSettings).quality = quality;
      } else {
        (settings as ScanSettings).quality = quality;
      }
      responseText = responses.settingChanged('Quality', quality);
      break;
    }

    case 'TOGGLE_TEXT_MODE': {
      const enabled = command.params?.enabled as boolean;
      (settings as ScanSettings).textMode = enabled;
      responseText = responses.settingChanged('OCR/Text mode', enabled ? 'enabled' : 'disabled');
      break;
    }

    case 'TOGGLE_OCR': {
      const enabled = command.params?.enabled as boolean;
      (settings as ScanSettings).textMode = enabled;
      responseText = responses.settingChanged('OCR', enabled ? 'enabled' : 'disabled');
      break;
    }

    default:
      responseText = 'Setting not recognized';
      feedbackType = 'warning';
  }

  return {
    settings,
    response: {
      text: responseText,
      action: command.action,
      params: command.params,
      shouldSpeak: true,
      feedbackType,
    },
  };
}

/**
 * Get current settings summary for voice readout
 */
export function getSettingsSummary(
  settings: Partial<PrintSettings & ScanSettings>,
  mode: 'print' | 'scan'
): string {
  if (mode === 'print') {
    const printSettings = settings as PrintSettings;
    const parts: string[] = [];
    
    if (printSettings.layout) parts.push(`Layout: ${printSettings.layout}`);
    if (printSettings.paperSize) parts.push(`Paper: ${printSettings.paperSize}`);
    if (printSettings.colorMode) parts.push(`Color: ${printSettings.colorMode}`);
    if (printSettings.copies && printSettings.copies !== '1') {
      parts.push(`Copies: ${printSettings.copies}`);
    }
    if (printSettings.duplex) parts.push('Double-sided: on');
    if (printSettings.scale && printSettings.scale !== '100') {
      parts.push(`Scale: ${printSettings.scale}%`);
    }
    if (printSettings.margins && printSettings.margins !== 'default') {
      parts.push(`Margins: ${printSettings.margins}`);
    }
    if (printSettings.pages && printSettings.pages !== 'all') {
      parts.push(`Pages: ${printSettings.pages}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Using default print settings';
  } else {
    const scanSettings = settings as ScanSettings;
    const parts: string[] = [];
    
    if (scanSettings.layout) parts.push(`Layout: ${scanSettings.layout}`);
    if (scanSettings.paperSize) parts.push(`Paper: ${scanSettings.paperSize}`);
    if (scanSettings.colorMode) parts.push(`Color: ${scanSettings.colorMode}`);
    if (scanSettings.resolution) parts.push(`Resolution: ${scanSettings.resolution} DPI`);
    if (scanSettings.textMode) parts.push('OCR: enabled');
    if (scanSettings.format) parts.push(`Format: ${scanSettings.format}`);
    
    return parts.length > 0 ? parts.join(', ') : 'Using default scan settings';
  }
}

/**
 * Validate settings before execution
 */
export function validateSettings(
  settings: Partial<PrintSettings & ScanSettings>,
  mode: 'print' | 'scan',
  selectedDocuments: any[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (mode === 'print') {
    const printSettings = settings as PrintSettings;
    
    // Check for documents
    if (selectedDocuments.length === 0 && 
        (!printSettings.selectedFiles || printSettings.selectedFiles.length === 0) &&
        (!printSettings.convertedFiles || printSettings.convertedFiles.length === 0)) {
      errors.push('No documents selected for printing');
    }
    
    // Check scale range
    const scale = parseInt(printSettings.scale || '100');
    if (scale < 25 || scale > 400) {
      errors.push('Scale must be between 25% and 400%');
    }
    
    // Check copies
    const copies = parseInt(printSettings.copies || '1');
    if (copies < 1 || copies > 999) {
      errors.push('Copies must be between 1 and 999');
    }
  }

  if (mode === 'scan') {
    // Scan-specific validations
    const scanSettings = settings as ScanSettings;
    
    // Resolution validation
    const resolution = parseInt(scanSettings.resolution || '300');
    if (resolution < 75 || resolution > 1200) {
      errors.push('Resolution must be between 75 and 1200 DPI');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert settings to API format
 */
export function settingsToApiFormat(
  settings: Partial<PrintSettings & ScanSettings>,
  mode: 'print' | 'scan'
): Record<string, any> {
  if (mode === 'print') {
    const ps = settings as PrintSettings;
    return {
      pages: ps.pages,
      customRange: ps.customRange,
      layout: ps.layout,
      paperSize: ps.paperSize,
      resolution: ps.resolution,
      colorMode: ps.colorMode,
      scale: ps.scale,
      margins: ps.margins,
      pagesPerSheet: ps.pagesPerSheet,
      copies: ps.copies,
      duplex: ps.duplex,
      quality: ps.quality,
    };
  } else {
    const ss = settings as ScanSettings;
    return {
      mode: ss.mode,
      textMode: ss.textMode,
      pageMode: ss.pageMode,
      customRange: ss.customRange,
      layout: ss.layout,
      paperSize: ss.paperSize,
      resolution: ss.resolution,
      colorMode: ss.colorMode,
      format: ss.format,
      quality: ss.quality,
    };
  }
}

export default {
  defaultPrintSettings,
  defaultScanSettings,
  applySettingChange,
  getSettingsSummary,
  validateSettings,
  settingsToApiFormat,
};
