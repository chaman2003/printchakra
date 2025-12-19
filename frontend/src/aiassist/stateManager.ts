/**
 * AI State Manager
 * Strict state-based control for AI assistant workflows
 * 
 * Implements:
 * - State 1: Dashboard + AI Chat Only (print/scan commands only)
 * - State 2: One Active Interface Only (no switching without "sorry")
 * - State 3: Print Workflow (Select -> Config -> Review -> Execute)
 * - State 4: Scan Workflow (Source Choice -> Config -> Review -> Execute)
 */

// ==================== App States ====================
import type { AppState, PrintWorkflowStep, ScanWorkflowStep, ScanDocumentSource } from './types';


// ==================== State Transition Types ====================
export interface StateTransition {
  from: AppState;
  to: AppState;
  allowed: boolean;
  requiresSorry: boolean;
  reason?: string;
}

export interface WorkflowStepTransition {
  from: PrintWorkflowStep | ScanWorkflowStep | null;
  to: PrintWorkflowStep | ScanWorkflowStep;
  allowed: boolean;
  reason?: string;
}

// ==================== AI State Interface ====================
export interface AIState {
  currentState: AppState;
  printStep: PrintWorkflowStep | null;
  scanStep: ScanWorkflowStep | null;
  scanSource: ScanDocumentSource;
  selectedDocuments: string[];
  isChatAccessible: boolean;
  lastModeSwitchAttempt: {
    targetMode: 'print' | 'scan' | null;
    hadSorry: boolean;
    timestamp: number;
  } | null;
}

// ==================== Action Types ====================
export type AIAction =
  | { type: 'OPEN_PRINT_MODE' }
  | { type: 'OPEN_SCAN_MODE' }
  | { type: 'REQUEST_MODE_SWITCH'; targetMode: 'print' | 'scan'; hasSorryKeyword: boolean }
  | { type: 'CLOSE_WORKFLOW' }
  | { type: 'SET_PRINT_STEP'; step: PrintWorkflowStep }
  | { type: 'SET_SCAN_STEP'; step: ScanWorkflowStep }
  | { type: 'SET_SCAN_SOURCE'; source: ScanDocumentSource }
  | { type: 'SELECT_DOCUMENTS'; documents: string[] }
  | { type: 'DESELECT_DOCUMENTS'; documents: string[] }
  | { type: 'CLEAR_DOCUMENTS' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'EXECUTE' }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

// ==================== State Validation ====================

/**
 * Check if a mode switch requires the "sorry" keyword
 */
export function requiresSorryForSwitch(
  currentState: AppState,
  targetMode: 'print' | 'scan'
): boolean {
  if (currentState === 'DASHBOARD') {
    return false;
  }
  
  // Switching from one active workflow to another requires "sorry"
  if (currentState === 'PRINT_WORKFLOW' && targetMode === 'scan') {
    return true;
  }
  if (currentState === 'SCAN_WORKFLOW' && targetMode === 'print') {
    return true;
  }
  
  return false;
}

/**
 * Check if a command is valid for the current state
 */
export function isCommandValidForState(
  state: AIState,
  commandType: string
): { valid: boolean; reason?: string } {
  const { currentState, printStep, scanStep } = state;

  // Dashboard state - only allow print/scan commands
  if (currentState === 'DASHBOARD') {
    const allowedCommands = [
      'OPEN_PRINT', 'OPEN_SCAN', 'print', 'scan',
      'START_PRINT', 'START_SCAN',
      'HELP', 'STATUS'
    ];
    
    if (!allowedCommands.some(cmd => commandType.toUpperCase().includes(cmd.toUpperCase()))) {
      return {
        valid: false,
        reason: 'Say print or scan to start.'
      };
    }
    return { valid: true };
  }

  // Print workflow state
  if (currentState === 'PRINT_WORKFLOW') {
    // Don't allow opening scan without "sorry"
    if (commandType.toUpperCase().includes('SCAN') && 
        !commandType.toUpperCase().includes('SORRY')) {
      return {
        valid: false,
        reason: 'Say "Sorry, scan" to switch.'
      };
    }
    
    // Validate step-specific commands
    return validatePrintStepCommand(printStep, commandType);
  }

  // Scan workflow state
  if (currentState === 'SCAN_WORKFLOW') {
    // Don't allow opening print without "sorry"
    if (commandType.toUpperCase().includes('PRINT') && 
        !commandType.toUpperCase().includes('SORRY')) {
      return {
        valid: false,
        reason: 'Say "Sorry, print" to switch.'
      };
    }
    
    // Validate step-specific commands
    return validateScanStepCommand(scanStep, commandType);
  }

  return { valid: true };
}

