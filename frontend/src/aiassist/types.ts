/**
 * AI Assist Type Definitions
 * Core types for voice commands, settings, and AI interactions
 */

// ==================== App State Types ====================
export type AppState = 
  | 'DASHBOARD'           // Dashboard with AI chat, no active workflow
  | 'PRINT_WORKFLOW'      // Print workflow active
  | 'SCAN_WORKFLOW';      // Scan workflow active

export type PrintWorkflowStep = 
  | 'SELECT_DOCUMENT'     // Document selection screen
  | 'CONFIGURATION'       // Print configuration screen
  | 'REVIEW'              // Review settings screen
  | 'EXECUTING';          // Print in progress

export type ScanWorkflowStep = 
  | 'SOURCE_SELECTION'    // Choose: upload/select or feed tray
  | 'SELECT_DOCUMENT'     // Document selection (if not feed tray)
  | 'CONFIGURATION'       // Scan configuration screen
  | 'REVIEW'              // Review settings screen
  | 'EXECUTING';          // Scan in progress

export type ScanDocumentSource = 'select' | 'feed' | null;

// ==================== Command Types ====================
export type CommandCategory =
  | 'document_selection'
  | 'settings_change'
  | 'navigation'
  | 'workflow_action'
  | 'confirmation'
  | 'system';

export type CommandAction =
  | 'SELECT_DOCUMENT'
  | 'NEXT_DOCUMENT'
  | 'PREV_DOCUMENT'
  | 'SWITCH_SECTION'
  | 'UPLOAD_DOCUMENT'
  | 'SET_LAYOUT'
  | 'SET_PAPER_SIZE'
  | 'SET_COLOR_MODE'
  | 'SET_RESOLUTION'
  | 'SET_COPIES'
  | 'SET_DUPLEX'
  | 'SET_MARGINS'
  | 'SET_SCALE'
  | 'SET_PAGES'
  | 'SET_PAGES_PER_SHEET'
  | 'SET_QUALITY'
  | 'TOGGLE_OCR'
  | 'TOGGLE_TEXT_MODE'
  | 'SCROLL_DOWN'
  | 'SCROLL_UP'
  | 'GO_BACK'
  | 'GO_NEXT'
  | 'APPLY_SETTINGS'
  | 'CONFIRM'
  | 'CANCEL'
  | 'STATUS'
  | 'REPEAT_SETTINGS'
  | 'HELP'
  | 'STOP_RECORDING'
  | 'FEED_DOCUMENTS'
  | 'START_PRINT'
  | 'START_SCAN'
  | 'OPEN_PRINT_MODE'
  | 'OPEN_SCAN_MODE'
  | 'REQUEST_MODE_SWITCH'
  | 'SET_SCAN_SOURCE'
  | 'SELECT_MULTIPLE_DOCUMENTS'
  | 'DESELECT_DOCUMENT'
  | 'CLEAR_DOCUMENT_SELECTION';

export interface ParsedCommand {
  action: CommandAction;
  category: CommandCategory;
  params?: Record<string, any>;
  confidence: number;
  originalText: string;
  stateValidation?: {
    valid: boolean;
    reason?: string;
  };
}

// ==================== Settings Types ====================
export type WorkflowMode = 'print' | 'scan';
export type LayoutOrientation = 'portrait' | 'landscape';
export type ColorMode = 'color' | 'grayscale' | 'bw';
export type PaperSize = 'A4' | 'Letter' | 'Legal' | 'A3' | 'A5';
export type PageSelection = 'all' | 'odd' | 'even' | 'custom';
export type MarginPreset = 'default' | 'narrow' | 'none' | 'custom';
export type QualityPreset = 'draft' | 'normal' | 'high' | 'professional';

export interface PrintSettings {
  pages: PageSelection;
  customRange: string;
  layout: LayoutOrientation;
  paperSize: PaperSize | string;
  resolution: string;
  colorMode: ColorMode;
  scale: string;
  margins: MarginPreset;
  marginsCustom: string;
  pagesPerSheet: string;
  pagesPerSheetCustom: string;
  copies: string;
  duplex: boolean;
  quality: QualityPreset;
  selectedFiles: string[];
  convertedFiles: string[];
}

export interface ScanSettings {
  mode: 'single' | 'multi';
  textMode: boolean;
  pageMode: PageSelection;
  customRange: string;
  layout: LayoutOrientation;
  paperSize: PaperSize | string;
  paperSizeCustom: string;
  resolution: string;
  resolutionCustom: string;
  colorMode: ColorMode;
  format: string;
  quality: QualityPreset;
}

export interface OrchestrateOptions {
  scan: ScanSettings;
  print: PrintSettings;
  saveAsDefault: boolean;
}

// ==================== Document Types ====================
export interface DocumentInfo {
  filename: string;
  size: number;
  type: string;
  thumbnailUrl?: string;
  isProcessed?: boolean;
  pages?: DocumentPage[];
}

export interface DocumentPage {
  pageNumber: number;
  thumbnailUrl?: string;
  fullUrl?: string;
}

export type DocumentSection = 'current' | 'converted' | 'uploaded';

export interface DocumentSelectionState {
  activeSection: DocumentSection;
  selectedDocuments: DocumentInfo[];
  currentIndex: number;
}

// ==================== Context Types ====================
export interface WorkflowContext {
  mode: WorkflowMode | null;
  step: number;
  isModalOpen: boolean;
  isChatVisible: boolean;
  documentsFed: boolean;
  feedCount: number;
  selectedDocuments: DocumentInfo[];
  currentSettings: Partial<PrintSettings> | Partial<ScanSettings> | Record<string, unknown>;
  // New state machine fields
  appState: AppState;
  printStep: PrintWorkflowStep | null;
  scanStep: ScanWorkflowStep | null;
  scanSource: ScanDocumentSource;
  selectedDocumentIndices: number[];
}

// ==================== Response Types ====================
export interface AIResponse {
  text: string;
  action?: CommandAction;
  params?: Record<string, any>;
  shouldSpeak?: boolean;
  feedbackType?: 'success' | 'info' | 'warning' | 'error';
  stateUpdate?: {
    newState?: AppState;
    newStep?: PrintWorkflowStep | ScanWorkflowStep;
  };
}

// ==================== Handler Types ====================
export type CommandHandler = (
  command: ParsedCommand,
  context: WorkflowContext
) => AIResponse | Promise<AIResponse>;

export interface CommandHandlerMap {
  [key: string]: CommandHandler;
}

// ==================== Callback Types ====================
export interface AIAssistCallbacks {
  onSelectDocument?: (index: number, section: DocumentSection) => void;
  onSelectMultipleDocuments?: (indices: number[], section: DocumentSection) => void;
  onDeselectDocument?: (index: number, section: DocumentSection) => void;
  onClearDocumentSelection?: () => void;
  onSwitchSection?: (section: DocumentSection) => void;
  onUpdateSettings?: (settings: Partial<PrintSettings | ScanSettings>) => void;
  onNavigate?: (direction: 'next' | 'prev' | 'back') => void;
  onExecuteAction?: (action: 'print' | 'scan' | 'cancel' | 'confirm') => void;
  onFeedDocuments?: (count: number) => void;
  onOpenModal?: () => void;
  onCloseModal?: () => void;
  onShowToast?: (title: string, description: string, status: 'success' | 'error' | 'warning' | 'info') => void;
  onModeSwitch?: (mode: WorkflowMode, hasSorry: boolean) => boolean;
  onSetScanSource?: (source: ScanDocumentSource) => void;
  onStateChange?: (appState: AppState, step: PrintWorkflowStep | ScanWorkflowStep | null) => void;
}
