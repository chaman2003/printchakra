/**
 * AI Assist Context Manager
 * Manages workflow state and context for AI interactions
 * Integrates with state machine for strict state control
 */

import {
  WorkflowContext,
  WorkflowMode,
  DocumentInfo,
  OrchestrateOptions,
  PrintSettings,
  ScanSettings,
  AppState,
  PrintWorkflowStep,
  ScanWorkflowStep,
  ScanDocumentSource,
} from './types';
import { defaultPrintSettings, defaultScanSettings } from './settingsHandler';

/**
 * Create initial workflow context with state machine
 */
export function createInitialContext(): WorkflowContext {
  return {
    mode: null,
    step: 1,
    isModalOpen: false,
    isChatVisible: true, // Chat should always be accessible
    documentsFed: false,
    feedCount: 0,
    selectedDocuments: [],
    currentSettings: {},
    // State machine fields
    appState: 'DASHBOARD',
    printStep: null,
    scanStep: null,
    scanSource: null,
    selectedDocumentIndices: [],
  };
}

/**
 * Update context when workflow mode changes
 * Now also updates the state machine
 */
export function updateContextMode(
  context: WorkflowContext,
  mode: WorkflowMode | null
): WorkflowContext {
  let appState: AppState = 'DASHBOARD';
  let printStep: PrintWorkflowStep | null = null;
  let scanStep: ScanWorkflowStep | null = null;

  if (mode === 'print') {
    appState = 'PRINT_WORKFLOW';
    printStep = 'SELECT_DOCUMENT';
  } else if (mode === 'scan') {
    appState = 'SCAN_WORKFLOW';
    scanStep = 'SOURCE_SELECTION';
  }

  return {
    ...context,
    mode,
    step: mode ? 1 : context.step,
    currentSettings: mode === 'print' 
      ? { ...defaultPrintSettings }
      : mode === 'scan'
        ? { ...defaultScanSettings }
        : {},
    appState,
    printStep,
    scanStep,
    scanSource: mode === 'scan' ? null : context.scanSource,
    selectedDocumentIndices: [],
  };
}

/**
 * Update app state directly
 */
export function updateAppState(
  context: WorkflowContext,
  appState: AppState
): WorkflowContext {
  let mode: WorkflowMode | null = null;
  if (appState === 'PRINT_WORKFLOW') mode = 'print';
  if (appState === 'SCAN_WORKFLOW') mode = 'scan';

  return {
    ...context,
    appState,
    mode,
  };
}

/**
 * Update print workflow step
 */
export function updatePrintStep(
  context: WorkflowContext,
  printStep: PrintWorkflowStep
): WorkflowContext {
  // Map step to legacy step number
  const stepMap: Record<PrintWorkflowStep, number> = {
    'SELECT_DOCUMENT': 1,
    'CONFIGURATION': 2,
    'REVIEW': 3,
    'EXECUTING': 3,
  };

  return {
    ...context,
    printStep,
    step: stepMap[printStep],
    isChatVisible: true, // Always keep chat accessible
  };
}

/**
 * Update scan workflow step
 */
export function updateScanStep(
  context: WorkflowContext,
  scanStep: ScanWorkflowStep
): WorkflowContext {
  // Map step to legacy step number
  const stepMap: Record<ScanWorkflowStep, number> = {
    'SOURCE_SELECTION': 1,
    'SELECT_DOCUMENT': 1,
    'CONFIGURATION': 2,
    'REVIEW': 3,
    'EXECUTING': 3,
  };

  return {
    ...context,
    scanStep,
    step: stepMap[scanStep],
    isChatVisible: true, // Always keep chat accessible
  };
}

/**
 * Update scan document source
 */
export function updateScanSource(
  context: WorkflowContext,
  scanSource: ScanDocumentSource
): WorkflowContext {
  // Auto-advance to next step based on source
  const nextStep: ScanWorkflowStep = scanSource === 'feed' 
    ? 'CONFIGURATION' 
    : 'SELECT_DOCUMENT';

  return {
    ...context,
    scanSource,
    scanStep: nextStep,
  };
}

/**
 * Update selected document indices
 */
