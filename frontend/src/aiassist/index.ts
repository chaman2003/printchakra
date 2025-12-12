/**
 * AI Assist Module - Centralized voice command and AI control system
 * 
 * This module provides:
 * - Voice command parsing and execution
 * - Settings management for print/scan workflows
 * - Action handlers for document operations
 * - Context-aware responses
 * 
 * Usage:
 * ```tsx
 * import { useAIAssist, parseCommand, AIAssistConfig } from '../aiassist';
 * 
 * // In your component
 * const { processInput, context, setMode } = useAIAssist({
 *   onSettingsChange: (settings) => updateOrchestrateOptions(settings),
 *   onExecute: (action) => handleExecution(action),
 * });
 * 
 * // Process voice/text input
 * const response = processInput("set layout to landscape");
 * ```
 */

export * from './types';
export * from './commandParser';
export * from './settingsHandler';
export * from './actionHandler';
export * from './contextManager';
export { default as AIAssistConfig } from './config';
export { useAIAssist } from './useAIAssist';
export type { UseAIAssistOptions, UseAIAssistReturn } from './useAIAssist';
