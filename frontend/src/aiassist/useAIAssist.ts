/**
 * useAIAssist Hook
 * React hook for integrating AI assist functionality into components
 * Enhanced with state machine for strict workflow control
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
  AppState,
  PrintWorkflowStep,
  ScanWorkflowStep,
  ScanDocumentSource,
} from './types';
import { parseCommand, parseCommandWithContext, parseCommandWithState, StateAwareParseContext } from './commandParser';
import { handleCommand, handleCommandWithState } from './actionHandler';
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
  updateAppState,
  updatePrintStep,
  updateScanStep,
  updateScanSource,
  updateSelectedDocumentIndices,
} from './contextManager';

export interface UseAIAssistOptions {
  initialMode?: WorkflowMode | null;
  onSettingsChange?: (settings: Partial<PrintSettings | ScanSettings>) => void;
  onDocumentSelect?: (index: number, section: DocumentSection) => void;
  onMultipleDocumentSelect?: (indices: number[], section: DocumentSection) => void;
  onDocumentDeselect?: (index: number, section: DocumentSection) => void;
  onClearSelection?: () => void;
  onSectionSwitch?: (section: DocumentSection) => void;
  onNavigate?: (direction: 'next' | 'prev' | 'back') => void;
  onExecute?: (action: 'print' | 'scan' | 'cancel' | 'confirm') => void;
  onFeedDocuments?: (count: number) => void;
  onToast?: (title: string, description: string, status: 'success' | 'error' | 'warning' | 'info') => void;
  onModeSwitch?: (mode: WorkflowMode, hasSorry: boolean) => boolean;
  onScanSourceChange?: (source: ScanDocumentSource) => void;
  onStateChange?: (appState: AppState, step: PrintWorkflowStep | ScanWorkflowStep | null) => void;
  totalDocuments?: number;
}

export interface UseAIAssistReturn {
  // State
  context: WorkflowContext;
  lastCommand: ParsedCommand | null;
  lastResponse: AIResponse | null;
  
  // Actions
  processInput: (text: string) => AIResponse;
  processInputWithState: (text: string) => AIResponse;
  setMode: (mode: WorkflowMode | null) => void;
  setStep: (step: number) => void;
  setDocuments: (documents: DocumentInfo[]) => void;
  setSettings: (settings: Partial<PrintSettings | ScanSettings>) => void;
  setFeedStatus: (fed: boolean, count: number) => void;
  setModalState: (isOpen: boolean, chatVisible: boolean) => void;
  
  // State machine actions
  setAppState: (appState: AppState) => void;
  setPrintStep: (step: PrintWorkflowStep) => void;
  setScanStep: (step: ScanWorkflowStep) => void;
  setScanSource: (source: ScanDocumentSource) => void;
  setSelectedIndices: (indices: number[]) => void;
  
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
      onSelectMultipleDocuments: options.onMultipleDocumentSelect,
      onDeselectDocument: options.onDocumentDeselect,
      onClearDocumentSelection: options.onClearSelection,
      onSwitchSection: options.onSectionSwitch,
      onUpdateSettings: options.onSettingsChange,
      onNavigate: options.onNavigate,
      onExecuteAction: options.onExecute,
      onFeedDocuments: options.onFeedDocuments,
      onShowToast: options.onToast,
      onModeSwitch: options.onModeSwitch,
      onSetScanSource: options.onScanSourceChange,
      onStateChange: options.onStateChange,
    };
  }, [
    options.onDocumentSelect,
    options.onMultipleDocumentSelect,
    options.onDocumentDeselect,
    options.onClearSelection,
    options.onSectionSwitch,
    options.onSettingsChange,
    options.onNavigate,
    options.onExecute,
    options.onFeedDocuments,
    options.onToast,
    options.onModeSwitch,
    options.onScanSourceChange,
    options.onStateChange,
  ]);
  
  // Initialize with mode if provided
  useEffect(() => {
    if (options.initialMode) {
      setContext(prev => updateContextMode(prev, options.initialMode!));
    }
  }, [options.initialMode]);
  
  /**
   * Process natural language input with state machine validation
   */
  const processInputWithState = useCallback((text: string): AIResponse => {
    // Build state-aware parse context
    const parseContext: StateAwareParseContext = {
      appState: context.appState,
      printStep: context.printStep,
      scanStep: context.scanStep,
      scanSource: context.scanSource,
      totalDocuments: options.totalDocuments || 20,
    };
    
    // Parse the command with state awareness
    const command = parseCommandWithState(text, parseContext);
    
    if (!command) {
      // In dashboard state, provide helpful guidance
      if (context.appState === 'DASHBOARD') {
        return {
          text: 'Print or scan?',
          shouldSpeak: true,
          feedbackType: 'info',
        };
      }
      
      const fallbackResponse: AIResponse = {
        text: "Didn't catch that. Say help.",
        shouldSpeak: true,
        feedbackType: 'info',
      };
      setLastResponse(fallbackResponse);
      return fallbackResponse;
    }
    
    setLastCommand(command);
    
    // Handle the command with state validation
    const response = handleCommandWithState(command, context, callbacksRef.current);
    setLastResponse(response);
    
    // Update context based on state changes
    if (response.stateUpdate) {
      if (response.stateUpdate.newState) {
        setContext(prev => updateAppState(prev, response.stateUpdate!.newState!));
      }
      if (response.stateUpdate.newStep) {
        const step = response.stateUpdate.newStep;
        if (context.appState === 'PRINT_WORKFLOW') {
          setContext(prev => updatePrintStep(prev, step as PrintWorkflowStep));
        } else if (context.appState === 'SCAN_WORKFLOW') {
          setContext(prev => updateScanStep(prev, step as ScanWorkflowStep));
        }
      }
    }
    
    // Handle cancel/reset
    if (response.action === 'CANCEL') {
      setContext(createInitialContext());
    }
    
    return response;
  }, [context, options.totalDocuments]);
  
  /**
   * Process natural language input and execute corresponding action (legacy)
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

  // ==================== State Machine Actions ====================
  
  /**
   * Set app state directly
   */
  const setAppState = useCallback((appState: AppState) => {
    setContext(prev => updateAppState(prev, appState));
  }, []);
  
  /**
   * Set print workflow step
   */
  const setPrintStep = useCallback((step: PrintWorkflowStep) => {
    setContext(prev => updatePrintStep(prev, step));
  }, []);
  
  /**
   * Set scan workflow step
   */
  const setScanStep = useCallback((step: ScanWorkflowStep) => {
    setContext(prev => updateScanStep(prev, step));
  }, []);
  
  /**
   * Set scan document source
   */
  const setScanSource = useCallback((source: ScanDocumentSource) => {
    setContext(prev => updateScanSource(prev, source));
  }, []);
  
  /**
   * Set selected document indices
   */
  const setSelectedIndices = useCallback((indices: number[]) => {
    setContext(prev => updateSelectedDocumentIndices(prev, indices));
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
    processInputWithState,
    setMode,
    setStep,
    setDocuments,
    setSettings,
    setFeedStatus,
    setModalState,
    // State machine actions
    setAppState,
    setPrintStep,
    setScanStep,
    setScanSource,
    setSelectedIndices,
    // Utilities
    getContextDescription,
    getContextSummary,
    isReady,
    reset,
  };
}

export default useAIAssist;
