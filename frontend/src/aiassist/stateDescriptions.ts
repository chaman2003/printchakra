import type {
  AppState,
  PrintWorkflowStep,
  ScanDocumentSource,
  ScanWorkflowStep,
} from './types';

type AIStateLike = {
  currentState: AppState;
  printStep: PrintWorkflowStep | null;
  scanStep: ScanWorkflowStep | null;
  scanSource: ScanDocumentSource;
  selectedDocuments: string[];
};

/**
 * Get human-readable description of current state.
 */
export function describeAIState(state: AIStateLike): string {
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
        return 'Print Mode: Printing in progress...';
    }
  }

  if (currentState === 'SCAN_WORKFLOW') {
    const sourceText =
      scanSource === 'feed'
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
        return 'Scan Mode: Scanning in progress...';
    }
  }

  return 'Unknown state.';
}

/**
 * Get the valid actions for current state.
 */
export function getValidActionsForState(state: AIStateLike): string[] {
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
          'next',
          'continue',
          'cancel',
          'sorry, open scan mode',
        ];
      case 'CONFIGURATION':
        return [
          'set layout portrait/landscape',
          'set color/grayscale/black and white',
          'set paper size A4/Letter',
          'set copies [number]',
          'enable/disable duplex',
          'next',
          'back',
          'cancel',
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
          'next',
          'continue',
          'cancel',
          'sorry, open print mode',
        ];
      case 'CONFIGURATION':
        return [
          'set layout portrait/landscape',
          'set resolution [dpi]',
          'set color/grayscale',
          'enable/disable OCR',
          'next',
          'back',
          'cancel',
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
 * Generate rejection message for invalid mode switch.
 */
export function getModeSwitchRejectionMessage(
  currentState: AppState,
  targetMode: 'print' | 'scan'
): string {
  void currentState;
  return `Say "Sorry, ${targetMode}" to switch.`;
}
