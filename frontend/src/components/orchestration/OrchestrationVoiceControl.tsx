/**
 * OrchestrationVoiceControl Component
 * Compact voice AI assistant embedded in the Orchestration Modal
 * Handles commands like "scroll down", "select document", "apply settings"
 * 
 * Uses the SAME flow as VoiceAIChat - relies on backend's voice_command/command_params
 * for consistent behavior between text and voice inputs.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  VStack,
  HStack,
  useToast,
  Badge,
  Collapse,
  useColorModeValue,
  Tooltip,
  Progress,
  Input,
  InputGroup,
  InputRightElement,
} from '@chakra-ui/react';
import apiClient from '../../apiClient';
import { convertToWAV, isValidAudioBlob, getAudioDuration } from '../../utils/audioUtils';
import Iconify from '../common/Iconify';

interface OrchestrationVoiceControlProps {
  mode: 'print' | 'scan';
  onCommand: (command: string, params?: any) => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
}

const OrchestrationVoiceControl: React.FC<OrchestrationVoiceControlProps> = ({
  mode,
  onCommand,
  currentStep = 1,
  onStepChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [isTextSending, setIsTextSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const toast = useToast();

  // Color mode values
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('brand.300', 'brand.600');
  const commandBg = useColorModeValue('purple.50', 'purple.900');
  const responseBg = useColorModeValue('gray.50', 'gray.700');
  const inputBg = useColorModeValue('white', 'gray.700');

  // Start voice AI session when component mounts
  useEffect(() => {
    if (isExpanded && !isSessionActive) {
      startSession();
    }
  }, [isExpanded, isSessionActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (isSessionActive) {
        endSession();
      }
    };
  }, []);

  const startSession = async () => {
    try {
      const response = await apiClient.post('/voice/start', {
        context: `orchestration-${mode}`,
      });
      if (response.data.success) {
        setIsSessionActive(true);
        setAiResponse(`Voice control active for ${mode} mode. Say commands like "select document" or "scroll down".`);
      }
    } catch (error) {
      console.error('Failed to start voice session:', error);
      toast({
        title: 'Voice Control Error',
        description: 'Failed to start voice session',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const endSession = async () => {
    try {
      await apiClient.post('/voice/end');
      setIsSessionActive(false);
      setLastCommand('');
      setAiResponse('');
    } catch (error) {
      console.error('Failed to end voice session:', error);
    }
  };

  const startRecording = async () => {
    try {
      if (!isSessionActive) {
        await startSession();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: 'Recording Error',
        description: 'Could not access microphone',
        status: 'error',
        duration: 3000,
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
    setIsProcessing(true);

    try {
      // Convert to WAV
      const wavBlob = await convertToWAV(audioBlob);

      if (!isValidAudioBlob(wavBlob)) {
        throw new Error('Invalid audio format');
      }

      // Send to backend for transcription
      const formData = new FormData();
      formData.append('audio', wavBlob, 'audio.wav');
      formData.append('context', `orchestration-${mode}`);

      const response = await apiClient.post('/voice/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutes for voice processing
      });

      if (response.data.success) {
        const {
          user_text,
          full_text,
          ai_response,
          voice_command,
          command_params,
        } = response.data;

        // Set what user said
        setLastCommand(full_text || user_text || response.data.transcription || '');
        
        // Set AI response
        setAiResponse(ai_response || response.data.response || '');

        // Execute command from backend response (same as VoiceAIChat)
        if (voice_command) {
          console.log(`Voice command detected: ${voice_command}`, command_params);
          executeCommand(voice_command, command_params || {});
        } else {
          // No command detected by backend
          toast({
            title: 'Command not recognized',
            description: 'Try: "select document", "scroll down", "apply settings", "landscape", "color mode"',
            status: 'info',
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Audio processing error:', error);
      const _errMsg = error?.response?.data?.error || error?.message || String(error);
      if (typeof _errMsg === 'string' && /decode/i.test(_errMsg)) {
        console.warn('Audio decode failure suppressed (not shown to user):', _errMsg);
      } else {
        toast({
          title: 'Processing Error',
          description: 'Failed to process voice command',
          status: 'error',
          duration: 3000,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Execute command from backend response
   * This is the SAME logic used by VoiceAIChat - backend provides the command
   */
  const executeCommand = (voiceCommand: string, params: Record<string, any>) => {
    // Normalize command name (backend uses snake_case, frontend uses SCREAMING_SNAKE_CASE)
    const normalizedCommand = voiceCommand.toUpperCase().replace(/-/g, '_');
    
    // Map backend command to orchestration command
    const commandMap: Record<string, string> = {
      // Document selection
      'SELECT_DOCUMENT': 'SELECT_DOCUMENT',
      'DESELECT_DOCUMENT': 'DESELECT_DOCUMENT',
      'SELECT_MULTIPLE_DOCUMENTS': 'SELECT_DOCUMENT',
      'SELECT_DOCUMENT_RANGE': 'SELECT_DOCUMENT',
      'SELECT_SPECIFIC_DOCUMENTS': 'SELECT_DOCUMENT',
      'SWITCH_SECTION': 'SWITCH_SECTION',
      'NEXT_DOCUMENT': 'NEXT_DOCUMENT',
      'PREV_DOCUMENT': 'PREV_DOCUMENT',
      // Navigation
      'SCROLL_DOWN': 'SCROLL_DOWN',
      'SCROLL_UP': 'SCROLL_UP',
      'PROCEED_ACTION': 'APPLY_SETTINGS',
      'APPLY_SETTINGS': 'APPLY_SETTINGS',
      'GO_BACK': 'GO_BACK',
      'UNDO_ACTION': 'GO_BACK',
      'CANCEL': 'CANCEL',
      'CONFIRM': 'CONFIRM',
      // Print/Scan settings
      'SET_LAYOUT': 'SET_LAYOUT',
      'SET_COLOR_MODE': 'SET_COLOR_MODE',
      'SET_PAPER_SIZE': 'SET_PAPER_SIZE',
      'SET_RESOLUTION': 'SET_RESOLUTION',
      'SET_COPIES': 'SET_COPIES',
      'SET_DUPLEX': 'SET_DUPLEX',
      'SET_QUALITY': 'SET_QUALITY',
      'SET_PAGES': 'SET_PAGES',
      'SET_FEED_COUNT': 'FEED_DOCUMENTS',
      'TOGGLE_OCR': 'TOGGLE_OCR',
      'TOGGLE_TEXT_MODE': 'TOGGLE_TEXT_MODE',
      // System
      'HELP': 'HELP',
      'STATUS': 'STATUS',
      'FEED_DOCUMENTS': 'FEED_DOCUMENTS',
      'CLEAR_PRINT_QUEUE': 'CLEAR_PRINT_QUEUE',
    };

    const mappedCommand = commandMap[normalizedCommand] || normalizedCommand;
    
    // Execute the command
    onCommand(mappedCommand, params);

    // Handle step changes for specific commands
    if (normalizedCommand === 'APPLY_SETTINGS' || normalizedCommand === 'PROCEED_ACTION' || normalizedCommand === 'CONTINUE') {
      if (onStepChange && currentStep < 3) {
        onStepChange(currentStep + 1);
      }
    } else if (normalizedCommand === 'GO_BACK' || normalizedCommand === 'UNDO_ACTION') {
      if (onStepChange && currentStep > 1) {
        onStepChange(currentStep - 1);
      }
    }

    // Show feedback
    toast({
      title: `Command: ${voiceCommand.replace(/_/g, ' ')}`,
      description: Object.keys(params).length > 0
        ? `Parameters: ${JSON.stringify(params)}`
        : 'Executing...',
      status: 'info',
      duration: 2000,
    });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !isSessionActive) {
      startSession();
    }
  };

  const handleClose = useCallback((e?: React.MouseEvent) => {
    // Prevent event from bubbling up
    if (e) {
      e.stopPropagation();
    }
    setIsExpanded(false);
  }, []);

  const handleTextCommand = async () => {
    if (!textInput.trim()) return;

    setIsTextSending(true);
    setLastCommand(textInput);

    try {
      // Send text directly to chat endpoint (same as VoiceAIChat.sendTextMessage)
      const response = await apiClient.post('/voice/chat', {
        message: textInput,
        context: `orchestration-${mode}`,
      }, {
        timeout: 30000,
      });

      if (response.data.success) {
        const aiResponse = response.data.response;
        const voiceCommand = response.data.voice_command;
        const commandParams = response.data.command_params;

        // Set AI response
        setAiResponse(aiResponse);

        // Execute command from backend response (same as VoiceAIChat)
        if (voiceCommand) {
          console.log(`Text command detected: ${voiceCommand}`, commandParams);
          executeCommand(voiceCommand, commandParams || {});
        } else {
          // No command detected by backend
          toast({
            title: 'Command not recognized',
            description: 'Try: "select document", "scroll down", "apply settings", "landscape", "color mode"',
            status: 'info',
            duration: 3000,
          });
        }
      }
    } catch (error) {
      console.error('Text command error:', error);
      toast({
        title: 'Command Error',
        description: 'Failed to process text command',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsTextSending(false);
      setTextInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isTextSending) {
      handleTextCommand();
    }
  };

  return (
    <Box
      position="relative"
      mb={4}
      p={4}
      bg={bgColor}
      borderRadius="xl"
      border="2px solid"
      borderColor={borderColor}
      boxShadow="0 4px 12px rgba(121,95,238,0.15)"
    >
      {/* Header - Always Visible */}
      <Flex
        align="center"
        justify="space-between"
        cursor="pointer"
        onClick={toggleExpanded}
        _hover={{ opacity: 0.8 }}
        transition="all 0.2s"
        mb={isExpanded ? 3 : 0}
      >
        <HStack spacing={3} flex={1}>
          <Box
            p={2}
            bg="brand.500"
            borderRadius="lg"
            color="white"
            animation={isRecording ? 'pulse 1.5s infinite' : undefined}
          >
            <Iconify icon="solar:microphone-3-bold-duotone" width={20} height={20} />
          </Box>
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="bold" fontSize="md">
              🎤 Voice Control
            </Text>
            <Text fontSize="xs" color="text.muted">
              {isSessionActive ? 'Active - Say a command' : 'Click to activate'}
            </Text>
          </VStack>
          {isRecording && (
            <Badge colorScheme="red" fontSize="xs" px={2} whiteSpace="nowrap">
              Recording...
            </Badge>
          )}
        </HStack>
        <IconButton
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          icon={
            isExpanded ? (
              <Iconify icon="solar:chevron-up-bold" width={20} height={20} />
            ) : (
              <Iconify icon="solar:chevron-down-bold" width={20} height={20} />
            )
          }
          size="sm"
          variant="ghost"
          ml={2}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
        />
        {isExpanded && (
          <IconButton
            aria-label="Close AI Assist"
            icon={<Iconify icon="solar:close-circle-bold-duotone" width={20} height={20} />}
            size="sm"
            variant="ghost"
            colorScheme="red"
            ml={1}
            onClick={handleClose}
            _hover={{
              bg: 'rgba(255,0,0,0.1)',
              transform: 'scale(1.1)',
            }}
            transition="all 0.2s"
          />
        )}
      </Flex>

      {/* Expandable Content */}
      <Collapse in={isExpanded}>
        <VStack spacing={3} align="stretch" pt={2} borderTop="1px solid" borderColor="whiteAlpha.200">
          {/* Voice Control Button */}
          <Flex justify="center" py={2}>
            <Tooltip
              label={
                isRecording
                  ? 'Click to stop recording'
                  : 'Click to start recording'
              }
              placement="top"
            >
              <Box>
                <IconButton
                  aria-label="Voice control"
                  icon={
                    isRecording ? (
                      <Iconify icon="solar:microphone-slash-bold-duotone" width={28} height={28} />
                    ) : (
                      <Iconify icon="solar:microphone-3-bold-duotone" width={28} height={28} />
                    )
                  }
                  colorScheme={isRecording ? 'red' : 'brand'}
                  size="lg"
                  isRound
                  boxSize="60px"
                  onClick={isRecording ? stopRecording : startRecording}
                  isDisabled={isProcessing}
                  boxShadow={isRecording ? '0 0 20px rgba(255,0,0,0.4)' : 'lg'}
                  _hover={{
                    transform: 'scale(1.1)',
                    boxShadow: '0 8px 25px rgba(121,95,238,0.4)',
                  }}
                  transition="all 0.3s"
                />
              </Box>
            </Tooltip>
          </Flex>

          {/* Text Input - For Testing */}
          <Box>
            <Text fontSize="xs" fontWeight="bold" color="text.muted" mb={2} textAlign="center">
              Or type your command:
            </Text>
            <InputGroup size="md">
              <Input
                placeholder="Type command (e.g., 'select document')"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={handleKeyPress}
                isDisabled={isTextSending || isProcessing}
                bg={inputBg}
                borderColor="brand.300"
                _focus={{
                  borderColor: 'brand.500',
                  boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                }}
                _hover={{
                  borderColor: 'brand.400',
                }}
              />
              <InputRightElement>
                <IconButton
                  aria-label="Send command"
                  icon={<Iconify icon="solar:send-bold-duotone" width={20} height={20} />}
                  size="sm"
                  colorScheme="brand"
                  onClick={handleTextCommand}
                  isLoading={isTextSending}
                  isDisabled={!textInput.trim() || isProcessing}
                  variant="ghost"
                />
              </InputRightElement>
            </InputGroup>
          </Box>

          {/* Processing Indicator */}
          {(isProcessing || isTextSending) && (
            <Progress size="xs" isIndeterminate colorScheme="brand" borderRadius="full" />
          )}

          {/* Last Command */}
          {lastCommand && (
            <Box p={3} bg={commandBg} borderRadius="lg">
              <Text fontSize="xs" fontWeight="bold" color="text.muted" mb={1}>
                📝 YOU SAID:
              </Text>
              <Text fontSize="sm" fontWeight="500">
                {lastCommand}
              </Text>
            </Box>
          )}

          {/* AI Response */}
          {aiResponse && (
            <Box p={3} bg={responseBg} borderRadius="lg">
              <Text fontSize="xs" fontWeight="bold" color="text.muted" mb={1}>
                🤖 AI:
              </Text>
              <Text fontSize="sm">{aiResponse}</Text>
            </Box>
          )}

          {/* Quick Commands Guide */}
          <Box p={3} bg="whiteAlpha.50" borderRadius="lg" border="1px solid" borderColor="whiteAlpha.200">
            <Text fontSize="xs" fontWeight="bold" mb={2} color="brand.500">
              💡 Available Commands:
            </Text>
            <VStack align="start" spacing={1} fontSize="xs" color="text.muted">
              <Text>• "Select document" - Open document selector</Text>
              <Text>• "Scroll down/up" - Navigate the page</Text>
              <Text>• "Apply settings" - Continue to next step</Text>
              <Text>• "Go back" - Return to previous step</Text>
              <Text>• "Enable/disable OCR" - Toggle text detection</Text>
              <Text>• "Portrait/Landscape" - Change orientation</Text>
            </VStack>
          </Box>
        </VStack>
      </Collapse>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.05);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default OrchestrationVoiceControl;