export function updateSelectedDocumentIndices(
  context: WorkflowContext,
  indices: number[]
): WorkflowContext {
  return {
    ...context,
    selectedDocumentIndices: indices,
  };
}

/**
 * Update context when step changes
 */
export function updateContextStep(
  context: WorkflowContext,
  step: number
): WorkflowContext {
  return {
    ...context,
    step: Math.max(1, Math.min(3, step)),
  };
}

/**
 * Update context when documents are selected
 */
export function updateContextDocuments(
  context: WorkflowContext,
  documents: DocumentInfo[]
): WorkflowContext {
  return {
    ...context,
    selectedDocuments: documents,
  };
}

/**
 * Update context when settings change
 */
export function updateContextSettings(
  context: WorkflowContext,
  settings: Partial<PrintSettings | ScanSettings>
): WorkflowContext {
  return {
    ...context,
    currentSettings: {
      ...context.currentSettings,
      ...settings,
    },
  };
}

/**
 * Update context when documents are fed
 */
export function updateContextFeed(
  context: WorkflowContext,
  fed: boolean,
  count: number
): WorkflowContext {
  return {
    ...context,
    documentsFed: fed,
    feedCount: count,
  };
}

/**
 * Update modal visibility state
 */
export function updateContextModalState(
  context: WorkflowContext,
  isModalOpen: boolean,
  isChatVisible: boolean
): WorkflowContext {
  return {
    ...context,
    isModalOpen,
    isChatVisible,
  };
}

/**
 * Get a human-readable description of the current context
 */
export function describeContext(context: WorkflowContext): string {
  const parts: string[] = [];

  if (!context.mode) {
    return 'No active workflow. Ready to print or scan.';
  }

  parts.push(`${context.mode.charAt(0).toUpperCase() + context.mode.slice(1)} workflow active`);
  parts.push(`Step ${context.step} of 3`);

  if (context.selectedDocuments.length > 0) {
    parts.push(`${context.selectedDocuments.length} document${context.selectedDocuments.length > 1 ? 's' : ''} selected`);
  }

  if (context.documentsFed) {
    parts.push(`${context.feedCount} page${context.feedCount > 1 ? 's' : ''} fed`);
  }

  return parts.join('. ');
}

/**
 * Check if context is ready for execution
 */
export function isReadyForExecution(context: WorkflowContext): {
  ready: boolean;
  reason?: string;
} {
  if (!context.mode) {
    return { ready: false, reason: 'No workflow mode selected' };
  }

  // Use state machine to check readiness
  if (context.appState === 'PRINT_WORKFLOW') {
    if (context.printStep !== 'REVIEW' && context.printStep !== 'EXECUTING') {
      return { ready: false, reason: 'Please complete all configuration steps' };
    }
    if (context.selectedDocuments.length === 0 && context.selectedDocumentIndices.length === 0) {
      return { ready: false, reason: 'No documents selected for printing' };
    }
  }

  if (context.appState === 'SCAN_WORKFLOW') {
    if (context.scanStep !== 'REVIEW' && context.scanStep !== 'EXECUTING') {
      return { ready: false, reason: 'Please complete all configuration steps' };
    }
    if (context.scanSource === 'select' && 
        context.selectedDocuments.length === 0 && 
        context.selectedDocumentIndices.length === 0) {
      return { ready: false, reason: 'No documents selected for scanning' };
    }
    if (context.scanSource === 'feed' && !context.documentsFed) {
      return { ready: false, reason: 'Please feed documents through the printer first' };
    }
  }

  // Legacy check
  if (context.step < 3) {
    return { ready: false, reason: 'Please complete all configuration steps' };
  }

  if (context.mode === 'print' && context.selectedDocuments.length === 0) {
    return { ready: false, reason: 'No documents selected for printing' };
  }

  if (context.mode === 'scan' && !context.documentsFed) {
    return { ready: false, reason: 'Please feed documents through the printer first' };
  }

  return { ready: true };
}

/**
 * Reset context to initial state
 */
export function resetContext(): WorkflowContext {
  return createInitialContext();
}

/**
 * Serialize context for storage/transmission
 */
export function serializeContext(context: WorkflowContext): string {
  return JSON.stringify(context);
}

