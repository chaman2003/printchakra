import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Tag,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
  Badge,
  Grid,
  Divider,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiX, FiSettings, FiCpu, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import Iconify from './Iconify';
import apiClient from '../apiClient';
import { useSocket } from '../context/SocketContext';

const MotionBox = motion(Box);

interface OrchestrationState {
  current_state: string;
  pending_action: any;
  selected_document: any;
  configuration: {
    print: any;
    scan: any;
  };
  message: string;
}

interface OrchestrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrchestrationOverlay: React.FC<OrchestrationOverlayProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<OrchestrationState | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [skipModeSelection, setSkipModeSelection] = useState(false);
  const { isOpen: isModalOpen, onOpen: onModalOpen, onClose: onModalClose } = useDisclosure();
  const { socket } = useSocket();

  const panelBg = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  const borderColor = useColorModeValue('brand.200', 'nebula.700');
  const accentBg = useColorModeValue('brand.50', 'whiteAlpha.100');

  // Fetch current orchestration status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await apiClient.get('/orchestrate/status');
      if (response.data.success) {
        setState(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch orchestration status:', error);
    }
  }, []);

  // Listen for orchestration updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: any) => {
      console.log('🔄 Orchestration update received:', data);

      // Check if this is a voice-triggered orchestration
      if (data.open_ui) {
        console.log('🎤 Voice-triggered orchestration detected');
        setVoiceMode(true);
        setSkipModeSelection(data.skip_mode_selection || false);
        onModalOpen(); // Open the modal automatically
      }

      fetchStatus(); // Refresh status when updates occur
    };

    socket.on('orchestration_update', handleUpdate);

    return () => {
      socket.off('orchestration_update', handleUpdate);
    };
  }, [socket, fetchStatus, onModalOpen]);

  // Fetch status on mount
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/orchestrate/confirm');
      if (response.data.success) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to confirm action:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/orchestrate/cancel');
      if (response.data.success) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to cancel action:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/orchestrate/reset');
      if (response.data.success) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Failed to reset orchestrator:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (workflowState: string) => {
    switch (workflowState) {
      case 'idle':
        return 'gray';
      case 'awaiting_confirmation':
        return 'orange';
      case 'executing':
        return 'blue';
      case 'configuring':
        return 'purple';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Modal
      isOpen={isOpen || isModalOpen}
      onClose={() => {
        onClose();
        onModalClose();
        setVoiceMode(false);
      }}
      size={expanded ? 'full' : 'xl'}
      isCentered
    >
      <ModalOverlay backdropFilter="blur(10px)" bg="blackAlpha.600" />
      <ModalContent
        bg={panelBg}
        border={`2px solid ${borderColor}`}
        borderRadius="2xl"
        boxShadow="0 25px 50px rgba(0, 0, 0, 0.5)"
        maxH={expanded ? '100vh' : '85vh'}
      >
        <ModalHeader
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          borderBottom="1px solid"
          borderColor={borderColor}
          py={4}
        >
          <Flex align="center" gap={3}>
            <Box
              bgGradient="linear(to-r, brand.400, nebula.400)"
              borderRadius="lg"
              p={2}
              color="white"
            >
              <Iconify icon={FiCpu} boxSize={6} />
            </Box>
            <VStack align="start" spacing={0}>
              <Text fontSize="xl" fontWeight="bold">
                AI Orchestration {voiceMode && '🎤'}
              </Text>
              <Text fontSize="sm" color="gray.500" fontWeight="normal">
                {voiceMode ? 'Voice-assisted workflow' : 'Intelligent print & scan control'}
              </Text>
            </VStack>
          </Flex>
          <HStack>
            <Tooltip label={expanded ? 'Collapse' : 'Expand'}>
              <IconButton
                aria-label="Toggle size"
                icon={<Iconify icon={expanded ? FiMinimize2 : FiMaximize2} boxSize={5} />}
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
              />
            </Tooltip>
            <ModalCloseButton position="relative" top={0} right={0} />
          </HStack>
        </ModalHeader>

        <ModalBody py={6} overflowY="auto">
          {state ? (
            <Stack spacing={6}>
              {/* Current Status */}
              <Box
                bg={accentBg}
                borderRadius="xl"
                p={4}
                border="1px solid"
                borderColor={borderColor}
              >
                <Flex align="center" justify="space-between" mb={3}>
                  <Text fontWeight="bold" fontSize="lg">
                    Current Status
                  </Text>
                  <Badge
                    colorScheme={getStateColor(state.current_state)}
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    {state.current_state.replace('_', ' ').toUpperCase()}
                  </Badge>
                </Flex>
                {state.message && (
                  <Box>
                    <Text color="gray.600" fontSize="md" mb={2}>
                      {state.message}
                    </Text>
                    {voiceMode && state.current_state === 'configuring' && (
                      <Box
                        mt={3}
                        p={3}
                        bg="blue.50"
                        borderRadius="lg"
                        border="1px solid"
                        borderColor="blue.200"
                      >
                        <Text fontSize="sm" fontWeight="600" color="blue.700" mb={2}>
                          💡 Voice Mode Tips:
                        </Text>
                        <Stack spacing={1} fontSize="xs" color="blue.600">
                          <Text>• "Set to landscape" or "Change orientation to landscape"</Text>
                          <Text>• "Print 3 copies" or "Change copies to 3"</Text>
                          <Text>• "Use color mode" or "Switch to color"</Text>
                          <Text>• "Double sided" or "Enable duplex"</Text>
                          <Text>• "Scan at 600 DPI" or "Set resolution to 600"</Text>
                          <Text>• Say "That's all" or "No changes" when ready to proceed</Text>
                        </Stack>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              {/* Pending Action */}
              {state.pending_action && (
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Box
                    bg="orange.50"
                    borderRadius="xl"
                    p={5}
                    border="2px solid"
                    borderColor="orange.300"
                    boxShadow="0 4px 12px rgba(237, 137, 54, 0.2)"
                  >
                    <Flex align="center" gap={2} mb={3}>
                      <Iconify icon={FiSettings} color="orange.500" boxSize={6} />
                      <Text fontWeight="bold" fontSize="lg" color="orange.700">
                        Action Pending Confirmation
                      </Text>
                    </Flex>

                    <Stack spacing={3}>
                      <HStack>
                        <Text fontWeight="600">Type:</Text>
                        <Tag colorScheme="orange" size="lg">
                          {state.pending_action.type.toUpperCase()}
                        </Tag>
                      </HStack>

                      {state.pending_action.document && (
                        <Box>
                          <Text fontWeight="600" mb={2}>
                            Document:
                          </Text>
                          <Box
                            bg="white"
                            borderRadius="lg"
                            p={3}
                            border="1px solid"
                            borderColor="gray.200"
                          >
                            <Text fontSize="sm" fontWeight="600">
                              {state.pending_action.document.filename}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              Size: {(state.pending_action.document.size / 1024).toFixed(2)} KB
                            </Text>
                          </Box>
                        </Box>
                      )}

                      {state.pending_action.configuration && (
                        <Box>
                          <Text fontWeight="600" mb={2}>
                            Configuration:
                          </Text>
                          <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                            {Object.entries(state.pending_action.configuration).map(
                              ([key, value]) => (
                                <Box
                                  key={key}
                                  bg="white"
                                  borderRadius="lg"
                                  p={3}
                                  border="1px solid"
                                  borderColor="gray.200"
                                >
                                  <Text fontSize="xs" color="gray.500" textTransform="uppercase">
                                    {key.replace('_', ' ')}
                                  </Text>
                                  <Text fontSize="sm" fontWeight="600">
                                    {String(value)}
                                  </Text>
                                </Box>
                              )
                            )}
                          </Grid>
                        </Box>
                      )}
                    </Stack>

                    <Divider my={4} />

                    <HStack spacing={3} justify="center">
                      <Button
                        colorScheme="green"
                        leftIcon={<Iconify icon={FiCheck} boxSize={5} />}
                        onClick={handleConfirm}
                        isLoading={loading}
                        size="lg"
                        px={8}
                      >
                        Confirm & Execute
                      </Button>
                      <Button
                        colorScheme="red"
                        variant="outline"
                        leftIcon={<Iconify icon={FiX} boxSize={5} />}
                        onClick={handleCancel}
                        isLoading={loading}
                        size="lg"
                      >
                        Cancel
                      </Button>
                    </HStack>
                  </Box>
                </MotionBox>
              )}

              {/* Selected Document */}
              {state.selected_document && !state.pending_action && (
                <Box
                  bg={accentBg}
                  borderRadius="xl"
                  p={4}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <Text fontWeight="bold" fontSize="md" mb={3}>
                    Selected Document
                  </Text>
                  <Box bg="white" borderRadius="lg" p={3} border="1px solid" borderColor="gray.200">
                    <Text fontSize="sm" fontWeight="600">
                      {state.selected_document.filename}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {(state.selected_document.size / 1024).toFixed(2)} KB
                    </Text>
                  </Box>
                </Box>
              )}

              {/* Configuration */}
              <Box
                bg={accentBg}
                borderRadius="xl"
                p={4}
                border="1px solid"
                borderColor={borderColor}
              >
                <Text fontWeight="bold" fontSize="md" mb={3}>
                  Default Configuration
                </Text>
                <Stack spacing={3}>
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color="gray.600" mb={2}>
                      Print Settings
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                      {Object.entries(state.configuration.print).map(([key, value]) => (
                        <Flex key={key} justify="space-between" fontSize="xs">
                          <Text color="gray.500">{key.replace('_', ' ')}:</Text>
                          <Text fontWeight="600">{String(value)}</Text>
                        </Flex>
                      ))}
                    </Grid>
                  </Box>
                  <Divider />
                  <Box>
                    <Text fontSize="sm" fontWeight="600" color="gray.600" mb={2}>
                      Scan Settings
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                      {Object.entries(state.configuration.scan).map(([key, value]) => (
                        <Flex key={key} justify="space-between" fontSize="xs">
                          <Text color="gray.500">{key.replace('_', ' ')}:</Text>
                          <Text fontWeight="600">{String(value)}</Text>
                        </Flex>
                      ))}
                    </Grid>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Flex justify="center" align="center" minH="200px">
              <Text color="gray.500">Loading orchestration state...</Text>
            </Flex>
          )}
        </ModalBody>

        <ModalFooter borderTop="1px solid" borderColor={borderColor}>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleReset} isDisabled={loading}>
              Reset State
            </Button>
            <Button colorScheme="brand" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OrchestrationOverlay;
