/**
 * AI Assist Module - Centralized voice command and AI control system
 * 
 * This module provides:
 * - Voice command parsing and execution
 * - Settings management for print/scan workflows
 * - Action handlers for document operations
 * - Context-aware responses
 * - State machine for strict workflow control
 * - Natural language document selection
 * 
 * Usage:
 * ```tsx
 * import { useAIAssist, parseCommand, AIAssistConfig } from '../aiassist';
 * 
 * // In your component
 * const { processInputWithState, context, setMode } = useAIAssist({
 *   onSettingsChange: (settings) => updateOrchestrateOptions(settings),
 *   onExecute: (action) => handleExecution(action),
 *   onStateChange: (state, step) => handleStateChange(state, step),
 * });
 * 
 * // Process voice/text input with state awareness
 * const response = processInputWithState("set layout to landscape");
 * ```
 */

// Core types
export * from './types';

// Command parsing
export * from './commandParser';
export type { StateAwareParseContext } from './commandParser';

// Settings handling
export * from './settingsHandler';

// Action handling
export * from './actionHandler';

// Context management
export * from './contextManager';

// State machine
export * from './stateManager';

// Document selection parsing
export * from './documentSelectionParser';

// Word limiter utility
export * from './wordLimiter';

// Configuration
export { default as AIAssistConfig } from './config';

// Main hook
export { useAIAssist } from './useAIAssist';
export type { UseAIAssistOptions, UseAIAssistReturn } from './useAIAssist';
