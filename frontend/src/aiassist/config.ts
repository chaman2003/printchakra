/**
 * AI Assist Configuration
 * Voice command patterns, keywords, and response templates
 */

const AIAssistConfig = {
  // ==================== Document Selection Commands ====================
  documentCommands: {
    select: [
      'select', 'choose', 'pick', 'open', 'use', 'get',
      'select document', 'choose document', 'pick document',
      'document number', 'file number', 'select file'
    ],
    switchSection: {
      current: ['current', 'originals', 'original', 'main', 'current documents', 'show current'],
      converted: ['converted', 'converted documents', 'show converted', 'pdf', 'pdfs'],
      uploaded: ['uploaded', 'upload', 'local', 'local files', 'uploaded files', 'show uploaded']
    },
    navigation: {
      next: ['next', 'next document', 'next file', 'forward', 'move forward', 'go forward'],
      previous: ['previous', 'prev', 'back', 'go back', 'move back', 'previous document']
    },
    upload: ['upload', 'upload document', 'upload file', 'add document', 'add file', 'new document', 'browse files']
  },

  // ==================== Print Settings Commands ====================
  printCommands: {
    layout: {
      portrait: ['portrait', 'vertical', 'tall', 'portrait mode', 'portrait layout'],
      landscape: ['landscape', 'horizontal', 'wide', 'landscape mode', 'landscape layout']
    },
    paperSize: {
      'A4': ['a4', 'a 4', 'a-4'],
      'Letter': ['letter', 'us letter', 'letter size'],
      'Legal': ['legal', 'legal size'],
      'A3': ['a3', 'a 3', 'a-3'],
      'A5': ['a5', 'a 5', 'a-5']
    },
    colorMode: {
      color: ['color', 'colour', 'full color', 'color mode'],
      grayscale: ['grayscale', 'grey', 'gray', 'greyscale', 'black and white simple'],
      bw: ['black and white', 'b&w', 'monochrome', 'black white', 'bw']
    },
    pages: {
      all: ['all pages', 'all', 'everything', 'full document', 'entire document'],
      odd: ['odd pages', 'odd only', 'odd', '1 3 5'],
      even: ['even pages', 'even only', 'even', '2 4 6'],
      custom: ['custom pages', 'custom range', 'specific pages', 'pages']
    },
    margins: {
      default: ['default margins', 'normal margins', 'default', 'standard margins'],
      narrow: ['narrow margins', 'narrow', 'small margins', 'thin margins'],
      none: ['no margins', 'none', 'zero margins', 'borderless', 'full bleed']
    },
    quality: {
      draft: ['draft', 'draft quality', 'quick', 'fast print'],
      normal: ['normal', 'normal quality', 'standard', 'standard quality'],
      high: ['high', 'high quality', 'fine', 'detailed'],
      professional: ['professional', 'best', 'maximum quality', 'highest']
    },
    duplex: {
      enable: ['duplex', 'double sided', 'both sides', 'two sided', 'front and back'],
      disable: ['single sided', 'one side', 'no duplex', 'front only']
    },
    copies: ['copies', 'copy', 'print copies', 'number of copies'],
    scale: ['scale', 'zoom', 'size', 'print size', 'scaling', 'percent'],
    resolution: ['dpi', 'resolution', 'quality dpi', 'print resolution'],
    pagesPerSheet: ['pages per sheet', 'multiple pages', 'n-up', 'booklet', '2 per page', '4 per page']
  },

  // ==================== Scan Settings Commands ====================
  scanCommands: {
    mode: {
      single: ['single', 'single page', 'one page', 'single scan'],
      multi: ['multi', 'multiple', 'multi page', 'multiple pages', 'batch']
    },
    textMode: {
      enable: ['text mode', 'ocr', 'text recognition', 'recognize text', 'enable ocr', 'turn on ocr'],
      disable: ['disable ocr', 'no ocr', 'turn off ocr', 'image only']
    },
    format: {
      pdf: ['pdf', 'pdf format', 'save as pdf'],
      jpeg: ['jpeg', 'jpg', 'image', 'picture'],
      png: ['png', 'png format', 'transparent']
    }
  },

  // ==================== Workflow Commands ====================
  workflowCommands: {
    confirm: [
      'confirm', 'yes', 'proceed', 'go ahead', 'okay', 'ok', 'sure', 'do it', 'execute',
      'start', 'begin', 'confirm print', 'confirm scan', 'yes proceed'
    ],
    cancel: [
      'cancel', 'stop', 'abort', 'nevermind', 'forget it', "don't do it",
      'close', 'exit', 'quit', 'end'
    ],
    status: [
      'status', 'what\'s happening', 'progress', 'where are we', 'current state',
      'show status', 'check status'
    ],
    repeatSettings: [
      'repeat', 'repeat settings', 'read settings', 'what settings',
      'show settings', 'current settings', 'tell me settings'
    ],
    help: [
      'help', 'what can you do', 'commands', 'options', 'guide',
      'available commands', 'show help', 'assist'
    ],
    stopRecording: [
      'stop recording', 'stop listening', 'end session', 'bye', 'goodbye',
      'stop voice', 'end voice'
    ],
    feedDocuments: [
      'feed', 'feed documents', 'feed paper', 'insert documents', 'load documents',
      'put documents', 'feed through printer'
    ],
    scroll: {
      down: ['scroll down', 'go down', 'move down', 'scroll to bottom', 'page down'],
      up: ['scroll up', 'go up', 'move up', 'scroll to top', 'page up']
    }
  },

  // ==================== Number Extraction Patterns ====================
  numberPatterns: {
    ordinal: /(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)/i,
    cardinal: /\b(\d+)\b/,
    wordNumbers: {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
      'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
      'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10
    }
  },

  // ==================== Response Templates ====================
  responses: {
    documentSelected: (num: number, section: string) => 
      `Selected document ${num} from ${section}`,
    sectionSwitched: (section: string) => 
      `Switched to ${section} documents`,
    settingChanged: (setting: string, value: string) => 
      `${setting} set to ${value}`,
    confirmRequired: (action: string) => 
      `Ready to ${action}. Say "confirm" to proceed.`,
    cancelled: () => 
      `Operation cancelled`,
    statusReport: (mode: string, step: number) => 
      `Currently in ${mode} mode, step ${step} of 3`,
    noDocuments: () => 
      `No documents available. Please upload or select documents first.`,
    invalidCommand: () => 
      `I didn't understand that. Try "help" for available commands.`,
    feedingStarted: (count: number) => 
      `Feeding ${count} document${count > 1 ? 's' : ''} through printer...`,
    printStarted: () => 
      `Print job submitted successfully!`,
    scanStarted: () => 
      `Scan operation initiated`,
    helpMessage: () => 
      `You can say: select document, set layout to landscape, change to color mode, confirm print, cancel, or ask for status.`,
    settingsReadout: (settings: Record<string, any>) => {
      const parts = Object.entries(settings)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${v}`);
      return parts.length > 0 ? parts.join(', ') : 'Default settings';
    }
  },

  // ==================== Confidence Thresholds ====================
  thresholds: {
    highConfidence: 0.85,
    mediumConfidence: 0.6,
    lowConfidence: 0.4
  }
};

export default AIAssistConfig;
