/**
 * AI Assist Context Manager
 * Manages workflow state and context for AI interactions
 */

import {
  WorkflowContext,
  WorkflowMode,
  DocumentInfo,
  OrchestrateOptions,
  PrintSettings,
  ScanSettings,
} from './types';
import { defaultPrintSettings, defaultScanSettings } from './settingsHandler';

/**
 * Create initial workflow context
 */
export function createInitialContext(): WorkflowContext {
  return {
    mode: null,
    step: 1,
    isModalOpen: false,
    isChatVisible: false,
    documentsFed: false,
    feedCount: 0,
    selectedDocuments: [],
    currentSettings: {},
  };
}

/**
 * Update context when workflow mode changes
 */
export function updateContextMode(
  context: WorkflowContext,
  mode: WorkflowMode | null
): WorkflowContext {
  return {
    ...context,
    mode,
    step: mode ? 1 : context.step,
    currentSettings: mode === 'print' 
      ? { ...defaultPrintSettings }
      : mode === 'scan'
        ? { ...defaultScanSettings }
        : {},
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
      isChatVisible: parsed.isChatVisible || false,
      documentsFed: parsed.documentsFed || false,
      feedCount: parsed.feedCount || 0,
      selectedDocuments: parsed.selectedDocuments || [],
      currentSettings: parsed.currentSettings || {},
    };
  } catch {
    return createInitialContext();
  }
}

/**
 * Build context summary for AI system prompt
 */
export function buildContextSummary(context: WorkflowContext): string {
  const lines: string[] = [
    '=== CURRENT WORKFLOW STATE ===',
  ];

  if (context.mode) {
    lines.push(`Mode: ${context.mode.toUpperCase()}`);
    lines.push(`Step: ${context.step}/3`);
    
    if (context.selectedDocuments.length > 0) {
      lines.push(`Documents: ${context.selectedDocuments.map(d => d.filename).join(', ')}`);
    }

    if (context.mode === 'scan' && context.documentsFed) {
      lines.push(`Fed: ${context.feedCount} page(s)`);
    }

    // Add current settings
    const settings = context.currentSettings;
    if (Object.keys(settings).length > 0) {
      lines.push('Settings:');
      if (context.mode === 'print') {
        const ps = settings as PrintSettings;
        if (ps.layout) lines.push(`  - Layout: ${ps.layout}`);
        if (ps.paperSize) lines.push(`  - Paper: ${ps.paperSize}`);
        if (ps.colorMode) lines.push(`  - Color: ${ps.colorMode}`);
        if (ps.copies && ps.copies !== '1') lines.push(`  - Copies: ${ps.copies}`);
        if (ps.scale && ps.scale !== '100') lines.push(`  - Scale: ${ps.scale}%`);
      } else {
        const ss = settings as ScanSettings;
        if (ss.layout) lines.push(`  - Layout: ${ss.layout}`);
        if (ss.resolution) lines.push(`  - Resolution: ${ss.resolution} DPI`);
        if (ss.colorMode) lines.push(`  - Color: ${ss.colorMode}`);
        if (ss.textMode) lines.push(`  - OCR: enabled`);
      }
    }
  } else {
    lines.push('No active workflow');
    lines.push('Ready to start print or scan operation');
  }

  lines.push('=============================');
  
  return lines.join('\n');
}

export default {
  createInitialContext,
  updateContextMode,
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
