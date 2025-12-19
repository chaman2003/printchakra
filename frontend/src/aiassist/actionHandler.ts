/**
 * AI Assist Action Handler
 * Executes actions based on parsed commands with state machine integration
 */

import {
  ParsedCommand,
  AIResponse,
  WorkflowContext,
  AIAssistCallbacks,
  DocumentSection,
  PrintSettings,
  ScanSettings,
  AppState,
} from './types';
import AIAssistConfig from './config';
import { applySettingChange, getSettingsSummary } from './settingsHandler';
import {
  describeAIState,
  getValidActionsForState,
  getModeSwitchRejectionMessage,
  AIState,
} from './stateManager';
import {
  applyDocumentSelection,
  describeSelectionAction,
  DocumentSelectionCommand,
} from './documentSelectionParser';

const responses = AIAssistConfig.responses;

/**
 * Handle document selection commands
 */
export function handleDocumentSelection(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  const { params } = command;

  switch (command.action) {
    case 'SELECT_DOCUMENT': {
      const docNum = params?.documentNumber;
      const section = (params?.section || 'current') as DocumentSection;
      
      if (docNum && callbacks.onSelectDocument) {
        callbacks.onSelectDocument(docNum, section);
        return {
          text: responses.documentSelected(docNum, section),
          action: command.action,
          params: { documentNumber: docNum, section },
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      
      return {
        text: 'Please specify which document number to select.',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'SWITCH_SECTION': {
      const section = params?.section as DocumentSection;
      if (section && callbacks.onSwitchSection) {
        callbacks.onSwitchSection(section);
        return {
          text: responses.sectionSwitched(section),
          action: command.action,
          params: { section },
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      return {
        text: 'Section not found.',
        shouldSpeak: true,
        feedbackType: 'warning',
      };
    }

    case 'NEXT_DOCUMENT': {
      if (callbacks.onNavigate) {
        callbacks.onNavigate('next');
        return {
          text: 'Moving to next document.',
          action: command.action,
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      break;
    }

    case 'PREV_DOCUMENT': {
      if (callbacks.onNavigate) {
        callbacks.onNavigate('prev');
        return {
          text: 'Moving to previous document.',
          action: command.action,
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      break;
    }

    case 'UPLOAD_DOCUMENT': {
      // Trigger upload modal/dialog
      callbacks.onShowToast?.('Upload', 'Opening file upload...', 'info');
      return {
        text: 'Opening upload dialog.',
        action: command.action,
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'SELECT_MULTIPLE_DOCUMENTS': {
      const indices = params?.indices as number[] || [];
      const section = (params?.section || 'current') as DocumentSection;
      
      if (indices.length > 0 && callbacks.onSelectMultipleDocuments) {
        callbacks.onSelectMultipleDocuments(indices, section);
        const description = indices.length === 1
          ? `Selected document ${indices[0] + 1}`
          : `Selected ${indices.length} documents`;
        return {
          text: description,
          action: command.action,
          params: { indices, section },
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      return {
        text: 'Please specify which documents to select.',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'DESELECT_DOCUMENT': {
      const indices = params?.indices as number[] || [];
      const section = (params?.section || 'current') as DocumentSection;
      
      if (indices.length > 0 && callbacks.onDeselectDocument) {
        indices.forEach(idx => callbacks.onDeselectDocument!(idx, section));
        const description = indices.length === 1
          ? `Deselected document ${indices[0] + 1}`
          : `Deselected ${indices.length} documents`;
        return {
          text: description,
          action: command.action,
          params: { indices, section },
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      return {
        text: 'Please specify which document to deselect.',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'CLEAR_DOCUMENT_SELECTION': {
      if (callbacks.onClearDocumentSelection) {
        callbacks.onClearDocumentSelection();
        return {
          text: 'Cleared all document selections.',
          action: command.action,
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      break;
    }
  }

  return {
    text: 'Document command not handled.',
    shouldSpeak: true,
    feedbackType: 'warning',
  };
}

/**
 * Handle mode switching commands with state validation
 */
export function handleModeSwitch(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  const { params, stateValidation } = command;
  const { appState } = context;

  switch (command.action) {
    case 'OPEN_PRINT_MODE': {
      if (appState === 'SCAN_WORKFLOW') {
        // Rejected - should have used REQUEST_MODE_SWITCH with sorry
        return {
          text: getModeSwitchRejectionMessage(appState, 'print'),
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      
      if (callbacks.onModeSwitch) {
        callbacks.onModeSwitch('print', false);
      }
      if (callbacks.onStateChange) {
        callbacks.onStateChange('PRINT_WORKFLOW', 'SELECT_DOCUMENT');
      }
      
      return {
        text: 'Print mode. Select documents.',
        action: command.action,
        shouldSpeak: true,
        feedbackType: 'success',
        stateUpdate: {
          newState: 'PRINT_WORKFLOW',
          newStep: 'SELECT_DOCUMENT',
        },
      };
    }

    case 'OPEN_SCAN_MODE': {
      if (appState === 'PRINT_WORKFLOW') {
        // Rejected - should have used REQUEST_MODE_SWITCH with sorry
        return {
          text: getModeSwitchRejectionMessage(appState, 'scan'),
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      
      if (callbacks.onModeSwitch) {
        callbacks.onModeSwitch('scan', false);
      }
      if (callbacks.onStateChange) {
        callbacks.onStateChange('SCAN_WORKFLOW', 'SOURCE_SELECTION');
      }
      
      return {
        text: 'Scan mode. Select documents or use feed tray?',
        action: command.action,
        shouldSpeak: true,
        feedbackType: 'success',
        stateUpdate: {
          newState: 'SCAN_WORKFLOW',
          newStep: 'SOURCE_SELECTION',
        },
      };
    }

    case 'REQUEST_MODE_SWITCH': {
      const targetMode = params?.targetMode as 'print' | 'scan';
      const hasSorry = params?.hasSorry as boolean;
      
      // Check if state validation passed
      if (stateValidation && !stateValidation.valid) {
        return {
          text: stateValidation.reason || `Say "Sorry, ${targetMode}" to switch.`,
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      
      if (!hasSorry) {
        return {
          text: `Say "Sorry, ${targetMode}" to switch.`,
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      
      // Perform the switch
      if (callbacks.onModeSwitch) {
        callbacks.onModeSwitch(targetMode, true);
      }
      
      if (targetMode === 'print') {
        if (callbacks.onStateChange) {
          callbacks.onStateChange('PRINT_WORKFLOW', 'SELECT_DOCUMENT');
        }
        return {
          text: 'Switched to print. Select documents.',
          action: command.action,
          shouldSpeak: true,
          feedbackType: 'success',
          stateUpdate: {
            newState: 'PRINT_WORKFLOW',
            newStep: 'SELECT_DOCUMENT',
          },
        };
      } else {
        if (callbacks.onStateChange) {
          callbacks.onStateChange('SCAN_WORKFLOW', 'SOURCE_SELECTION');
        }
        return {
          text: 'Switched to scan. Documents or feed tray?',
          action: command.action,
          shouldSpeak: true,
          feedbackType: 'success',
          stateUpdate: {
            newState: 'SCAN_WORKFLOW',
            newStep: 'SOURCE_SELECTION',
          },
        };
      }
    }
  }

  return {
    text: 'Mode switch not handled.',
    shouldSpeak: true,
    feedbackType: 'warning',
  };
}

/**
 * Handle scan source selection
 */
export function handleScanSourceSelection(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  const { params } = command;
  const source = params?.source as 'feed' | 'select';

  if (context.appState !== 'SCAN_WORKFLOW') {
    return {
      text: 'Open scan mode first.',
      shouldSpeak: true,
      feedbackType: 'warning',
    };
  }

  if (callbacks.onSetScanSource) {
    callbacks.onSetScanSource(source);
  }

  if (source === 'feed') {
    if (callbacks.onStateChange) {
      callbacks.onStateChange('SCAN_WORKFLOW', 'CONFIGURATION');
    }
    return {
      text: 'Feed tray. Configure settings.',
      action: 'SET_SCAN_SOURCE',
      params: { source },
      shouldSpeak: true,
      feedbackType: 'success',
      stateUpdate: {
        newState: 'SCAN_WORKFLOW',
        newStep: 'CONFIGURATION',
      },
    };
  } else {
    if (callbacks.onStateChange) {
      callbacks.onStateChange('SCAN_WORKFLOW', 'SELECT_DOCUMENT');
    }
    return {
      text: 'Select your documents.',
      action: 'SET_SCAN_SOURCE',
      params: { source },
      shouldSpeak: true,
      feedbackType: 'success',
      stateUpdate: {
        newState: 'SCAN_WORKFLOW',
        newStep: 'SELECT_DOCUMENT',
      },
    };
  }
}

/**
 * Handle navigation commands
 */
export function handleNavigation(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  switch (command.action) {
    case 'SCROLL_DOWN':
      return {
        text: 'Down.',
        action: 'SCROLL_DOWN',
        shouldSpeak: false,
        feedbackType: 'info',
      };

    case 'SCROLL_UP':
      return {
        text: 'Up.',
        action: 'SCROLL_UP',
        shouldSpeak: false,
        feedbackType: 'info',
      };

    case 'GO_BACK':
      if (callbacks.onNavigate) {
        callbacks.onNavigate('back');
        return {
          text: 'Back.',
          action: 'GO_BACK',
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      break;

    case 'GO_NEXT':
    case 'APPLY_SETTINGS':
      return {
        text: 'Applied.',
        action: 'APPLY_SETTINGS',
        shouldSpeak: true,
        feedbackType: 'success',
      };
  }

  return {
    text: 'Ok.',
    shouldSpeak: false,
    feedbackType: 'info',
  };
}

/**
 * Handle workflow action commands
 */
export function handleWorkflowAction(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  switch (command.action) {
    case 'CONFIRM': {
      if (!context.mode) {
        return {
          text: 'Nothing to confirm.',
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      
      if (callbacks.onExecuteAction) {
        callbacks.onExecuteAction(context.mode);
        return {
          text: responses.printStarted(),
          action: 'CONFIRM',
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      break;
    }

    case 'CANCEL': {
      if (callbacks.onExecuteAction) {
        callbacks.onExecuteAction('cancel');
        return {
          text: responses.cancelled(),
          action: 'CANCEL',
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      break;
    }

    case 'FEED_DOCUMENTS': {
      const count = command.params?.count || 1;
      if (callbacks.onFeedDocuments) {
        callbacks.onFeedDocuments(count);
        return {
          text: responses.feedingStarted(count),
          action: 'FEED_DOCUMENTS',
          params: { count },
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      break;
    }

    case 'START_PRINT': {
      if (callbacks.onExecuteAction) {
        callbacks.onExecuteAction('print');
        return {
          text: responses.printStarted(),
          action: 'START_PRINT',
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      break;
    }

    case 'START_SCAN': {
      if (callbacks.onExecuteAction) {
        callbacks.onExecuteAction('scan');
        return {
          text: responses.scanStarted(),
          action: 'START_SCAN',
          shouldSpeak: true,
          feedbackType: 'success',
        };
      }
      break;
    }
  }

  return {
    text: 'Action received.',
    shouldSpeak: false,
    feedbackType: 'info',
  };
}

/**
 * Handle system commands (status, help, etc.)
 */
export function handleSystemCommand(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  switch (command.action) {
    case 'STATUS': {
      if (!context.mode) {
        return {
          text: 'Ready. Say print or scan.',
          action: 'STATUS',
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      return {
        text: responses.statusReport(context.mode, context.step),
        action: 'STATUS',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'REPEAT_SETTINGS': {
      if (!context.mode || !context.currentSettings) {
        return {
          text: 'No settings yet.',
          action: 'REPEAT_SETTINGS',
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      const summary = getSettingsSummary(context.currentSettings as Partial<PrintSettings & ScanSettings>, context.mode);
      return {
        text: summary,
        action: 'REPEAT_SETTINGS',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'HELP': {
      return {
        text: responses.helpMessage(),
        action: 'HELP',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'STOP_RECORDING': {
      return {
        text: 'Stopping.',
        action: 'STOP_RECORDING',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }
  }

  return {
    text: 'Ok.',
    shouldSpeak: false,
    feedbackType: 'info',
  };
}

/**
 * Main action handler - routes command to appropriate handler
 * Integrates state machine validation
 */
export function handleCommand(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  // Check state validation first
  if (command.stateValidation && !command.stateValidation.valid) {
    return {
      text: command.stateValidation.reason || 'This command is not available in the current state.',
      shouldSpeak: true,
      feedbackType: 'warning',
    };
  }

  // Handle mode switching commands
  if (command.action === 'OPEN_PRINT_MODE' || 
      command.action === 'OPEN_SCAN_MODE' || 
      command.action === 'REQUEST_MODE_SWITCH') {
    return handleModeSwitch(command, context, callbacks);
  }

  // Handle scan source selection
  if (command.action === 'SET_SCAN_SOURCE') {
    return handleScanSourceSelection(command, context, callbacks);
  }

  // Route based on command category
  switch (command.category) {
    case 'document_selection':
      return handleDocumentSelection(command, context, callbacks);

    case 'settings_change':
      if (context.mode) {
        const result = applySettingChange(
          command,
          (context.currentSettings || {}) as Partial<PrintSettings & ScanSettings>,
          context.mode
        );
        if (callbacks.onUpdateSettings) {
          callbacks.onUpdateSettings(result.settings);
        }
        return result.response;
      }
      return {
        text: 'Say print or scan first.',
        shouldSpeak: true,
        feedbackType: 'warning',
      };

    case 'navigation':
      return handleNavigation(command, context, callbacks);

    case 'workflow_action':
      return handleWorkflowAction(command, context, callbacks);

    case 'confirmation':
      return handleWorkflowAction(command, context, callbacks);

    case 'system':
      return handleSystemCommand(command, context, callbacks);

    default:
      return {
        text: responses.invalidCommand(),
        shouldSpeak: true,
        feedbackType: 'warning',
      };
  }
}

/**
 * State-aware command handler with full context
 */
export function handleCommandWithState(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
  const { appState, printStep, scanStep } = context;

  // In Dashboard state, only allow mode commands
  if (appState === 'DASHBOARD') {
    const allowedActions = ['OPEN_PRINT_MODE', 'OPEN_SCAN_MODE', 'HELP', 'STATUS'];
    if (!allowedActions.includes(command.action)) {
      return {
        text: 'I\'m ready to help you print or scan. Say "print" to start printing or "scan" to start scanning.',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }
  }

  // Validate command for current state
  if (command.stateValidation && !command.stateValidation.valid) {
    return {
      text: command.stateValidation.reason || 'This action is not available right now.',
      shouldSpeak: true,
      feedbackType: 'warning',
    };
  }

  return handleCommand(command, context, callbacks);
}

export default {
  handleCommand,
  handleCommandWithState,
  handleDocumentSelection,
  handleModeSwitch,
  handleScanSourceSelection,
  handleNavigation,
  handleWorkflowAction,
  handleSystemCommand,
};
