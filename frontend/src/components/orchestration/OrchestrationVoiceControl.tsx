/**
 * OrchestrationVoiceControl Component
 * Compact voice AI assistant embedded in the Orchestration Modal
 * Handles commands like "scroll down", "select document", "apply settings"
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
}

const OrchestrationVoiceControl: React.FC<OrchestrationVoiceControlProps> = ({
  mode,
  onCommand,
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
      });

      if (response.data.success) {
        const transcription = response.data.transcription;
        setLastCommand(transcription);

        // Get AI response
        const chatResponse = await apiClient.post('/voice/chat', {
          message: transcription,
          context: `orchestration-${mode}`,
        });

        if (chatResponse.data.success) {
          const aiText = chatResponse.data.response;
          setAiResponse(aiText);

          // Parse command from AI response or transcription
          parseAndExecuteCommand(transcription, aiText);
        }
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process voice command',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const parseAndExecuteCommand = (transcription: string, aiResponse: string) => {
    const text = transcription.toLowerCase();

    // Document selection commands
    if (text.includes('select') && (text.includes('document') || text.includes('file'))) {
      onCommand('SELECT_DOCUMENT');
      return;
    }

    // Scrolling commands
    if (text.includes('scroll down') || text.includes('scroll to bottom')) {
      onCommand('SCROLL_DOWN');
      return;
    }
    if (text.includes('scroll up') || text.includes('scroll to top')) {
      onCommand('SCROLL_UP');
      return;
    }

    // Apply/Submit commands
    if (text.includes('apply') || text.includes('submit') || text.includes('continue')) {
      onCommand('APPLY_SETTINGS');
      return;
    }

    // Back/Previous commands
    if (text.includes('back') || text.includes('previous') || text.includes('go back')) {
      onCommand('GO_BACK');
      return;
    }

    // Cancel commands
    if (text.includes('cancel') || text.includes('close') || text.includes('exit')) {
      onCommand('CANCEL');
      return;
    }

    // Color mode commands
    if (text.includes('color')) {
      onCommand('SET_COLOR', { colorMode: 'color' });
      return;
    }
    if (text.includes('grayscale') || text.includes('black and white')) {
      onCommand('SET_COLOR', { colorMode: 'grayscale' });
      return;
    }

    // Layout commands
    if (text.includes('portrait')) {
      onCommand('SET_LAYOUT', { layout: 'portrait' });
      return;
    }
    if (text.includes('landscape')) {
      onCommand('SET_LAYOUT', { layout: 'landscape' });
      return;
    }

    // Resolution commands
    if (text.includes('high') && text.includes('quality')) {
      onCommand('SET_RESOLUTION', { dpi: 600 });
      return;
    }
    if (text.includes('low') && text.includes('quality')) {
      onCommand('SET_RESOLUTION', { dpi: 150 });
      return;
    }

    // OCR toggle commands
    if (text.includes('enable') && text.includes('ocr')) {
      onCommand('TOGGLE_OCR', { enabled: true });
      return;
    }
    if (text.includes('disable') && text.includes('ocr')) {
      onCommand('TOGGLE_OCR', { enabled: false });
      return;
    }

    // If no command matched, show info toast
    toast({
      title: 'Command not recognized',
      description: 'Try: "select document", "scroll down", "apply settings"',
      status: 'info',
      duration: 3000,
    });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !isSessionActive) {
      startSession();
    }
  };

  const handleTextCommand = async () => {
    if (!textInput.trim()) return;

    setIsTextSending(true);
    setLastCommand(textInput);

    try {
      // Send text directly to chat endpoint
      const chatResponse = await apiClient.post('/voice/chat', {
        message: textInput,
        context: `orchestration-${mode}`,
      });

      if (chatResponse.data.success) {
        const aiText = chatResponse.data.response;
        setAiResponse(aiText);

        // Parse and execute command
        parseAndExecuteCommand(textInput, aiText);
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
        />
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
              <Text>• "Color/Grayscale" - Change color mode</Text>
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
