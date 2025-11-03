/**
 * VoiceAIChat Component
 * Hands-free voice AI chat interface with automatic transcription and AI responses
 * Uses Whisper Large-v3 Turbo + Smollm2:135m
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Spinner,
  Text,
  VStack,
  HStack,
  useToast,
  Avatar,
  Badge,
  Divider,
  useColorModeValue,
  Input,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import { FiMic, FiMicOff, FiX, FiSend } from 'react-icons/fi';
import apiClient from '../../apiClient';
import { convertToWAV, isValidAudioBlob, getAudioDuration, VoiceMessage, addMessageWithDedup } from '../../utils/voiceAIHelpers';
import Iconify from '../common/Iconify';

interface VoiceAIChatProps {
  isOpen: boolean;
  onClose: () => void;
  onOrchestrationTrigger?: (mode: 'print' | 'scan', config?: any) => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

const VoiceAIChat: React.FC<VoiceAIChatProps> = ({ isOpen, onClose, onOrchestrationTrigger, isMinimized = false, onToggleMinimize }) => {
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Track if TTS is playing
  const [sessionStatus, setSessionStatus] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [isTextSending, setIsTextSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCounterRef = useRef<{ [key: string]: number }>({});
  const chatInputRef = useRef<HTMLInputElement>(null);
  const sessionStartedRef = useRef<boolean>(false);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  const recordingPendingRef = useRef<boolean>(false); // Prevent multiple simultaneous startRecording calls
  const isSessionActiveRef = useRef<boolean>(false); // Track session state in ref for closures

  const toast = useToast();

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const userMessageBg = useColorModeValue('blue.50', 'blue.900');
  const aiMessageBg = useColorModeValue('gray.50', 'gray.700');
  const systemMessageBg = useColorModeValue('yellow.50', 'yellow.900');
  const chatBoxBg = useColorModeValue('gray.50', 'gray.700');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup on unmount - stop recording and end session
  useEffect(() => {
    return () => {
      // Stop recording if active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  // Start voice AI session when drawer opens
  useEffect(() => {
    if (isOpen && !isSessionActive && !sessionStartedRef.current) {
      sessionStartedRef.current = true;
      startSession();
    }
    if (!isOpen) {
      sessionStartedRef.current = false;
    }
    // Focus chat input when drawer opens
    if (isOpen) {
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 300); // Wait for drawer animation
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSessionActive]);

  const addMessage = useCallback((type: 'user' | 'ai' | 'system', text: string) => {
    setMessages(prev => addMessageWithDedup(prev, type, text));
  }, []);

  const startSession = async () => {
    try {
      setSessionStatus('Loading Whisper AI model (smaller model, faster loading)...');

      // Use longer timeout for session start (Whisper model loading)
      const response = await apiClient.post(
        '/voice/start',
        {},
        {
          timeout: 120000, // 2 minutes for model loading
        }
      );

      if (response.data.success) {
        setIsSessionActive(true);
        isSessionActiveRef.current = true; // Update ref for closures
        setSessionStatus('Ready - Just speak naturally');
        addMessage(
          'system',
          'Voice AI Ready! Just speak naturally - no wake words needed. Say "bye printchakra" to end.'
        );

        // Close previous toast if exists
        if (toastIdRef.current) {
          toast.close(toastIdRef.current);
        }

        toastIdRef.current = toast({
          title: 'Voice AI Ready',
          description: 'Just speak naturally',
          status: 'success',
          duration: 4000,
          isClosable: true,
        });

        // Auto-start recording after session starts
        setTimeout(() => startRecording(), 500);
      } else {
        throw new Error(response.data.error || 'Failed to start session');
      }
    } catch (error: any) {
      console.error('Session start error:', error);
      setSessionStatus('Failed');

      // Close previous toast if exists
      if (toastIdRef.current) {
        toast.close(toastIdRef.current);
      }

      toastIdRef.current = toast({
        title: 'Session Start Failed',
        description:
          error.response?.data?.error || error.message || 'Could not start voice AI session',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const startRecording = async () => {
    // Prevent multiple simultaneous startRecording calls (causes infinite loop)
    if (recordingPendingRef.current || isRecording) {
      console.log('⏹️ Recording already pending or active - skipping startRecording call');
      return;
    }

    // Block recording if TTS is currently speaking
    if (isSpeaking) {
      console.log('TTS is speaking - blocking recording');
      return;
    }

    recordingPendingRef.current = true;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Higher quality for better transcription
          channelCount: 1, // Mono audio
          sampleSize: 16, // 16-bit depth
        },
      });

      // Use WAV format if supported, fallback to WebM
      const mimeTypes = ['audio/wav', 'audio/webm', 'audio/webm;codecs=opus', 'audio/mp4'];

      let selectedMimeType = 'audio/webm';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          console.log(`✅ Using MIME type: ${mimeType}`);
          break;
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 256000, // Higher bitrate for better quality
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          let audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });

          // Validate audio blob
          if (!isValidAudioBlob(audioBlob)) {
            console.error('Invalid audio blob generated');
            throw new Error('Audio blob is invalid');
          }

          console.log(`Raw audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

          // Convert to WAV if needed
          if (audioBlob.type !== 'audio/wav' && !audioBlob.type.includes('wav')) {
            console.log('Converting audio to WAV format...');
            audioBlob = await convertToWAV(audioBlob);
            console.log(`Converted to WAV: ${audioBlob.size} bytes`);
          }

          console.log(`Final audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

          // Get duration for diagnostics
          const duration = await getAudioDuration(audioBlob);
          console.log(`Audio duration: ${duration.toFixed(2)}s`);

          // Check for voice activity before processing
          // Using balanced threshold (0.020) to detect human voice while filtering background noise
          const { hasVoiceActivity } = await import('../../utils/audioUtils');
          const hasVoice = await hasVoiceActivity(audioBlob, 0.020);

          if (!hasVoice) {
            console.log('⏭️ No human voice detected - only background noise/silence - auto-restarting');
            // Don't show annoying "no voice" message - just silently retry

            // ALWAYS auto-restart recording for continuous listening when session is active
            if (isSessionActiveRef.current) {
              console.log('🔄 Continuous mode: restarting recording immediately');
              setTimeout(() => startRecording(), 200);
            }
            return;
          }

          await processAudio(audioBlob);
        } catch (error: any) {
          console.error('Error in onstop handler:', error);
          toast({
            title: 'Audio Processing Error',
            description: error.message || 'Failed to process audio',
            status: 'error',
            duration: 5000,
          });

          // ALWAYS auto-restart recording on error for continuous listening
          if (isSessionActiveRef.current) {
            console.log('🔄 Error occurred - restarting recording for continuous listening');
            setTimeout(() => startRecording(), 500);
          }
        } finally {
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        toast({
          title: 'Recording Error',
          description: event.error || 'An error occurred during recording',
          status: 'error',
          duration: 5000,
        });
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingPendingRef.current = false; // Recording started successfully

      // Real-time silence detection using Web Audio API
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let silenceStart: number | null = null;
      let speechDetected = false;
      let audioContextClosed = false;
      let continuousSilenceStart = Date.now(); // Track total silence from start
      const SILENCE_THRESHOLD = 15; // Lower threshold for faster detection (was 25)
      const SILENCE_DURATION = 800; // Stop after 0.8 seconds of silence after speech (was 1500)
      const CONTINUOUS_SILENCE_LIMIT = 3000; // If NO speech detected for 3 seconds, restart

      const closeAudioContext = () => {
        if (!audioContextClosed && audioContext.state !== 'closed') {
          try {
            audioContext.close();
            audioContextClosed = true;
          } catch (e) {
            // Already closed
          }
        }
      };

      const checkAudioLevel = () => {
        if (mediaRecorderRef.current?.state !== 'recording' || audioContextClosed) {
          closeAudioContext();
          return;
        }

        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS (Root Mean Square) for audio level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / bufferLength);
        const audioLevel = rms * 100;

        // Detect speech vs silence
        if (audioLevel > SILENCE_THRESHOLD) {
          speechDetected = true;
          silenceStart = null; // Reset silence timer
          continuousSilenceStart = Date.now(); // Reset continuous silence timer
        } else if (speechDetected && audioLevel <= SILENCE_THRESHOLD) {
          // Silence detected after speech
          if (silenceStart === null) {
            silenceStart = Date.now();
          } else if (Date.now() - silenceStart > SILENCE_DURATION) {
            // Silence lasted long enough - stop and process this recording
            console.log('✅ Silence after speech detected - processing recording');
            stopRecording();
            closeAudioContext();
            return;
          }
        } else if (!speechDetected && Date.now() - continuousSilenceStart > CONTINUOUS_SILENCE_LIMIT) {
          // NO speech detected for 3 seconds - just restart without processing
          console.log('⏭️ No speech detected for 3 seconds - restarting recording');
          mediaRecorderRef.current?.stop(); // This will trigger onstop which restarts
          closeAudioContext();
          return;
        }

        // Continue checking
        requestAnimationFrame(checkAudioLevel);
      };

      // Start monitoring audio levels
      checkAudioLevel();

      // Fallback: Auto-stop after 10 seconds maximum
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          console.log('⏱️ Max duration (10s) reached - processing and restarting');
          stopRecording();
          closeAudioContext();
        }
      }, 10000);
    } catch (error: any) {
      recordingPendingRef.current = false; // Reset flag on error
      console.error('Recording error:', error);
      toast({
        title: 'Microphone Error',
        description: error.message || 'Could not access microphone',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    // Block processing if TTS is currently speaking
    if (isSpeaking) {
      console.log('TTS is speaking - skipping audio processing');
      // Auto-restart recording after TTS finishes
      return;
    }

    try {
      setIsProcessing(true);
      setSessionStatus('Transcribing audio...');

      console.log(`📝 Processing audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');

      console.log('📤 Sending to backend...');

      // Send to backend for processing (Whisper → Smollm2)
      // Use longer timeout for voice processing (model loading can take time)
      const response = await apiClient.post('/voice/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes for voice processing
      });

      console.log('✅ Backend response:', response.data);

      // Check for no speech detected (auto-retry)
      if (response.data.auto_retry && response.data.no_speech_detected) {
        console.log('⚠️ Backend: No human speech detected - auto-restarting recording');
        
        // Don't spam user with messages for background noise
        // addMessage('system', '⚠️ No human speech detected. Retrying...');
        
        setSessionStatus('Listening...');
        setIsProcessing(false);

        // ALWAYS auto-restart immediately for continuous listening
        if (isSessionActive) {
          console.log('🔄 Continuous mode: restarting recording immediately');
          setTimeout(() => startRecording(), 200);
        }
        return;
      }

      if (response.data.success) {
        const {
          user_text,
          full_text,
          ai_response,
          session_ended,
          keyword_detected,
          orchestration_trigger,
          orchestration_mode,
          config_params,
          voice_command,
          command_confidence,
        } = response.data;

        // Add full transcription as system message
        addMessage('system', `🎤 Heard: "${full_text || user_text}"`);

        // Add user message (command part only)
        addMessage('user', user_text);

        // 1. Display AI response FIRST
        addMessage('ai', ai_response);

        setIsProcessing(false);

        // Check for voice command BEFORE orchestration
        if (voice_command && command_confidence && command_confidence > 0.7) {
          console.log(
            `🎯 Voice command detected: ${voice_command}`,
            `(confidence: ${command_confidence})`
          );

          // Show notification about command execution
          toast({
            title: `Command: ${voice_command.toUpperCase()}`,
            description: `Executing with ${(command_confidence * 100).toFixed(0)}% confidence`,
            status: 'success',
            duration: 2000,
            isClosable: true,
          });

          // Emit voice command event (can be handled by parent or other listeners)
          if (onOrchestrationTrigger) {
            // For navigation commands, pass them as special events
            window.dispatchEvent(
              new CustomEvent('voiceCommand', {
                detail: {
                  command: voice_command,
                  confidence: command_confidence,
                  text: user_text,
                },
              })
            );
          }
        }

        // Check for orchestration trigger BEFORE TTS
        if (orchestration_trigger && orchestration_mode) {
          console.log(
            `🎯 Orchestration triggered: ${orchestration_mode}`,
            config_params || {}
          );

          // Show notification about orchestration
          toast({
            title: `Opening ${orchestration_mode === 'print' ? 'Print' : 'Scan'} Interface`,
            description: 'Orchestration system activated',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });

          // Trigger orchestration in parent component
          if (onOrchestrationTrigger) {
            // Delay slightly to allow TTS to start
            setTimeout(() => {
              onOrchestrationTrigger(orchestration_mode as 'print' | 'scan', config_params);
            }, 500);
          }
        }

        // 2. THEN play TTS (non-blocking - starts immediately in background)
        setIsSpeaking(true);
        setSessionStatus('Speaking response...');
        
        // Fire TTS request and wait for completion before restarting recording
        apiClient.post(
          '/voice/speak',
          {
            text: ai_response,
          },
          {
            timeout: 60000,
          }
        ).then(() => {
          console.log('✅ TTS completed');
        }).catch((ttsError) => {
          console.error('TTS error:', ttsError);
        }).finally(() => {
          // Release speaking lock after TTS completes
          setIsSpeaking(false);
          setSessionStatus('Ready - Just speak naturally');
          
          // Focus chat input after TTS completes
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 100);

          // Check if session should end
          if (session_ended) {
            setIsSessionActive(false);
            isSessionActiveRef.current = false; // Update ref
            addMessage('system', 'Voice session ended. Thank you!');

            toast({
              title: 'Session Ended',
              description: 'Goodbye!',
              status: 'info',
              duration: 3000,
            });
          } else {
            // ONLY restart recording AFTER TTS completes
            if (isSessionActiveRef.current) {
              console.log('🔄 TTS finished - restarting recording for continuous listening...');
              setTimeout(() => startRecording(), 300);
            }
          }
        });
      } else {
        throw new Error(response.data.error || 'Processing failed');
      }
    } catch (error: any) {
      console.error('❌ Audio processing error:', error);

      // Provide detailed error information
      let errorMessage = error.message || 'Could not process audio';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          console.error('Backend details:', error.response.data.details);
        }
      }

      // Check if it's a keyword-related error
      if (error.response?.data?.requires_keyword) {
        // Silent retry for keyword errors - don't spam user
        console.log(`⏭️ Keyword detection error, retrying...`);
        setSessionStatus('Ready - Just speak naturally');

        // Auto-restart recording after keyword error
        setTimeout(() => startRecording(), 300);
      } else {
        // Only show non-retryable errors
        console.error('Transcription error:', errorMessage);

        // Don't show file access errors - just retry silently
        if (errorMessage.includes('process cannot access') || errorMessage.includes('being used')) {
          console.log('⏭️ File access error, retrying...');
          setSessionStatus('Ready - Just speak naturally');

          setTimeout(() => {
            if (isSessionActive) {
              startRecording();
            }
          }, 500);
        } else {
          // Show only critical errors
          toast({
            title: 'Processing Error',
            description: errorMessage,
            status: 'error',
            duration: 3000,
          });

          setSessionStatus('Ready - Just speak naturally');

          // Auto-restart recording after error
          setTimeout(() => {
            if (isSessionActive) {
              startRecording();
            }
          }, 1000);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const endSession = async () => {
    try {
      // Stop recording if active
      if (isRecording && mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);

        // Stop all media tracks
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }

      await apiClient.post('/voice/end');

      setIsSessionActive(false);
      isSessionActiveRef.current = false; // Update ref
      addMessage('system', '🛑 Session ended manually.');

      toast({
        title: 'Session Ended',
        description: 'Recording stopped and session closed',
        status: 'info',
        duration: 2000,
      });
    } catch (error) {
      console.error('End session error:', error);
      // Force cleanup even on error
      setIsRecording(false);
      setIsSessionActive(false);
      isSessionActiveRef.current = false; // Update ref
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const sendTextMessage = async (text: string) => {
    if (!text.trim() || !isSessionActive || isSpeaking) return; // Block if TTS is speaking

    try {
      setIsTextSending(true);
      setChatInput('');

      // Add user message to chat immediately
      addMessage('user', text);

      // Get AI response (text only, no TTS yet)
      setIsProcessing(true);

      const response = await apiClient.post(
        '/voice/chat',
        {
          message: text,
        },
        {
          timeout: 30000,
        }
      );

      if (response.data.success) {
        const aiResponse = response.data.response;
        const orchestrationTrigger = response.data.orchestration_trigger;
        const orchestrationMode = response.data.orchestration_mode;
        const configParams = response.data.config_params;
        const voiceCommand = response.data.voice_command;
        const commandConfidence = response.data.command_confidence;

        console.log('🔍 Backend response:', {
          aiResponse,
          orchestrationTrigger,
          orchestrationMode,
          configParams,
          voiceCommand,
          commandConfidence,
        });

        // 1. Display AI message FIRST
        addMessage('ai', aiResponse);
        setIsProcessing(false);

        // Check for voice command BEFORE orchestration
        if (voiceCommand && commandConfidence && commandConfidence > 0.7) {
          console.log(
            `🎯 Voice command detected: ${voiceCommand}`,
            `(confidence: ${commandConfidence})`
          );

          // Show notification about command execution
          toast({
            title: `Command: ${voiceCommand.toUpperCase()}`,
            description: `Executing with ${(commandConfidence * 100).toFixed(0)}% confidence`,
            status: 'success',
            duration: 2000,
            isClosable: true,
          });

          // Emit voice command event (can be handled by parent or other listeners)
          window.dispatchEvent(
            new CustomEvent('voiceCommand', {
              detail: {
                command: voiceCommand,
                confidence: commandConfidence,
                text: text,
              },
            })
          );
        }

        // Check for orchestration trigger BEFORE TTS
        if (orchestrationTrigger && orchestrationMode) {
          console.log(`🎯🎯🎯 Orchestration triggered: ${orchestrationMode}`, configParams || {});

          // Show notification
          toast({
            title: `Opening ${orchestrationMode === 'print' ? 'Print' : 'Scan'} Interface`,
            description: 'Orchestration system activated',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });

          // Trigger orchestration
          if (onOrchestrationTrigger) {
            setTimeout(() => {
              onOrchestrationTrigger(orchestrationMode as 'print' | 'scan', configParams);
            }, 500);
          }
        }

        // 2. THEN play TTS (blocking - no input allowed until complete)
        setIsSpeaking(true);
        setSessionStatus('Speaking response...');

        try {
          await apiClient.post(
            '/voice/speak',
            {
              text: aiResponse,
            },
            {
              timeout: 60000, // TTS can take time for long responses
            }
          );
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
          // Don't show error to user, TTS failure is non-critical
        } finally {
          setIsSpeaking(false);
          setSessionStatus('Ready - Just speak naturally');
          // Focus chat input after TTS completes
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 100);
        }
      } else {
        setIsProcessing(false);
        addMessage('system', `❌ Error: ${response.data.error}`);
        toast({
          title: 'Message Error',
          description: response.data.error,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error: any) {
      console.error('Text message error:', error);
      setIsProcessing(false);
      setIsSpeaking(false);
      addMessage('system', `❌ Error: ${error.response?.data?.error || error.message}`);
      toast({
        title: 'Message Error',
        description: error.response?.data?.error || error.message,
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsTextSending(false);
    }
  };

  const handleChatInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage(chatInput);
    }
  };

  const handleClose = async () => {
    try {
      // Stop recording if active
      if (isRecording && mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);

        // Stop all media tracks
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }

        // End session if active
        if (isSessionActive) {
          try {
            await apiClient.post('/voice/end');
          } catch (error) {
            console.error('Error ending session on close:', error);
          }
          setIsSessionActive(false);
          isSessionActiveRef.current = false; // Update ref
        }

        // Clear messages and close
        setMessages([]);
        setSessionStatus('');
        onClose();

        toast({
          title: 'Voice AI Closed',
          description: 'Recording stopped and session ended',
          status: 'info',
          duration: 2000,
        });
      } catch (error) {
        console.error('Error closing drawer:', error);
        // Force close anyway
        setMessages([]);
        setSessionStatus('');
        setIsRecording(false);
        setIsSessionActive(false);
        isSessionActiveRef.current = false; // Update ref

        // Force stop media tracks
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        onClose();
      }
  };

  return (
    <VStack flex="1" spacing={0} align="stretch" h="100%" w="100%">
      {/* Header */}
      <Box borderBottomWidth="1px" p={3} bg={bgColor}>
        <Flex align="center" gap={3} justify="space-between">
          <Flex align="center" gap={3} flex="1">
            {!isMinimized && (
              <>
                <Avatar size="sm" name="PrintChakra AI" bg="blue.500" />
                <Box flex="1">
                  <Heading size="md">PrintChakra AI</Heading>
                  <HStack spacing={2} mt={1} flexWrap="wrap">
                    <Badge colorScheme={isSessionActive ? 'green' : 'gray'} fontSize="xs">{sessionStatus}</Badge>
                    {isRecording && (
                      <Badge colorScheme="red" variant="solid" fontSize="xs">
                        <HStack spacing={1}>
                          <Box
                            w={2}
                            h={2}
                            borderRadius="full"
                            bg="white"
                            animation="pulse 1.5s infinite"
                          />
                          <Text>Recording</Text>
                        </HStack>
                      </Badge>
                    )}
                    {isProcessing && (
                      <Badge colorScheme="blue" fontSize="xs">
                        <HStack spacing={1}>
                          <Spinner size="xs" />
                          <Text>Processing</Text>
                        </HStack>
                      </Badge>
                    )}
                    {isSpeaking && (
                      <Badge colorScheme="purple" fontSize="xs">
                        <HStack spacing={1}>
                          <Spinner size="xs" />
                          <Text>Speaking</Text>
                        </HStack>
                      </Badge>
                    )}
                  </HStack>
                </Box>
              </>
            )}
          </Flex>
          <IconButton
            aria-label="Close chat"
            icon={<Iconify icon={FiX} boxSize={5} />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={onClose}
          />
        </Flex>
      </Box>

      {/* Chat Body */}
      {!isMinimized && (
        <>
          <Box flex="1" overflowY="auto" p={4}>
            <VStack spacing={3} align="stretch">
              {messages.length === 0 && (
              <Flex
                direction="column"
                align="center"
                justify="center"
                height="100%"
                color="gray.500"
              >
                <Iconify icon={FiMic} boxSize={12} />
                <Text mt={4} textAlign="center">
                  Start talking with PrintChakra AI
                </Text>
                <Text fontSize="sm" mt={2} textAlign="center">
                  Say "bye printchakra" to end
                </Text>
              </Flex>
            )}

            {messages.map(message => (
              <Box
                key={message.id}
                alignSelf={message.type === 'user' ? 'flex-end' : 'flex-start'}
                maxW="80%"
              >
                {message.type === 'system' ? (
                  <Box bg={systemMessageBg} px={3} py={2} borderRadius="md" textAlign="center">
                    <Text fontSize="sm" fontStyle="italic">
                      {message.text}
                      {message.count && message.count > 1 && (
                        <Badge ml={2} colorScheme="orange" variant="solid">
                          ×{message.count}
                        </Badge>
                      )}
                    </Text>
                  </Box>
                ) : (
                  <Flex
                    direction={message.type === 'user' ? 'row-reverse' : 'row'}
                    gap={2}
                    align="flex-start"
                  >
                    <Avatar
                      size="xs"
                      name={message.type === 'user' ? 'You' : 'PrintChakra AI'}
                      bg={message.type === 'user' ? 'blue.500' : 'green.500'}
                    />
                    <Box
                      bg={message.type === 'user' ? userMessageBg : aiMessageBg}
                      px={4}
                      py={2}
                      borderRadius="lg"
                    >
                      <Text fontSize="sm">{message.text}</Text>
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </Text>
                    </Box>
                  </Flex>
                )}
              </Box>
            ))}

              <div ref={messagesEndRef} />
            </VStack>
          </Box>

          {isSessionActive && (
          <Box borderTopWidth="1px" p={3} bg={chatBoxBg}>
            <InputGroup size="sm" mb={3}>
              <Input
                ref={chatInputRef}
                placeholder="Type your message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyPress={handleChatInputKeyPress}
                isDisabled={isTextSending || isProcessing}
                borderRadius="md"
              />
              <InputRightElement width="3rem">
                <IconButton
                  h="1.75rem"
                  size="sm"
                  aria-label="Send message"
                  icon={<Iconify icon={FiSend} boxSize={4} />}
                  colorScheme="blue"
                  onClick={() => sendTextMessage(chatInput)}
                  isDisabled={!chatInput.trim() || isTextSending || isProcessing || isSpeaking}
                  variant="ghost"
                />
              </InputRightElement>
            </InputGroup>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              💬 Or type a message manually
            </Text>
          </Box>
          )}

          <Box borderTopWidth="1px" p={4}>
          <Flex gap={2} justify="center">
            {isSessionActive ? (
              <>
                <Button
                  leftIcon={<Iconify icon={isRecording ? FiMicOff : FiMic} boxSize={5} />}
                  colorScheme={isRecording ? 'red' : 'green'}
                  onClick={isRecording ? stopRecording : startRecording}
                  isDisabled={isProcessing || isTextSending || isSpeaking}
                  flex={1}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </Button>
                <IconButton
                  aria-label="End session"
                  icon={<Iconify icon={FiX} boxSize={5} />}
                  colorScheme="red"
                  variant="outline"
                  onClick={endSession}
                />
              </>
            ) : (
              <Button
                leftIcon={<Iconify icon={FiMic} boxSize={5} />}
                colorScheme="blue"
                onClick={startSession}
                flex={1}
              >
                Start Voice Session
              </Button>
            )}
          </Flex>

          <VStack spacing={1} mt={2}>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Powered by Whisper & Smollm2 + Indian English TTS
            </Text>
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Voice: Microsoft Ravi • Hands-free
            </Text>
          </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
};

export default VoiceAIChat;
