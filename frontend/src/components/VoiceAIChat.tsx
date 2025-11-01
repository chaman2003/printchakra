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
import apiClient from '../apiClient';
import { convertToWAV, isValidAudioBlob, getAudioDuration } from '../utils/audioUtils';
import Iconify from './Iconify';

interface VoiceMessage {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  count?: number; // Track how many times this message has been repeated
}

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
    setMessages(prev => {
      // Get the last message
      const lastMessage = prev[prev.length - 1];

      // Check if this is a duplicate of the last system message
      if (
        lastMessage &&
        lastMessage.type === type &&
        lastMessage.text === text &&
        type === 'system'
      ) {
        // Increment the counter for this duplicate message
        const newCount = (lastMessage.count || 1) + 1;
        const updatedMessage = { ...lastMessage, count: newCount };

        // Replace the last message with the updated count
        return [...prev.slice(0, -1), updatedMessage];
      }

      // Otherwise, add a new message
      const message: VoiceMessage = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: new Date().toISOString(),
        count: 1, // Initialize count to 1
      };
      return [...prev, message];
    });
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
        setSessionStatus('Ready - Say wake word first!');
        addMessage(
          'system',
          '🎙️ Voice AI Ready! You MUST say "Hey", "Hi", "Hello", or "Okay" before each command. Example: "Hey, what time is it?". Say "bye printchakra" to end.'
        );

        // Close previous toast if exists
        if (toastIdRef.current) {
          toast.close(toastIdRef.current);
        }

        toastIdRef.current = toast({
          title: 'Voice AI Ready',
          description: 'Start with: Hey, Hi, Hello, or Okay',
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
    // Block recording if TTS is currently speaking
    if (isSpeaking) {
      console.log('🔊 TTS is speaking - blocking recording');
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Optimal for Whisper
          channelCount: 1, // Mono audio
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
        audioBitsPerSecond: 128000,
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
          const { hasVoiceActivity } = await import('../utils/audioUtils');
          const hasVoice = await hasVoiceActivity(audioBlob, 0.015);

          if (!hasVoice) {
            console.log('⏭️ No voice detected in audio - skipping processing');
            // Don't show annoying "no voice" message - just silently retry

            // Auto-restart recording for continuous listening
            if (isSessionActive) {
              setTimeout(() => startRecording(), 300);
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

          // Auto-restart recording on error
          if (isSessionActive) {
            setTimeout(() => startRecording(), 1000);
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

      // Auto-stop after 5 seconds (configurable)
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 5000);
    } catch (error: any) {
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
      console.log('🔊 TTS is speaking - skipping audio processing');
      // Auto-restart recording after TTS finishes
      return;
    }

    try {
      setIsProcessing(true);
      setSessionStatus('Transcribing audio (checking for "hey" keyword)...');

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

      // Check for wake word missing first
      if (response.data.wake_word_missing) {
        console.log('⏭️ Wake word missing - prompting user');

        const transcribedText =
          response.data.user_text || response.data.full_text || 'your command';
        addMessage('system', `🎤 Heard: "${transcribedText}"`);
        addMessage(
          'system',
          '⚠️ Please say "Hey", "Hi", "Hello", or "Okay" first to talk with PrintChakra AI'
        );

        setSessionStatus('Waiting for wake word...');
        setIsProcessing(false);

        // Continue recording
        setTimeout(() => startRecording(), 1000);
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
        } = response.data;

        // Add full transcription as system message
        addMessage('system', `🎤 Heard: "${full_text || user_text}"`);

        // Add user message (command part only)
        addMessage('user', user_text);

        // 1. Display AI response FIRST
        addMessage('ai', ai_response);

        setIsProcessing(false);

        // Check for orchestration trigger BEFORE TTS
        if (orchestration_trigger && orchestration_mode) {
          console.log(
            `🎯 Orchestration triggered: ${orchestration_mode}`,
            config_params || {}
          );

          // Show notification about orchestration
          toast({
            title: `${orchestration_mode === 'print' ? '🖨️' : '📸'} Opening ${orchestration_mode.charAt(0).toUpperCase() + orchestration_mode.slice(1)} Interface`,
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

        // 2. THEN play TTS (blocking - no input allowed)
        setIsSpeaking(true);
        setSessionStatus('🔊 Speaking response...');

        try {
          await apiClient.post(
            '/voice/speak',
            {
              text: ai_response,
            },
            {
              timeout: 60000,
            }
          );
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
          // Continue even if TTS fails
        } finally {
          setIsSpeaking(false);
          setSessionStatus('Ready - Say "hey" to trigger AI');
          // Focus chat input after TTS completes
          setTimeout(() => {
            chatInputRef.current?.focus();
          }, 100);
        }

        // Check if session should end
        if (session_ended) {
          setIsSessionActive(false);
          addMessage('system', 'Voice session ended. Thank you!');

          toast({
            title: 'Session Ended',
            description: 'Goodbye!',
            status: 'info',
            duration: 3000,
          });
        } else {
          // Continue recording for next input (after TTS finishes)
          setTimeout(() => startRecording(), 1000);
        }
      } else if (response.data.skipped) {
        // Audio was transcribed but "hey" keyword was not found
        const transcribedText = response.data.user_text;

        console.log(`⏭️ Audio skipped - no "hey" keyword detected`);
        console.log(`   Transcribed: "${transcribedText}"`);

        // Only show message if not silent
        if (!response.data.silent) {
          addMessage('system', `🎤 Heard: "${transcribedText}" (no "hey" - skipped)`);
        }

        setSessionStatus('Ready - Say "hey" to trigger AI');

        // Continue recording
        setTimeout(() => startRecording(), 500);
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
        setSessionStatus('Ready - Say "hey" to trigger AI');

        // Auto-restart recording after keyword error
        setTimeout(() => startRecording(), 300);
      } else {
        // Only show non-retryable errors
        console.error('Transcription error:', errorMessage);

        // Don't show file access errors - just retry silently
        if (errorMessage.includes('process cannot access') || errorMessage.includes('being used')) {
          console.log('⏭️ File access error, retrying...');
          setSessionStatus('Ready - Say "hey" to trigger AI');

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

          setSessionStatus('Ready - Say "hey" to trigger AI');

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

        // 1. Display AI message FIRST
        addMessage('ai', aiResponse);
        setIsProcessing(false);

        // Check for orchestration trigger BEFORE TTS
        if (orchestrationTrigger && orchestrationMode) {
          console.log(`🎯 Orchestration triggered: ${orchestrationMode}`, configParams || {});

          // Show notification
          toast({
            title: `${orchestrationMode === 'print' ? '🖨️' : '📸'} Opening ${orchestrationMode.charAt(0).toUpperCase() + orchestrationMode.slice(1)} Interface`,
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
        setSessionStatus('🔊 Speaking response...');

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
          setSessionStatus('Ready - Say "hey" to trigger AI');
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
                          <Text>🔊 Speaking</Text>
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
            <Text fontSize="xs" color="gray.400" textAlign="center">
              🔊 Voice: Microsoft Ravi • 🎙️ Hands-free
            </Text>
          </VStack>
          </Box>
        </>
      )}
    </VStack>
  );
};

export default VoiceAIChat;
