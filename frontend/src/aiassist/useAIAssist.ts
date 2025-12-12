/**
 * useAIAssist Hook
 * React hook for integrating AI assist functionality into components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  WorkflowContext,
  WorkflowMode,
  DocumentInfo,
  AIAssistCallbacks,
  ParsedCommand,
  AIResponse,
  DocumentSection,
  PrintSettings,
  ScanSettings,
} from './types';
import { parseCommand, parseCommandWithContext } from './commandParser';
import { handleCommand } from './actionHandler';
import {
  createInitialContext,
  updateContextMode,
  updateContextStep,
  updateContextDocuments,
  updateContextSettings,
  updateContextFeed,
  updateContextModalState,
  describeContext,
  isReadyForExecution,
  buildContextSummary,
} from './contextManager';

export interface UseAIAssistOptions {
  initialMode?: WorkflowMode | null;
  onSettingsChange?: (settings: Partial<PrintSettings | ScanSettings>) => void;
  onDocumentSelect?: (index: number, section: DocumentSection) => void;
  onSectionSwitch?: (section: DocumentSection) => void;
  onNavigate?: (direction: 'next' | 'prev' | 'back') => void;
  onExecute?: (action: 'print' | 'scan' | 'cancel' | 'confirm') => void;
  onFeedDocuments?: (count: number) => void;
  onToast?: (title: string, description: string, status: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface UseAIAssistReturn {
  // State
  context: WorkflowContext;
  lastCommand: ParsedCommand | null;
  lastResponse: AIResponse | null;
  
  // Actions
  processInput: (text: string) => AIResponse;
  setMode: (mode: WorkflowMode | null) => void;
  setStep: (step: number) => void;
  setDocuments: (documents: DocumentInfo[]) => void;
  setSettings: (settings: Partial<PrintSettings | ScanSettings>) => void;
  setFeedStatus: (fed: boolean, count: number) => void;
  setModalState: (isOpen: boolean, chatVisible: boolean) => void;
  
  // Utilities
  getContextDescription: () => string;
  getContextSummary: () => string;
  isReady: () => { ready: boolean; reason?: string };
  reset: () => void;
}

export function useAIAssist(options: UseAIAssistOptions = {}): UseAIAssistReturn {
  const [context, setContext] = useState<WorkflowContext>(() => 
    createInitialContext()
  );
  const [lastCommand, setLastCommand] = useState<ParsedCommand | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  
  // Stable callback refs
  const callbacksRef = useRef<AIAssistCallbacks>({});
  
  // Update callbacks ref when options change
  useEffect(() => {
    callbacksRef.current = {
      onSelectDocument: options.onDocumentSelect,
      onSwitchSection: options.onSectionSwitch,
      onUpdateSettings: options.onSettingsChange,
      onNavigate: options.onNavigate,
      onExecuteAction: options.onExecute,
      onFeedDocuments: options.onFeedDocuments,
      onShowToast: options.onToast,
    };
  }, [
    options.onDocumentSelect,
    options.onSectionSwitch,
    options.onSettingsChange,
    options.onNavigate,
    options.onExecute,
    options.onFeedDocuments,
    options.onToast,
  ]);
  
  // Initialize with mode if provided
  useEffect(() => {
    if (options.initialMode) {
      setContext(prev => updateContextMode(prev, options.initialMode!));
    }
  }, [options.initialMode]);
  
  /**
   * Process natural language input and execute corresponding action
   */
  const processInput = useCallback((text: string): AIResponse => {
    // Parse the command
    const command = parseCommandWithContext(text, context.mode);
    
    if (!command) {
      const fallbackResponse: AIResponse = {
        text: "I didn't understand that. Try saying 'help' for available commands.",
        shouldSpeak: true,
        feedbackType: 'info',
      };
      setLastResponse(fallbackResponse);
      return fallbackResponse;
    }
    
    setLastCommand(command);
    
    // Handle the command
    const response = handleCommand(command, context, callbacksRef.current);
    setLastResponse(response);
    
    // Update context based on response action
    if (response.action) {
      switch (response.action) {
        case 'CONFIRM':
          // Reset after successful execution
          if (response.feedbackType === 'success') {
            // Don't reset immediately, let the caller handle it
          }
          break;
        case 'CANCEL':
          setContext(createInitialContext());
          break;
      }
    }
    
    return response;
  }, [context]);
  
  /**
   * Set workflow mode
   */
  const setMode = useCallback((mode: WorkflowMode | null) => {
    setContext(prev => updateContextMode(prev, mode));
  }, []);
  
  /**
   * Set current step
   */
  const setStep = useCallback((step: number) => {
    setContext(prev => updateContextStep(prev, step));
  }, []);
  
  /**
   * Set selected documents
   */
  const setDocuments = useCallback((documents: DocumentInfo[]) => {
    setContext(prev => updateContextDocuments(prev, documents));
  }, []);
  
  /**
   * Set settings
   */
  const setSettings = useCallback((settings: Partial<PrintSettings | ScanSettings>) => {
    setContext(prev => updateContextSettings(prev, settings));
  }, []);
  
  /**
   * Set feed status
   */
  const setFeedStatus = useCallback((fed: boolean, count: number) => {
    setContext(prev => updateContextFeed(prev, fed, count));
  }, []);
  
  /**
   * Set modal state
   */
  const setModalState = useCallback((isOpen: boolean, chatVisible: boolean) => {
    setContext(prev => updateContextModalState(prev, isOpen, chatVisible));
  }, []);
  
  /**
   * Get human-readable context description
   */
  const getContextDescription = useCallback(() => {
    return describeContext(context);
  }, [context]);
  
  /**
   * Get context summary for AI system prompt
   */
  const getContextSummary = useCallback(() => {
    return buildContextSummary(context);
  }, [context]);
  
  /**
   * Check if ready for execution
   */
  const isReady = useCallback(() => {
    return isReadyForExecution(context);
  }, [context]);
  
  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setContext(createInitialContext());
    setLastCommand(null);
    setLastResponse(null);
  }, []);
  
  return {
    context,
    lastCommand,
    lastResponse,
    processInput,
    setMode,
    setStep,
    setDocuments,
    setSettings,
    setFeedStatus,
    setModalState,
    getContextDescription,
    getContextSummary,
    isReady,
    reset,
  };
}

export default useAIAssist;
