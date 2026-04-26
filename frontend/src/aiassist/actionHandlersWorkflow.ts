import {
  ParsedCommand,
  AIResponse,
  WorkflowContext,
  AIAssistCallbacks,
  PrintSettings,
  ScanSettings,
} from './types';
import AIAssistConfig from './config';
import { getSettingsSummary } from './settingsHandler';

const responses = AIAssistConfig.responses;

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
      const summary = getSettingsSummary(
        context.currentSettings as Partial<PrintSettings & ScanSettings>,
        context.mode
      );
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
