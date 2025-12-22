/**
 * useUnifiedVoiceInput Hook
 * 
 * UNIFIED VOICE INPUT SYSTEM
 * ===========================
 * This hook provides a single entry point for voice input that follows the same
 * flow as text input. The only difference is the input source (Whisper STT vs keyboard).
 * 
 * FLOW:
 * 1. Voice Input → MediaRecorder captures audio
 * 2. Audio → POST /voice/transcribe → Whisper STT → returns text
 * 3. Text → useAIAssist.processInputWithState() → same as text input
 * 4. Response → Optional TTS via POST /voice/speak
 * 
 * This eliminates duplicate command parsing in the backend and ensures
 * voice and text inputs use identical processing logic.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import apiClient from '../apiClient';
import { useAIAssist, AIResponse } from '../aiassist';
import type { UseAIAssistOptions } from '../aiassist/useAIAssist';
import { convertToWAV, isValidAudioBlob, getAudioDuration } from '../components/voice/utils';

// ============================================================================
// Types
// ============================================================================

export interface UnifiedVoiceInputOptions extends UseAIAssistOptions {
  /** Enable TTS for AI responses */
  enableTTS?: boolean;
  /** Auto-restart recording after processing */
  autoRestartRecording?: boolean;
  /** Silence detection threshold (0-100) */
  silenceThreshold?: number;
  /** Silence duration before stopping (ms) */
  silenceDuration?: number;
  /** Maximum recording duration (ms) */
  maxRecordingDuration?: number;
  /** Callback when transcription is received */
  onTranscription?: (text: string) => void;
  /** Callback when AI response is received */
  onAIResponse?: (response: AIResponse) => void;
  /** Callback when TTS starts/ends */
  onTTSStateChange?: (isSpeaking: boolean) => void;
  /** Callback when session state changes */
  onSessionStateChange?: (isActive: boolean) => void;
  /** Callback when recording state changes */
  onRecordingStateChange?: (isRecording: boolean) => void;
}

export interface UnifiedVoiceInputReturn {
  // Session management
  isSessionActive: boolean;
  startSession: () => Promise<boolean>;
  endSession: () => Promise<void>;
  
  // Recording control
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: (manual?: boolean) => void;
  
  // Processing state
  isProcessing: boolean;
  isSpeaking: boolean;
  
  // Text input (same flow as voice after STT)
  processTextInput: (text: string) => Promise<AIResponse | null>;
  
  // AI Assist context (exposed for UI)
  context: ReturnType<typeof useAIAssist>['context'];
  setMode: ReturnType<typeof useAIAssist>['setMode'];
  setStep: ReturnType<typeof useAIAssist>['setStep'];
  setDocuments: ReturnType<typeof useAIAssist>['setDocuments'];
  
  // Status
  sessionStatus: string;
  lastTranscription: string;
  lastResponse: AIResponse | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useUnifiedVoiceInput(
  options: UnifiedVoiceInputOptions = {}
): UnifiedVoiceInputReturn {
  const {
    enableTTS = true,
    autoRestartRecording = true,
    silenceThreshold = 15,
    silenceDuration = 500,
    maxRecordingDuration = 5000,
    onTranscription,
    onAIResponse,
    onTTSStateChange,
    onSessionStateChange,
    onRecordingStateChange,
    ...aiAssistOptions
  } = options;

  // ============================================================================
  // State
  // ============================================================================
  
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('');
  const [lastTranscription, setLastTranscription] = useState('');
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);

  // ============================================================================
  // Refs
  // ============================================================================
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingRestartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const isSessionActiveRef = useRef(false);
  const userStoppedRef = useRef(false);

  const toast = useToast();

  // ============================================================================
  // AI Assist Hook - This is the SINGLE SOURCE OF TRUTH for command processing
  // ============================================================================
  
  const aiAssist = useAIAssist(aiAssistOptions);

