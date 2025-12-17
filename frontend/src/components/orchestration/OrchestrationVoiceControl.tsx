/**
 * OrchestrationVoiceControl Component
 * Compact voice AI assistant embedded in the Orchestration Modal
 * Handles commands like "scroll down", "select document", "apply settings"
 * 
 * Integrates with AI Assist command parsing for consistent command recognition
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
import { parseCommand } from '../../aiassist';

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

    // Use AI Assist command parser for consistent recognition
    const parsed = parseCommand(text);
    
    if (parsed && parsed.confidence > 0.6) {
      // Map parsed action to command
      const commandMap: Record<string, { cmd: string; params?: any }> = {
        'SELECT_DOCUMENT': { cmd: 'SELECT_DOCUMENT' },
        'SWITCH_SECTION': { cmd: 'SWITCH_SECTION', params: parsed.params },
        'NEXT_DOCUMENT': { cmd: 'NEXT_DOCUMENT' },
        'PREV_DOCUMENT': { cmd: 'PREV_DOCUMENT' },
        'SCROLL_DOWN': { cmd: 'SCROLL_DOWN' },
        'SCROLL_UP': { cmd: 'SCROLL_UP' },
        'APPLY_SETTINGS': { cmd: 'APPLY_SETTINGS' },
        'GO_BACK': { cmd: 'GO_BACK' },
        'CANCEL': { cmd: 'CANCEL' },
        'CONFIRM': { cmd: 'CONFIRM' },
        'SET_LAYOUT': { cmd: 'SET_LAYOUT', params: parsed.params },
        'SET_COLOR_MODE': { cmd: 'SET_COLOR_MODE', params: parsed.params },
        'SET_PAPER_SIZE': { cmd: 'SET_PAPER_SIZE', params: parsed.params },
        'SET_RESOLUTION': { cmd: 'SET_RESOLUTION', params: parsed.params },
        'SET_COPIES': { cmd: 'SET_COPIES', params: parsed.params },
        'SET_DUPLEX': { cmd: 'SET_DUPLEX', params: parsed.params },
        'SET_QUALITY': { cmd: 'SET_QUALITY', params: parsed.params },
        'TOGGLE_OCR': { cmd: 'TOGGLE_OCR', params: { enabled: true } },
        'TOGGLE_TEXT_MODE': { cmd: 'TOGGLE_TEXT_MODE', params: parsed.params },
        'HELP': { cmd: 'HELP' },
        'STATUS': { cmd: 'STATUS' },
      };

      const mapping = commandMap[parsed.action];
      if (mapping) {
        onCommand(mapping.cmd, mapping.params);
        return;
      }
    }

    // Fallback: Direct text matching for common commands
    // Document selection commands
    if (text.includes('select') && (text.includes('document') || text.includes('file'))) {
      onCommand('SELECT_DOCUMENT');
      return;
    }

    // Scrolling commands
    if (text.includes('scroll down') || text.includes('scroll to bottom') || text.includes('go down')) {
      onCommand('SCROLL_DOWN');
      return;
    }
    if (text.includes('scroll up') || text.includes('scroll to top') || text.includes('go up')) {
      onCommand('SCROLL_UP');
      return;
    }

    // Apply/Submit commands
    if (text.includes('apply') || text.includes('submit') || text.includes('continue') || text.includes('next')) {
      onCommand('APPLY_SETTINGS');
      if (onStepChange && currentStep < 3) {
        onStepChange(currentStep + 1);
      }
      return;
    }

    // Back/Previous commands
    if (text.includes('back') || text.includes('previous') || text.includes('go back')) {
      onCommand('GO_BACK');
      if (onStepChange && currentStep > 1) {
        onStepChange(currentStep - 1);
      }
      return;
    }

    // Cancel commands
    if (text.includes('cancel') || text.includes('close') || text.includes('exit')) {
      onCommand('CANCEL');
      return;
    }

    // Confirm commands
    if (text.includes('confirm') || text.includes('execute') || text.includes('start print') || text.includes('start scan')) {
      onCommand('CONFIRM');
      return;
    }

    // Color mode commands
    if (text.includes('grayscale') || text.includes('grey') || text.includes('gray')) {
      onCommand('SET_COLOR_MODE', { colorMode: 'grayscale' });
      return;
    }
    if (text.includes('black and white') || text.includes('black & white') || text.includes('monochrome')) {
      onCommand('SET_COLOR_MODE', { colorMode: 'bw' });
      return;
    }
    if (text.includes('full color') || (text.includes('color') && !text.includes('grayscale'))) {
      onCommand('SET_COLOR_MODE', { colorMode: 'color' });
      return;
    }

    // Layout commands
    if (text.includes('portrait') || text.includes('vertical')) {
      onCommand('SET_LAYOUT', { layout: 'portrait' });
      return;
    }
    if (text.includes('landscape') || text.includes('horizontal')) {
      onCommand('SET_LAYOUT', { layout: 'landscape' });
      return;
    }

    // Resolution/Quality commands
    if (text.includes('high') && (text.includes('quality') || text.includes('resolution') || text.includes('dpi'))) {
      onCommand('SET_RESOLUTION', { resolution: 600 });
      onCommand('SET_QUALITY', { quality: 'high' });
      return;
    }
    if (text.includes('low') && (text.includes('quality') || text.includes('resolution') || text.includes('dpi'))) {
      onCommand('SET_RESOLUTION', { resolution: 150 });
      onCommand('SET_QUALITY', { quality: 'draft' });
      return;
    }
    if (text.includes('300') && text.includes('dpi')) {
      onCommand('SET_RESOLUTION', { resolution: 300 });
      return;
    }
    if (text.includes('600') && text.includes('dpi')) {
      onCommand('SET_RESOLUTION', { resolution: 600 });
      return;
    }

    // OCR toggle commands
    if ((text.includes('enable') || text.includes('turn on')) && (text.includes('ocr') || text.includes('text'))) {
      onCommand('TOGGLE_OCR', { enabled: true });
      return;
    }
    if ((text.includes('disable') || text.includes('turn off')) && (text.includes('ocr') || text.includes('text'))) {
      onCommand('TOGGLE_OCR', { enabled: false });
      return;
    }

    // Copies command
    const copiesMatch = text.match(/(\d+)\s*(copies|copy)/);
    if (copiesMatch) {
      onCommand('SET_COPIES', { copies: parseInt(copiesMatch[1], 10) });
      return;
    }

    // Duplex command
    if (text.includes('double sided') || text.includes('duplex') || text.includes('both sides')) {
      onCommand('SET_DUPLEX', { duplex: true });
      return;
    }
    if (text.includes('single sided') || text.includes('one side')) {
      onCommand('SET_DUPLEX', { duplex: false });
      return;
    }

    // If no command matched, show info toast
    toast({
      title: 'Command not recognized',
      description: 'Try: "select document", "scroll down", "apply settings", "landscape", "color mode"',
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