/**
 * Deserialize context from storage
 */
export function deserializeContext(json: string): WorkflowContext {
  try {
    const parsed = JSON.parse(json);
    return {
      mode: parsed.mode || null,
      step: parsed.step || 1,
      isModalOpen: parsed.isModalOpen || false,
      isChatVisible: parsed.isChatVisible ?? true, // Default to true for accessibility
      documentsFed: parsed.documentsFed || false,
      feedCount: parsed.feedCount || 0,
      selectedDocuments: parsed.selectedDocuments || [],
      currentSettings: parsed.currentSettings || {},
      appState: parsed.appState || 'DASHBOARD',
      printStep: parsed.printStep || null,
      scanStep: parsed.scanStep || null,
      scanSource: parsed.scanSource || null,
      selectedDocumentIndices: parsed.selectedDocumentIndices || [],
    };
  } catch {
    return createInitialContext();
  }
}

/**
 * Build context summary for AI system prompt
 * Enhanced with state machine info
 */
export function buildContextSummary(context: WorkflowContext): string {
  const lines: string[] = [
    '=== CURRENT WORKFLOW STATE ===',
  ];

  // Add state machine state
  lines.push(`App State: ${context.appState}`);

  if (context.appState === 'PRINT_WORKFLOW') {
    lines.push(`Mode: PRINT`);
    lines.push(`Step: ${context.printStep || 'unknown'}`);
    
    if (context.selectedDocumentIndices.length > 0) {
      lines.push(`Documents Selected: ${context.selectedDocumentIndices.length}`);
    }
    if (context.selectedDocuments.length > 0) {
      lines.push(`Documents: ${context.selectedDocuments.map(d => d.filename).join(', ')}`);
    }

    // Add current settings
    const settings = context.currentSettings as PrintSettings;
    if (Object.keys(settings).length > 0) {
      lines.push('Settings:');
      if (settings.layout) lines.push(`  - Layout: ${settings.layout}`);
      if (settings.paperSize) lines.push(`  - Paper: ${settings.paperSize}`);
      if (settings.colorMode) lines.push(`  - Color: ${settings.colorMode}`);
      if (settings.copies && settings.copies !== '1') lines.push(`  - Copies: ${settings.copies}`);
      if (settings.scale && settings.scale !== '100') lines.push(`  - Scale: ${settings.scale}%`);
    }
  } else if (context.appState === 'SCAN_WORKFLOW') {
    lines.push(`Mode: SCAN`);
    lines.push(`Step: ${context.scanStep || 'unknown'}`);
    lines.push(`Source: ${context.scanSource || 'not selected'}`);
    
    if (context.scanSource === 'feed' && context.documentsFed) {
      lines.push(`Fed: ${context.feedCount} page(s)`);
    }
    if (context.selectedDocumentIndices.length > 0) {
      lines.push(`Documents Selected: ${context.selectedDocumentIndices.length}`);
    }

    // Add current settings
    const settings = context.currentSettings as ScanSettings;
    if (Object.keys(settings).length > 0) {
      lines.push('Settings:');
      if (settings.layout) lines.push(`  - Layout: ${settings.layout}`);
      if (settings.resolution) lines.push(`  - Resolution: ${settings.resolution} DPI`);
      if (settings.colorMode) lines.push(`  - Color: ${settings.colorMode}`);
      if (settings.textMode) lines.push(`  - OCR: enabled`);
    }
  } else {
    lines.push('No active workflow');
    lines.push('Ready to start print or scan operation');
    lines.push('Say "print" or "scan" to begin.');
  }

  lines.push(`Chat Accessible: ${context.isChatVisible ? 'Yes' : 'No'}`);
  lines.push('=============================');
  
  return lines.join('\n');
}

export default {
  createInitialContext,
  updateContextMode,
  updateAppState,
  updatePrintStep,
  updateScanStep,
  updateScanSource,
  updateSelectedDocumentIndices,
  updateContextStep,
  updateContextDocuments,
  updateContextSettings,
  updateContextFeed,
  updateContextModalState,
  describeContext,
  isReadyForExecution,
  resetContext,
  serializeContext,
  deserializeContext,
  buildContextSummary,
};