/**
 * Validate command for print workflow step
 */
function validatePrintStepCommand(
  step: PrintWorkflowStep | null,
  commandType: string
): { valid: boolean; reason?: string } {
  if (!step) return { valid: false, reason: 'Print workflow not properly initialized.' };

  const upperCommand = commandType.toUpperCase();

  switch (step) {
    case 'SELECT_DOCUMENT':
      // Allow document selection commands
      const docCommands = ['SELECT', 'DESELECT', 'CHOOSE', 'PICK', 'DOCUMENT', 'NEXT', 'CONTINUE', 'PROCEED'];
      if (docCommands.some(cmd => upperCommand.includes(cmd)) || 
          upperCommand.includes('CANCEL') ||
          upperCommand.includes('HELP')) {
        return { valid: true };
      }
      return { valid: true }; // Allow most commands during selection
      
    case 'CONFIGURATION':
      // Allow settings commands
      return { valid: true };
      
    case 'REVIEW':
      // Allow confirm, cancel, back, and review commands
      return { valid: true };
      
    case 'EXECUTING':
      // Only allow status and cancel during execution
      if (upperCommand.includes('STATUS') || upperCommand.includes('CANCEL')) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: 'Print job is in progress. You can only check status or cancel.'
      };
  }

  return { valid: true };
}

/**
 * Validate command for scan workflow step
 */
function validateScanStepCommand(
  step: ScanWorkflowStep | null,
  commandType: string
): { valid: boolean; reason?: string } {
  if (!step) return { valid: false, reason: 'Scan workflow not properly initialized.' };

  const upperCommand = commandType.toUpperCase();

  switch (step) {
    case 'SOURCE_SELECTION':
      // Allow source selection commands
      const sourceCommands = ['SELECT', 'UPLOAD', 'FEED', 'TRAY', 'DOCUMENT', 'CANCEL'];
      if (sourceCommands.some(cmd => upperCommand.includes(cmd)) ||
          upperCommand.includes('HELP')) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: 'Please choose: "select documents" to upload/select, or "use feed tray" for printer feed.'
      };
      
    case 'SELECT_DOCUMENT':
      // Allow document selection commands
      return { valid: true };
      
    case 'CONFIGURATION':
      // Allow settings commands
      return { valid: true };
      
    case 'REVIEW':
      // Allow confirm, cancel, back, and review commands
      return { valid: true };
      
    case 'EXECUTING':
      // Only allow status and cancel during execution
      if (upperCommand.includes('STATUS') || upperCommand.includes('CANCEL')) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: 'Scan operation is in progress. You can only check status or cancel.'
      };
  }

  return { valid: true };
}

// ==================== Initial State ====================
export function createInitialAIState(): AIState {
  return {
    currentState: 'DASHBOARD',
    printStep: null,
    scanStep: null,
    scanSource: null,
    selectedDocuments: [],
    isChatAccessible: true,
    lastModeSwitchAttempt: null,
  };
}

