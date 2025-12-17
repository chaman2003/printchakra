/**
 * Voice Command Bridge Hook
 * Bridges voice commands from VoiceAIChat with useAIAssist and UI actions
 * 
 * This hook provides:
 * - Local command parsing with useAIAssist
 * - UI action dispatching (scroll, navigate, modals)
 * - Settings synchronization with orchestration options
 * - Unified command handling from both voice and text inputs
 */

import { useCallback, useRef, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import {
  useAIAssist,
  parseCommand,
  ParsedCommand,
  AIResponse,
  WorkflowMode,
  PrintSettings,
  ScanSettings,
  DocumentSection,
} from '../aiassist';

export interface VoiceCommandPayload {
  command: string;
  params?: Record<string, any>;
}

export interface OrchestrateOptions {
  // Print settings
  printColorMode?: string;
  printLayout?: string;
  printPaperSize?: string;
  printResolution?: string;
  printPages?: string;
  printCustomRange?: string;
  printScale?: string;
  printMargins?: string;
  printPagesPerSheet?: string;
  printCopies?: string;
  printDuplex?: boolean;
  printQuality?: string;
  printSelectedFiles?: string[];
  printConvertedFiles?: string[];
  // Scan settings
  scanColorMode?: string;
  scanLayout?: string;
  scanResolution?: string;
  scanPaperSize?: string;
  scanPageMode?: string;
  scanCustomRange?: string;
  scanFormat?: string;
  scanTextMode?: boolean;
  scanMode?: string;
  scanQuality?: string;
}

export interface UseVoiceCommandBridgeOptions {
  // Current orchestration state
  orchestrateMode: 'print' | 'scan' | null;
  orchestrateOptions: OrchestrateOptions;
  
  // Callbacks for UI actions
  onSettingsChange: (settings: Partial<OrchestrateOptions>) => void;
  onDocumentSelect: (section: DocumentSection, index: number) => void;
  onSectionSwitch: (section: DocumentSection) => void;
  onNavigate: (direction: 'next' | 'prev' | 'back') => void;
  onExecute: (action: 'print' | 'scan' | 'cancel' | 'confirm') => void;
  onScroll: (direction: 'up' | 'down') => void;
  onModalOpen: (modal: 'upload' | 'document-selector' | 'orchestrate') => void;
  onModalClose: (modal?: string) => void;
  onFeedDocuments?: (count: number) => void;
  
  // Toast for feedback
  showToast?: (title: string, description: string, status: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface UseVoiceCommandBridgeReturn {
  // Process a voice command from backend
  processVoiceCommand: (payload: VoiceCommandPayload) => AIResponse | null;
  
  // Process text input locally (for local AI assist)
  processTextInput: (text: string) => AIResponse;
  
  // Current AI assist context
  context: ReturnType<typeof useAIAssist>['context'];
  
  // Set mode
  setMode: (mode: WorkflowMode | null) => void;
  
  // Sync settings with orchestration
  syncSettings: (options: Partial<OrchestrateOptions>) => void;
}

/**
 * Map backend command names to frontend command actions
 */
const BACKEND_TO_FRONTEND_COMMAND: Record<string, string> = {
  // Document commands
  'select_document': 'SELECT_DOCUMENT',
  'select_multiple_documents': 'SELECT_MULTIPLE_DOCUMENTS',
  'switch_section': 'SWITCH_SECTION',
  'next_document': 'NEXT_DOCUMENT',
  'previous_document': 'PREV_DOCUMENT',
  'upload_document': 'UPLOAD_DOCUMENT',
  
  // Settings commands
  'set_layout': 'SET_LAYOUT',
  'set_color': 'SET_COLOR_MODE',
  'set_color_mode': 'SET_COLOR_MODE',
  'set_paper_size': 'SET_PAPER_SIZE',
  'set_resolution': 'SET_RESOLUTION',
  'set_pages': 'SET_PAGES',
  'set_copies': 'SET_COPIES',
  'set_duplex': 'SET_DUPLEX',
  'set_margins': 'SET_MARGINS',
  'set_scale': 'SET_SCALE',
  'set_quality': 'SET_QUALITY',
  'toggle_ocr': 'TOGGLE_OCR',
  'toggle_text_mode': 'TOGGLE_TEXT_MODE',
  
  // Navigation
  'scroll_down': 'SCROLL_DOWN',
  'scroll_up': 'SCROLL_UP',
  'go_back': 'GO_BACK',
  
  // Workflow
  'confirm': 'CONFIRM',
  'cancel': 'CANCEL',
  'status': 'STATUS',
  'repeat_settings': 'REPEAT_SETTINGS',
  'help': 'HELP',
  'stop_recording': 'STOP_RECORDING',
  
  // New commands
  'clear_print_queue': 'CLEAR_PRINT_QUEUE',
  'check_connectivity': 'CHECK_CONNECTIVITY',
  'device_info': 'DEVICE_INFO',
  'show_converted': 'SHOW_CONVERTED',
  'convert_file': 'CONVERT_FILE',
  'selection_mode_on': 'SELECTION_MODE_ON',
  'selection_mode_off': 'SELECTION_MODE_OFF',
  'select_range': 'SELECT_RANGE',
  'toggle_auto_capture': 'TOGGLE_AUTO_CAPTURE',
  'use_feed_tray': 'USE_FEED_TRAY',
  'select_documents': 'SELECT_DOCUMENTS',
  'close_panel': 'CLOSE_PANEL',
};

/**
 * Map frontend settings to orchestrate options keys
 */
const mapSettingsToOrchestrate = (
  settings: Partial<PrintSettings | ScanSettings>,
  mode: 'print' | 'scan'
): Partial<OrchestrateOptions> => {
  const result: Partial<OrchestrateOptions> = {};
  
  if (mode === 'print') {
    const printSettings = settings as Partial<PrintSettings>;
    if (printSettings.colorMode) result.printColorMode = printSettings.colorMode;
    if (printSettings.layout) result.printLayout = printSettings.layout;
    if (printSettings.paperSize) result.printPaperSize = printSettings.paperSize;
    if (printSettings.resolution) result.printResolution = printSettings.resolution;
    if (printSettings.pages) result.printPages = printSettings.pages;
    if (printSettings.customRange) result.printCustomRange = printSettings.customRange;
    if (printSettings.scale) result.printScale = printSettings.scale;
    if (printSettings.margins) result.printMargins = printSettings.margins;
    if (printSettings.pagesPerSheet) result.printPagesPerSheet = printSettings.pagesPerSheet;
    if (printSettings.copies) result.printCopies = printSettings.copies;
    if (printSettings.duplex !== undefined) result.printDuplex = printSettings.duplex;
    if (printSettings.quality) result.printQuality = printSettings.quality;
  } else {
    const scanSettings = settings as Partial<ScanSettings>;
    if (scanSettings.colorMode) result.scanColorMode = scanSettings.colorMode;
    if (scanSettings.layout) result.scanLayout = scanSettings.layout;
    if (scanSettings.paperSize) result.scanPaperSize = scanSettings.paperSize;
    if (scanSettings.resolution) result.scanResolution = scanSettings.resolution;
    if (scanSettings.pageMode) result.scanPageMode = scanSettings.pageMode;
    if (scanSettings.customRange) result.scanCustomRange = scanSettings.customRange;
    if (scanSettings.format) result.scanFormat = scanSettings.format;
    if (scanSettings.textMode !== undefined) result.scanTextMode = scanSettings.textMode;
    if (scanSettings.mode) result.scanMode = scanSettings.mode;
    if (scanSettings.quality) result.scanQuality = scanSettings.quality;
  }
  
  return result;
};

export function useVoiceCommandBridge(
  options: UseVoiceCommandBridgeOptions
): UseVoiceCommandBridgeReturn {
  const {
    orchestrateMode,
    orchestrateOptions,
    onSettingsChange,
    onDocumentSelect,
    onSectionSwitch,
    onNavigate,
    onExecute,
    onScroll,
    onModalOpen,
    onModalClose,
    onFeedDocuments,
    showToast,
  } = options;

  const toast = useToast();
  const displayToast = showToast || ((title, description, status) => {
    toast({ title, description, status, duration: 3000, isClosable: true });
  });

  // Use AI Assist hook for local command processing
  const aiAssist = useAIAssist({
    initialMode: orchestrateMode,
    onSettingsChange: (settings) => {
      // Convert AI assist settings to orchestrate options format
      if (orchestrateMode) {
        const orchestrateSettings = mapSettingsToOrchestrate(settings, orchestrateMode);
        onSettingsChange(orchestrateSettings);
      }
    },
    onDocumentSelect: (index, section) => {
      onDocumentSelect(section, index);
    },
    onSectionSwitch: (section) => {
      onSectionSwitch(section);
    },
    onNavigate: (direction) => {
      onNavigate(direction);
    },
    onExecute: (action) => {
      if (action === 'print' || action === 'scan' || action === 'cancel' || action === 'confirm') {
        onExecute(action);
      }
    },
    onFeedDocuments: onFeedDocuments,
    onToast: displayToast,
  });

  // Sync mode with orchestrate mode
  useEffect(() => {
    if (orchestrateMode !== aiAssist.context.mode) {
      aiAssist.setMode(orchestrateMode);
    }
  }, [orchestrateMode, aiAssist]);

  /**
   * Process voice command from backend
   */
  const processVoiceCommand = useCallback((payload: VoiceCommandPayload): AIResponse | null => {
    const { command, params } = payload;
    
    // Map backend command to frontend action
    const frontendAction = BACKEND_TO_FRONTEND_COMMAND[command];
    
    if (!frontendAction) {
      console.warn(`Unknown backend command: ${command}`);
      return null;
    }

    // Handle UI-specific commands that don't go through AI assist
    switch (frontendAction) {
      case 'SCROLL_DOWN':
        onScroll('down');
        return { text: 'Scrolling down.', shouldSpeak: false, feedbackType: 'info' };
        
      case 'SCROLL_UP':
        onScroll('up');
        return { text: 'Scrolling up.', shouldSpeak: false, feedbackType: 'info' };
        
      case 'CLEAR_PRINT_QUEUE':
      case 'CHECK_CONNECTIVITY':
      case 'DEVICE_INFO':
      case 'SHOW_CONVERTED':
      case 'CONVERT_FILE':
      case 'SELECTION_MODE_ON':
      case 'SELECTION_MODE_OFF':
      case 'SELECT_RANGE':
      case 'TOGGLE_AUTO_CAPTURE':
      case 'USE_FEED_TRAY':
      case 'SELECT_DOCUMENTS':
      case 'CLOSE_PANEL':
        // These are handled directly by Dashboard's handleVoiceCommand
        return null;
        
      case 'UPLOAD_DOCUMENT':
        onModalOpen('upload');
        return { text: 'Opening upload dialog.', shouldSpeak: true, feedbackType: 'info' };
        
      case 'SELECT_DOCUMENT':
        if (params?.section) {
          onSectionSwitch(params.section as DocumentSection);
        }
        if (params?.document_number) {
          const section = (params.section || 'current') as DocumentSection;
          onDocumentSelect(section, parseInt(params.document_number, 10));
        }
        return { text: `Selecting document.`, shouldSpeak: true, feedbackType: 'success' };
        
      case 'SWITCH_SECTION':
        if (params?.section) {
          onSectionSwitch(params.section as DocumentSection);
        }
        return { text: `Switching to ${params?.section || 'documents'}.`, shouldSpeak: true, feedbackType: 'success' };
        
      case 'NEXT_DOCUMENT':
        onNavigate('next');
        return { text: 'Moving to next document.', shouldSpeak: true, feedbackType: 'success' };
        
      case 'PREV_DOCUMENT':
        onNavigate('prev');
        return { text: 'Moving to previous document.', shouldSpeak: true, feedbackType: 'success' };
        
      case 'GO_BACK':
        onNavigate('back');
        return { text: 'Going back.', shouldSpeak: true, feedbackType: 'info' };
        
      case 'CONFIRM':
        if (orchestrateMode) {
          onExecute(orchestrateMode);
        } else {
          onExecute('confirm');
        }
        return { text: 'Executing now!', shouldSpeak: true, feedbackType: 'success' };
        
      case 'CANCEL':
        onExecute('cancel');
        onModalClose();
        return { text: 'Cancelled.', shouldSpeak: true, feedbackType: 'warning' };
        
      // Settings commands - map params to orchestrate options
      case 'SET_LAYOUT':
        if (params?.layout && orchestrateMode) {
          const key = orchestrateMode === 'print' ? 'printLayout' : 'scanLayout';
          onSettingsChange({ [key]: params.layout });
          return { text: `Layout set to ${params.layout}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_COLOR_MODE':
        if (params?.colorMode && orchestrateMode) {
          const key = orchestrateMode === 'print' ? 'printColorMode' : 'scanColorMode';
          onSettingsChange({ [key]: params.colorMode });
          const displayMode = params.colorMode === 'bw' ? 'Black and White' : params.colorMode;
          return { text: `Color mode set to ${displayMode}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_PAPER_SIZE':
        if (params?.paperSize && orchestrateMode) {
          const key = orchestrateMode === 'print' ? 'printPaperSize' : 'scanPaperSize';
          onSettingsChange({ [key]: params.paperSize });
          return { text: `Paper size set to ${params.paperSize}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_RESOLUTION':
        if (params?.resolution && orchestrateMode) {
          const key = orchestrateMode === 'print' ? 'printResolution' : 'scanResolution';
          onSettingsChange({ [key]: String(params.resolution) });
          return { text: `Resolution set to ${params.resolution} DPI.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_PAGES':
        if (params?.pages && orchestrateMode) {
          const key = orchestrateMode === 'print' ? 'printPages' : 'scanPageMode';
          onSettingsChange({ [key]: params.pages });
          if (params.customRange) {
            const rangeKey = orchestrateMode === 'print' ? 'printCustomRange' : 'scanCustomRange';
            onSettingsChange({ [rangeKey]: params.customRange });
          }
          return { text: `Page selection set to ${params.pages}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_COPIES':
        if (params?.copies && orchestrateMode === 'print') {
          onSettingsChange({ printCopies: String(params.copies) });
          return { text: `Copies set to ${params.copies}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_DUPLEX':
        if (params?.duplex !== undefined && orchestrateMode === 'print') {
          onSettingsChange({ printDuplex: params.duplex });
          return { text: `Double-sided ${params.duplex ? 'enabled' : 'disabled'}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_MARGINS':
        if (params?.margins && orchestrateMode === 'print') {
          onSettingsChange({ printMargins: params.margins });
          return { text: `Margins set to ${params.margins}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_SCALE':
        if (params?.scale && orchestrateMode === 'print') {
          onSettingsChange({ printScale: String(params.scale) });
          return { text: `Scale set to ${params.scale}%.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'SET_QUALITY':
        if (params?.quality && orchestrateMode) {
          const key = orchestrateMode === 'print' ? 'printQuality' : 'scanQuality';
          onSettingsChange({ [key]: params.quality });
          return { text: `Quality set to ${params.quality}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'TOGGLE_OCR':
      case 'TOGGLE_TEXT_MODE':
        if (params?.enabled !== undefined && orchestrateMode === 'scan') {
          onSettingsChange({ scanTextMode: params.enabled });
          return { text: `OCR ${params.enabled ? 'enabled' : 'disabled'}.`, shouldSpeak: true, feedbackType: 'success' };
        }
        break;
        
      case 'STATUS':
        const statusText = orchestrateMode
          ? `${orchestrateMode.toUpperCase()} mode active.`
          : 'No active operation.';
        displayToast('Status', statusText, 'info');
        return { text: statusText, shouldSpeak: true, feedbackType: 'info' };
        
      case 'REPEAT_SETTINGS':
        // Let Dashboard handle this with full settings access
        return null;
        
      case 'HELP':
        const helpText = 'You can say: select document, set layout to landscape, change to color mode, confirm print, cancel, or ask for status.';
        displayToast('Help', helpText, 'info');
        return { text: helpText, shouldSpeak: true, feedbackType: 'info' };
        
      case 'STOP_RECORDING':
        return { text: 'Stopping recording.', shouldSpeak: true, feedbackType: 'info' };
    }
    
    return null;
  }, [
    orchestrateMode,
    onSettingsChange,
    onDocumentSelect,
    onSectionSwitch,
    onNavigate,
    onExecute,
    onScroll,
    onModalOpen,
    onModalClose,
    displayToast,
  ]);

  /**
   * Process text input locally using AI assist
   */
  const processTextInput = useCallback((text: string): AIResponse => {
    return aiAssist.processInput(text);
  }, [aiAssist]);

  /**
   * Sync external settings with AI assist context
   */
  const syncSettings = useCallback((options: Partial<OrchestrateOptions>) => {
    // Convert orchestrate options back to AI assist settings format
    if (orchestrateMode === 'print') {
      const printSettings: Partial<PrintSettings> = {
        colorMode: options.printColorMode as any,
        layout: options.printLayout as any,
        paperSize: options.printPaperSize,
        resolution: options.printResolution,
        pages: options.printPages as any,
        customRange: options.printCustomRange,
        scale: options.printScale,
        margins: options.printMargins as any,
        pagesPerSheet: options.printPagesPerSheet,
        copies: options.printCopies,
        duplex: options.printDuplex,
        quality: options.printQuality as any,
      };
      aiAssist.setSettings(printSettings);
    } else if (orchestrateMode === 'scan') {
      const scanSettings: Partial<ScanSettings> = {
        colorMode: options.scanColorMode as any,
        layout: options.scanLayout as any,
        paperSize: options.scanPaperSize,
        resolution: options.scanResolution,
        pageMode: options.scanPageMode as any,
        customRange: options.scanCustomRange,
        format: options.scanFormat,
        textMode: options.scanTextMode,
        mode: options.scanMode as any,
        quality: options.scanQuality as any,
      };
      aiAssist.setSettings(scanSettings);
    }
  }, [aiAssist, orchestrateMode]);

  return {
    processVoiceCommand,
    processTextInput,
    context: aiAssist.context,
    setMode: aiAssist.setMode,
    syncSettings,
  };
}

export default useVoiceCommandBridge;
