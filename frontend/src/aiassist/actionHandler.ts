/**
 * AI Assist Action Handler
 * Executes actions based on parsed commands
 */

import {
  ParsedCommand,
  AIResponse,
  WorkflowContext,
  AIAssistCallbacks,
  DocumentSection,
  PrintSettings,
  ScanSettings,
} from './types';
import AIAssistConfig from './config';
import { applySettingChange, getSettingsSummary } from './settingsHandler';

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
  }

  return {
    text: 'Document command not handled.',
    shouldSpeak: true,
    feedbackType: 'warning',
  };
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
        text: 'Scrolling down.',
        action: 'SCROLL_DOWN',
        shouldSpeak: false,
        feedbackType: 'info',
      };

    case 'SCROLL_UP':
      return {
        text: 'Scrolling up.',
        action: 'SCROLL_UP',
        shouldSpeak: false,
        feedbackType: 'info',
      };

    case 'GO_BACK':
      if (callbacks.onNavigate) {
        callbacks.onNavigate('back');
        return {
          text: 'Going back.',
          action: 'GO_BACK',
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      break;

    case 'GO_NEXT':
    case 'APPLY_SETTINGS':
      return {
        text: 'Applying settings and continuing.',
        action: 'APPLY_SETTINGS',
        shouldSpeak: true,
        feedbackType: 'success',
      };
  }

  return {
    text: 'Navigation command received.',
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
          text: 'No active operation to confirm.',
          shouldSpeak: true,
          feedbackType: 'warning',
        };
      }
      
      if (callbacks.onExecuteAction) {
        callbacks.onExecuteAction(context.mode);
        return {
          text: context.mode === 'print' 
            ? responses.printStarted()
            : responses.scanStarted(),
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
          text: 'No active workflow. Say "print" or "scan" to start.',
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
          text: 'No settings configured yet.',
          action: 'REPEAT_SETTINGS',
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      const summary = getSettingsSummary(context.currentSettings as Partial<PrintSettings & ScanSettings>, context.mode);
      return {
        text: `Current ${context.mode} settings: ${summary}`,
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
        text: 'Stopping voice recording.',
        action: 'STOP_RECORDING',
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }
  }

  return {
    text: 'System command received.',
    shouldSpeak: false,
    feedbackType: 'info',
  };
}

/**
 * Main action handler - routes command to appropriate handler
 */
export function handleCommand(
  command: ParsedCommand,
  context: WorkflowContext,
  callbacks: AIAssistCallbacks
): AIResponse {
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
        text: 'Please start a print or scan workflow first.',
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

export default {
  handleCommand,
  handleDocumentSelection,
  handleNavigation,
  handleWorkflowAction,
  handleSystemCommand,
};