  // ============================================================================
  // Sync refs with state
  // ============================================================================
  
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    onTTSStateChange?.(isSpeaking);
  }, [isSpeaking, onTTSStateChange]);

  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
    onSessionStateChange?.(isSessionActive);
    
    if (!isSessionActive && recordingRestartTimeoutRef.current) {
      clearTimeout(recordingRestartTimeoutRef.current);
      recordingRestartTimeoutRef.current = null;
    }
  }, [isSessionActive, onSessionStateChange]);

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

  // ============================================================================
  // Cleanup on unmount
  // ============================================================================
  
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      }
      if (recordingRestartTimeoutRef.current) {
        clearTimeout(recordingRestartTimeoutRef.current);
      }
    };
  }, []);

  // ============================================================================
  // Schedule Recording Restart
  // ============================================================================
  
  const scheduleRecordingStart = useCallback((delay = 0) => {
    if (!isSessionActiveRef.current || !autoRestartRecording) return;
    if (userStoppedRef.current) return;

    if (recordingRestartTimeoutRef.current) {
      clearTimeout(recordingRestartTimeoutRef.current);
    }

    recordingRestartTimeoutRef.current = setTimeout(() => {
      recordingRestartTimeoutRef.current = null;
      
      if (!isSessionActiveRef.current || userStoppedRef.current) return;
      if (isSpeakingRef.current) {
        scheduleRecordingStart(150);
        return;
      }
      if (mediaRecorderRef.current?.state === 'recording') return;
      
      startRecording();
    }, Math.max(0, delay));
  }, [autoRestartRecording]);

  // ============================================================================
  // Process Text Input - UNIFIED ENTRY POINT
  // Both voice (after STT) and text input use this same function
  // ============================================================================
  
  const processTextInput = useCallback(async (text: string): Promise<AIResponse | null> => {
    if (!text.trim()) return null;

    try {
      setIsProcessing(true);
      setSessionStatus('Processing...');

      // Use AI Assist to parse and handle the command
      // This is the SAME logic used for text input
      const response = await aiAssist.processInputWithState(text);

      setLastResponse(response);
      onAIResponse?.(response);

      // Handle TTS if enabled
      if (enableTTS && response.text) {
        setIsSpeaking(true);
        setSessionStatus('Speaking response...');

        try {
          await apiClient.post('/voice/speak', { text: response.text }, { timeout: 60000 });
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
          // Continue even if TTS fails
        } finally {
          setIsSpeaking(false);
        }
      }

      setSessionStatus('Ready');
      return response;
    } catch (error: any) {
      console.error('Error processing input:', error);
      setSessionStatus('Error processing input');
      
      toast({
        title: 'Processing Error',
        description: error.message || 'Failed to process input',
        status: 'error',
        duration: 3000,
      });
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [aiAssist, enableTTS, onAIResponse, toast]);

  // ============================================================================
  // Transcribe Audio - Voice-specific (converts audio to text)
  // ============================================================================
  
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    try {
      setSessionStatus('Transcribing...');

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      // Call backend for STT only
      const response = await apiClient.post('/voice/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      if (response.data.success && response.data.text) {
        const text = response.data.text.trim();
        setLastTranscription(text);
        onTranscription?.(text);
        return text;
      }

      return null;
    } catch (error: any) {
      console.error('Transcription error:', error);
      return null;
    }
  }, [onTranscription]);

  // ============================================================================
  // Process Audio - Full voice pipeline
  // Audio → STT → Text → AI Assist (same as text)
  // ============================================================================
  
  const processAudio = useCallback(async (audioBlob: Blob) => {
    if (isSpeakingRef.current) {
      scheduleRecordingStart(150);
      return;
    }

    try {
      setIsProcessing(true);

      // Step 1: Transcribe audio to text
      const text = await transcribeAudio(audioBlob);

      if (!text) {
        console.log('No transcription - auto-retry');
        scheduleRecordingStart(300);
        return;
      }

      // Step 2: Process text through AI Assist (SAME AS TEXT INPUT)
      const response = await processTextInput(text);

      // Step 3: Schedule next recording
      if (response) {
        scheduleRecordingStart(200);
      } else {
        scheduleRecordingStart(500);
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      scheduleRecordingStart(700);
    } finally {
      setIsProcessing(false);
    }
  }, [transcribeAudio, processTextInput, scheduleRecordingStart]);

  // ============================================================================
  // Stop Recording
  // ============================================================================
  
  const stopRecording = useCallback((manual = true) => {
    if (manual) {
      userStoppedRef.current = true;
    }

    if (recordingRestartTimeoutRef.current) {
      clearTimeout(recordingRestartTimeoutRef.current);
      recordingRestartTimeoutRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recorder:', e);
      }
      setIsRecording(false);
    }

    try {
      mediaRecorderRef.current?.stream?.getTracks().forEach(track => track.stop());
    } catch (e) {
      console.warn('Error stopping tracks:', e);
    }
  }, []);

  // ============================================================================
  // Start Recording
  // ============================================================================
  
  const startRecording = useCallback(async () => {
    userStoppedRef.current = false;

    if (!isSessionActiveRef.current) {
      console.warn('Session not active');
      return;
    }

    if (isSpeakingRef.current) {
      scheduleRecordingStart(120);
      return;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      const mimeTypes = ['audio/wav', 'audio/webm', 'audio/webm;codecs=opus'];
      let selectedMimeType = 'audio/webm';
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 256000,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          let audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });

          if (!isValidAudioBlob(audioBlob)) {
            throw new Error('Invalid audio');
          }

          if (!audioBlob.type.includes('wav')) {
            audioBlob = await convertToWAV(audioBlob);
          }

          const duration = await getAudioDuration(audioBlob);
          if (duration < 0.3) {
            scheduleRecordingStart(150);
            return;
          }

          // Check for voice activity
          const { hasVoiceActivity, hasHighPitchSound } = await import('../utils/audioUtils');
          const hasVoice = await hasVoiceActivity(audioBlob, 0.008);
          const hasHighPitch = await hasHighPitchSound(audioBlob, 0.08);

          if (!hasVoice || !hasHighPitch) {
            scheduleRecordingStart(150);
            return;
          }

          await processAudio(audioBlob);
        } catch (error) {
          console.error('Recording stop error:', error);
          scheduleRecordingStart(600);
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.onerror = () => {
        scheduleRecordingStart(600);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Silence detection
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let silenceStart: number | null = null;
      let speechDetected = false;

      const checkAudioLevel = () => {
        if (mediaRecorderRef.current?.state !== 'recording') return;

        analyser.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / bufferLength);
        const audioLevel = rms * 100;

        if (audioLevel > silenceThreshold) {
          speechDetected = true;
          silenceStart = null;
        } else if (speechDetected) {
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > silenceDuration) {
            stopRecording(false);
            audioContext.close();
            return;
          }
        }

        requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();

      // Max duration timeout
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording(false);
          audioContext.close();
        }
      }, maxRecordingDuration);

    } catch (error: any) {
      console.error('Recording start error:', error);
      toast({
        title: 'Microphone Error',
        description: error.message || 'Could not access microphone',
        status: 'error',
        duration: 3000,
      });
      scheduleRecordingStart(1000);
    }
  }, [
    silenceThreshold,
    silenceDuration,
    maxRecordingDuration,
    stopRecording,
    processAudio,
    scheduleRecordingStart,
    toast,
  ]);

  // ============================================================================
  // Start Session
  // ============================================================================
  
  const startSession = useCallback(async (): Promise<boolean> => {
    try {
      setSessionStatus('Starting voice AI...');

      const response = await apiClient.post('/voice/start', {}, { timeout: 120000 });

      if (response.data.success) {
        setIsSessionActive(true);
        setSessionStatus('Ready - Speak naturally');
        
        toast({
          title: 'Voice AI Ready',
          description: 'Speak now',
          status: 'success',
          duration: 3000,
        });

        // Auto-start recording
        startRecording();
        return true;
      }

      throw new Error(response.data.error || 'Failed to start');
    } catch (error: any) {
      console.error('Session start error:', error);
      setSessionStatus('Failed to start');
      
      toast({
        title: 'Session Failed',
        description: error.message || 'Could not start voice session',
        status: 'error',
        duration: 5000,
      });
      
      return false;
    }
  }, [startRecording, toast]);

  // ============================================================================
  // End Session
  // ============================================================================
  
  const endSession = useCallback(async () => {
    try {
      stopRecording(true);
      await apiClient.post('/voice/end');
      setIsSessionActive(false);
      setSessionStatus('Session ended');
      
      toast({
        title: 'Session Ended',
        description: 'Voice AI stopped',
        status: 'info',
        duration: 2000,
      });
    } catch (error) {
      console.error('End session error:', error);
      setIsRecording(false);
      setIsSessionActive(false);
    }
  }, [stopRecording, toast]);

  // ============================================================================
  // Return
  // ============================================================================
  
  return {
    // Session management
    isSessionActive,
    startSession,
    endSession,
    
    // Recording control
    isRecording,
    startRecording,
    stopRecording,
    
    // Processing state
    isProcessing,
    isSpeaking,
    
    // Text input (unified with voice)
    processTextInput,
    
    // AI Assist context
    context: aiAssist.context,
    setMode: aiAssist.setMode,
    setStep: aiAssist.setStep,
    setDocuments: aiAssist.setDocuments,
    
    // Status
    sessionStatus,
    lastTranscription,
    lastResponse,
  };
}

export default useUnifiedVoiceInput;