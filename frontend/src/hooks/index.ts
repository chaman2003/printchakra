/**
 * Custom hooks index
 * Exports all custom hooks from the hooks directory
 */

export { useVoiceCommandBridge } from './useVoiceCommandBridge';
export type {
  VoiceCommandPayload,
  OrchestrateOptions,
  UseVoiceCommandBridgeOptions,
  UseVoiceCommandBridgeReturn,
} from './useVoiceCommandBridge';

// Unified voice input hook - RECOMMENDED for new implementations
export { useUnifiedVoiceInput } from './useUnifiedVoiceInput';
export type {
  UnifiedVoiceInputOptions,
  UnifiedVoiceInputReturn,
} from './useUnifiedVoiceInput';