// ==================== State Reducer ====================
export function aiStateReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'OPEN_PRINT_MODE': {
      if (state.currentState === 'SCAN_WORKFLOW') {
        // Cannot switch without "sorry"
        return state;
      }
      return {
        ...state,
        currentState: 'PRINT_WORKFLOW',
        printStep: 'SELECT_DOCUMENT',
        scanStep: null,
        scanSource: null,
        isChatAccessible: true, // Chat remains accessible
      };
    }

    case 'OPEN_SCAN_MODE': {
      if (state.currentState === 'PRINT_WORKFLOW') {
        // Cannot switch without "sorry"
        return state;
      }
      return {
        ...state,
        currentState: 'SCAN_WORKFLOW',
        scanStep: 'SOURCE_SELECTION',
        printStep: null,
        isChatAccessible: true, // Chat remains accessible
      };
    }

    case 'REQUEST_MODE_SWITCH': {
      const { targetMode, hasSorryKeyword } = action;
      const needsSorry = requiresSorryForSwitch(state.currentState, targetMode);
      
      // Record the attempt
      const newState = {
        ...state,
        lastModeSwitchAttempt: {
          targetMode,
          hadSorry: hasSorryKeyword,
          timestamp: Date.now(),
        },
      };

      if (needsSorry && !hasSorryKeyword) {
        // Denied - no sorry keyword
        return newState;
      }

      // Allowed - perform the switch
      if (targetMode === 'print') {
        return {
          ...newState,
          currentState: 'PRINT_WORKFLOW',
          printStep: 'SELECT_DOCUMENT',
          scanStep: null,
          scanSource: null,
          selectedDocuments: [],
          isChatAccessible: true,
        };
      } else {
        return {
          ...newState,
          currentState: 'SCAN_WORKFLOW',
          scanStep: 'SOURCE_SELECTION',
          printStep: null,
          selectedDocuments: [],
          isChatAccessible: true,
        };
      }
    }

    case 'CLOSE_WORKFLOW': {
      return {
        ...state,
        currentState: 'DASHBOARD',
        printStep: null,
        scanStep: null,
        scanSource: null,
        selectedDocuments: [],
        isChatAccessible: true,
      };
    }

    case 'SET_PRINT_STEP': {
      if (state.currentState !== 'PRINT_WORKFLOW') return state;
      return {
        ...state,
        printStep: action.step,
        isChatAccessible: true, // Chat always accessible
      };
    }

    case 'SET_SCAN_STEP': {
      if (state.currentState !== 'SCAN_WORKFLOW') return state;
      return {
        ...state,
        scanStep: action.step,
        isChatAccessible: true, // Chat always accessible
      };
    }

    case 'SET_SCAN_SOURCE': {
      if (state.currentState !== 'SCAN_WORKFLOW') return state;
      const nextStep: ScanWorkflowStep = action.source === 'feed' 
        ? 'CONFIGURATION' 
        : 'SELECT_DOCUMENT';
      return {
        ...state,
        scanSource: action.source,
        scanStep: nextStep,
      };
    }

    case 'SELECT_DOCUMENTS': {
      const combined = state.selectedDocuments.concat(action.documents);
      return {
        ...state,
        selectedDocuments: Array.from(new Set(combined)),
      };
    }

    case 'DESELECT_DOCUMENTS': {
      return {
        ...state,
        selectedDocuments: state.selectedDocuments.filter(
          doc => !action.documents.includes(doc)
        ),
      };
    }

    case 'CLEAR_DOCUMENTS': {
      return {
        ...state,
        selectedDocuments: [],
      };
    }

    case 'NEXT_STEP': {
      if (state.currentState === 'PRINT_WORKFLOW' && state.printStep) {
        const nextStep = getNextPrintStep(state.printStep);
        return nextStep ? { ...state, printStep: nextStep } : state;
      }
      if (state.currentState === 'SCAN_WORKFLOW' && state.scanStep) {
        const nextStep = getNextScanStep(state.scanStep, state.scanSource);
        return nextStep ? { ...state, scanStep: nextStep } : state;
      }
      return state;
    }

    case 'PREVIOUS_STEP': {
      if (state.currentState === 'PRINT_WORKFLOW' && state.printStep) {
        const prevStep = getPreviousPrintStep(state.printStep);
        return prevStep ? { ...state, printStep: prevStep } : state;
      }
      if (state.currentState === 'SCAN_WORKFLOW' && state.scanStep) {
        const prevStep = getPreviousScanStep(state.scanStep, state.scanSource);
        return prevStep ? { ...state, scanStep: prevStep } : state;
      }
      return state;
    }

    case 'EXECUTE': {
      if (state.currentState === 'PRINT_WORKFLOW') {
        return { ...state, printStep: 'EXECUTING' };
      }
      if (state.currentState === 'SCAN_WORKFLOW') {
        return { ...state, scanStep: 'EXECUTING' };
      }
      return state;
    }

    case 'CANCEL':
    case 'RESET': {
      return createInitialAIState();
    }

    default:
      return state;
  }
}

// ==================== Step Navigation Helpers ====================

