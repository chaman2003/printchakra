import {
  ParsedCommand,
  AIResponse,
  WorkflowContext,
  AIAssistCallbacks,
  DocumentSection,
} from './types';
import AIAssistConfig from './config';
import {
  getModeSwitchRejectionMessage,
} from './stateManager';

const responses = AIAssistConfig.responses;

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
      callbacks.onShowToast?.('Upload', 'Opening file upload...', 'info');
      return {
        text: 'Opening upload dialog.',
        action: command.action,
        shouldSpeak: true,
        feedbackType: 'info',
      };
    }

    case 'SELECT_MULTIPLE_DOCUMENTS': {
      const indices = (params?.indices as number[]) || [];
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
      const indices = (params?.indices as number[]) || [];
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
      }

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

  return {
    text: 'Mode switch not handled.',
    shouldSpeak: true,
    feedbackType: 'warning',
  };
}

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
  }

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
