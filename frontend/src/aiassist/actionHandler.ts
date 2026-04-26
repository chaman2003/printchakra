/**
 * AI Assist Action Handler
 * Executes actions based on parsed commands with state machine integration
 */

import {
  ParsedCommand,
  AIResponse,
  WorkflowContext,
  AIAssistCallbacks,
  PrintSettings,
  ScanSettings,
} from './types';
import AIAssistConfig from './config';
import { applySettingChange } from './settingsHandler';
import { enforceWordLimit } from './wordLimiter';
import {
  handleDocumentSelection,
  handleModeSwitch,
  handleScanSourceSelection,
  handleNavigation,
} from './actionHandlersPrimary';
import {
  handleWorkflowAction,
  handleSystemCommand,
} from './actionHandlersWorkflow';

const responses = AIAssistConfig.responses;

/**
 * Helper function to create AI responses with enforced 20-word limit
 */
function createAIResponse(
  text: string,
  action?: string,
  params?: Record<string, any>,
  shouldSpeak: boolean = true,
  feedbackType: 'success' | 'info' | 'warning' | 'error' = 'info',
  stateUpdate?: AIResponse['stateUpdate']
): AIResponse {
  return {
    text: enforceWordLimit(text, `[${action || 'AI_RESPONSE'}]`),
    action: action as any,
    params,
    shouldSpeak,
    feedbackType,
    stateUpdate,
  };
}

export {
  handleDocumentSelection,
  handleModeSwitch,
  handleScanSourceSelection,
  handleNavigation,
  handleWorkflowAction,
  handleSystemCommand,
};

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
      return createAIResponse(
        'I\'m ready to help you print or scan. Say "print" to start printing or "scan" to start scanning.',
        'DASHBOARD_GUIDANCE',
        undefined,
        true,
        'info'
      );
    }
  }

  // Validate command for current state
  if (command.stateValidation && !command.stateValidation.valid) {
    return createAIResponse(
      command.stateValidation.reason || 'This action is not available right now.',
      'STATE_VALIDATION_ERROR',
      undefined,
      true,
      'warning'
    );
  }

  // Call handleCommand and wrap response with word limit enforcement
  const response = handleCommand(command, context, callbacks);
  return {
    ...response,
    text: enforceWordLimit(response.text, `[${command.action}]`),
  };
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