function getNextPrintStep(current: PrintWorkflowStep): PrintWorkflowStep | null {
  const order: PrintWorkflowStep[] = ['SELECT_DOCUMENT', 'CONFIGURATION', 'REVIEW', 'EXECUTING'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

function getPreviousPrintStep(current: PrintWorkflowStep): PrintWorkflowStep | null {
  const order: PrintWorkflowStep[] = ['SELECT_DOCUMENT', 'CONFIGURATION', 'REVIEW', 'EXECUTING'];
  const idx = order.indexOf(current);
  return idx > 0 ? order[idx - 1] : null;
}

function getNextScanStep(current: ScanWorkflowStep, source: ScanDocumentSource): ScanWorkflowStep | null {
  if (source === 'feed') {
    // Feed tray skips document selection
    const order: ScanWorkflowStep[] = ['SOURCE_SELECTION', 'CONFIGURATION', 'REVIEW', 'EXECUTING'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  } else {
    // Full flow with document selection
    const order: ScanWorkflowStep[] = ['SOURCE_SELECTION', 'SELECT_DOCUMENT', 'CONFIGURATION', 'REVIEW', 'EXECUTING'];
    const idx = order.indexOf(current);
    return idx < order.length - 1 ? order[idx + 1] : null;
  }
}

function getPreviousScanStep(current: ScanWorkflowStep, source: ScanDocumentSource): ScanWorkflowStep | null {
  if (source === 'feed') {
    const order: ScanWorkflowStep[] = ['SOURCE_SELECTION', 'CONFIGURATION', 'REVIEW', 'EXECUTING'];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  } else {
    const order: ScanWorkflowStep[] = ['SOURCE_SELECTION', 'SELECT_DOCUMENT', 'CONFIGURATION', 'REVIEW', 'EXECUTING'];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  }
}

// ==================== State Description Helpers ====================

/**
 * Get human-readable description of current state
 */
export function describeAIState(state: AIState): string {
  const { currentState, printStep, scanStep, scanSource, selectedDocuments } = state;

  if (currentState === 'DASHBOARD') {
    return 'Ready for commands. Say "print" or "scan" to begin.';
  }

  if (currentState === 'PRINT_WORKFLOW') {
    const docCount = selectedDocuments.length;
    const docText = docCount > 0 ? `${docCount} document(s) selected. ` : '';
    
    switch (printStep) {
      case 'SELECT_DOCUMENT':
        return `Print Mode: Select documents. ${docText}`;
      case 'CONFIGURATION':
        return `Print Mode: Configure settings. ${docText}`;
      case 'REVIEW':
        return `Print Mode: Review and confirm. ${docText}`;
      case 'EXECUTING':
        return `Print Mode: Printing in progress...`;
    }
  }

  if (currentState === 'SCAN_WORKFLOW') {
    const sourceText = scanSource === 'feed' 
      ? 'Using printer feed tray. ' 
      : scanSource === 'select' 
        ? `${selectedDocuments.length} document(s) selected. `
        : '';

    switch (scanStep) {
      case 'SOURCE_SELECTION':
        return 'Scan Mode: Choose document source - "select documents" or "use feed tray"';
      case 'SELECT_DOCUMENT':
        return `Scan Mode: Select documents. ${sourceText}`;
      case 'CONFIGURATION':
        return `Scan Mode: Configure settings. ${sourceText}`;
      case 'REVIEW':
        return `Scan Mode: Review and confirm. ${sourceText}`;
      case 'EXECUTING':
        return `Scan Mode: Scanning in progress...`;
    }
  }

  return 'Unknown state.';
}

/**
 * Get the valid actions for current state
 */
export function getValidActionsForState(state: AIState): string[] {
  const { currentState, printStep, scanStep } = state;

  if (currentState === 'DASHBOARD') {
    return ['print', 'scan', 'help'];
  }

  if (currentState === 'PRINT_WORKFLOW') {
    switch (printStep) {
      case 'SELECT_DOCUMENT':
        return [
          'select document [number]',
          'select documents 1, 2, 3',
          'select first 2 documents',
          'select all documents',
          'deselect document [number]',
          'next', 'continue', 'cancel',
          'sorry, open scan mode'
        ];
      case 'CONFIGURATION':
        return [
          'set layout portrait/landscape',
          'set color/grayscale/black and white',
          'set paper size A4/Letter',
          'set copies [number]',
          'enable/disable duplex',
          'next', 'back', 'cancel'
        ];
      case 'REVIEW':
        return ['confirm', 'start printing', 'back', 'cancel'];
      case 'EXECUTING':
        return ['status', 'cancel'];
    }
  }

  if (currentState === 'SCAN_WORKFLOW') {
    switch (scanStep) {
      case 'SOURCE_SELECTION':
        return ['select documents', 'upload documents', 'use feed tray', 'cancel'];
      case 'SELECT_DOCUMENT':
        return [
          'select document [number]',
          'select documents 1, 2, 3',
          'next', 'continue', 'cancel',
          'sorry, open print mode'
        ];
      case 'CONFIGURATION':
        return [
          'set layout portrait/landscape',
          'set resolution [dpi]',
          'set color/grayscale',
          'enable/disable OCR',
          'next', 'back', 'cancel'
        ];
      case 'REVIEW':
        return ['confirm', 'start scanning', 'back', 'cancel'];
      case 'EXECUTING':
        return ['status', 'cancel'];
    }
  }

  return [];
}

/**
 * Generate rejection message for invalid mode switch (concise)
 */
export function getModeSwitchRejectionMessage(
  currentState: AppState,
  targetMode: 'print' | 'scan'
): string {
  return `Say "Sorry, ${targetMode}" to switch.`;
}

export default {
  createInitialAIState,
  aiStateReducer,
  isCommandValidForState,
  requiresSorryForSwitch,
  describeAIState,
  getValidActionsForState,
  getModeSwitchRejectionMessage,
};
