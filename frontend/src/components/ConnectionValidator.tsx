import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Spinner,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Progress,
  Flex,
  useToast,
} from '@chakra-ui/react';
import { FiCheckCircle, FiXCircle, FiWifi, FiCamera, FiPrinter } from 'react-icons/fi';
import api from '../apiClient';

interface ValidationStep {
  id: string;
  label: string;
  description: string;
  icon: any;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

interface ConnectionValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onStatusComplete?: (allConnected: boolean) => void;
}

const ConnectionValidator: React.FC<ConnectionValidatorProps> = ({
  isOpen,
  onClose,
  videoRef,
  onStatusComplete,
}) => {
  const toast = useToast();
  const [steps, setSteps] = useState<ValidationStep[]>([
    {
      id: 'connection',
      label: 'Phone ↔ Laptop',
      description: 'Verifying WiFi connection',
      icon: FiWifi,
      status: 'pending',
    },
    {
      id: 'camera',
      label: videoRef ? 'Phone Camera' : 'Phone Ready (Camera)',
      description: videoRef ? 'Validating camera feed' : 'Camera check skipped',
      icon: FiCamera,
      status: 'pending',
    },
    {
      id: 'printer',
      label: 'Laptop ↔ Printer',
      description: 'Testing printer connection',
      icon: FiPrinter,
      status: 'pending',
    },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [allComplete, setAllComplete] = useState(false);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const successColor = useColorModeValue('green.500', 'green.400');
  const errorColor = useColorModeValue('red.500', 'red.400');
  const loadingColor = useColorModeValue('blue.500', 'blue.400');

  const updateStepStatus = (
    stepId: string,
    status: 'pending' | 'loading' | 'success' | 'error',
    error?: string
  ) => {
    setSteps(prev => prev.map(step => (step.id === stepId ? { ...step, status, error } : step)));
  };

  const validateConnection = async (): Promise<boolean> => {
    updateStepStatus('connection', 'loading');
    try {
      const response = await api.get('/validate/connection');
      if (response.data.success && response.data.connected) {
        updateStepStatus('connection', 'success');
        return true;
      } else {
        updateStepStatus('connection', 'error', 'Connection failed');
        return false;
      }
    } catch (error: any) {
      updateStepStatus('connection', 'error', error.response?.data?.error || 'Network error');
      return false;
    }
  };

  const validateCamera = async (): Promise<boolean> => {
    updateStepStatus('camera', 'loading');

    // Skip camera validation if no videoRef provided (Dashboard page)
    if (!videoRef) {
      updateStepStatus('camera', 'success', undefined);
      return true;
    }

    try {
      // Capture a frame from the video element
      if (!videoRef.current) {
        updateStepStatus('camera', 'success', undefined);
        return true;
      }

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        updateStepStatus('camera', 'error', 'Cannot create canvas context');
        return false;
      }

      ctx.drawImage(video, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob | null>(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        updateStepStatus('camera', 'error', 'Cannot capture frame');
        return false;
      }

      // Send to backend for validation
      const formData = new FormData();
      formData.append('frame', blob, 'validation_frame.jpg');

      const response = await api.post('/validate/camera', formData);
      if (response.data.success && response.data.camera_active) {
        updateStepStatus('camera', 'success');
        return true;
      } else {
        updateStepStatus('camera', 'error', 'Camera validation failed');
        return false;
      }
    } catch (error: any) {
      updateStepStatus('camera', 'error', error.response?.data?.error || 'Camera validation error');
      return false;
    }
  };

  const validatePrinter = async (): Promise<boolean> => {
    updateStepStatus('printer', 'loading');
    try {
      const response = await api.post('/validate/printer');
      if (response.data.success && response.data.printer_connected) {
        updateStepStatus('printer', 'success');
        return true;
      } else {
        updateStepStatus('printer', 'error', response.data.error || 'Printer not connected');
        return false;
      }
    } catch (error: any) {
      updateStepStatus(
        'printer',
        'error',
        error.response?.data?.error || 'Printer validation error'
      );
      return false;
    }
  };

  const runValidation = async () => {
    // Reset
    setCurrentStep(0);
    setAllComplete(false);

    // Step 1: Connection
    setCurrentStep(0);
    const connectionOk = await validateConnection();
    await new Promise(resolve => setTimeout(resolve, 500)); // Delay for UX

    if (!connectionOk) {
      if (onStatusComplete) onStatusComplete(false);
      return; // Stop if connection fails
    }

    // Step 2: Camera
    setCurrentStep(1);
    const cameraOk = await validateCamera();
    await new Promise(resolve => setTimeout(resolve, 500));

    if (!cameraOk) {
      if (onStatusComplete) onStatusComplete(false);
      return; // Stop if camera fails
    }

    // Step 3: Printer
    setCurrentStep(2);
    const printerOk = await validatePrinter();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mark complete
    const allSuccess = connectionOk && cameraOk && printerOk;
    setAllComplete(allSuccess);

    // Notify parent and show toast
    if (onStatusComplete) {
      onStatusComplete(allSuccess);
    }

    if (allSuccess) {
      toast({
        title: '✅ System Ready',
        description: 'All devices connected. Ready to print and scan!',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      runValidation();
    }
  }, [isOpen]);

  const getStepIcon = (step: ValidationStep) => {
    switch (step.status) {
      case 'loading':
        return <Spinner size="sm" color={loadingColor} />;
      case 'success':
        return <Icon as={FiCheckCircle as any} boxSize={6} color={successColor} />;
      case 'error':
        return <Icon as={FiXCircle as any} boxSize={6} color={errorColor} />;
      default:
        return <Icon as={step.icon as any} boxSize={6} color="gray.400" />;
    }
  };

  const getProgressValue = () => {
    const completedSteps = steps.filter(s => s.status === 'success').length;
    return (completedSteps / steps.length) * 100;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} borderRadius="2xl" border="1px solid" borderColor={borderColor}>
        <ModalHeader>
          <Text fontSize="xl" fontWeight="700">
            System Connection
          </Text>
          <Text fontSize="sm" fontWeight="400" color="gray.500" mt={1}>
            Validating all components
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {/* Progress Bar */}
            <Box>
              <Progress
                value={getProgressValue()}
                colorScheme="green"
                borderRadius="full"
                size="sm"
                hasStripe
                isAnimated={!allComplete}
              />
            </Box>

            {/* Validation Steps */}
            {steps.map((step, index) => (
              <Flex
                key={step.id}
                align="center"
                justify="space-between"
                p={4}
                borderRadius="lg"
                bg={
                  step.status === 'loading'
                    ? 'blue.50'
                    : step.status === 'success'
                      ? 'green.50'
                      : step.status === 'error'
                        ? 'red.50'
                        : 'gray.50'
                }
                _dark={{
                  bg:
                    step.status === 'loading'
                      ? 'blue.900'
                      : step.status === 'success'
                        ? 'green.900'
                        : step.status === 'error'
                          ? 'red.900'
                          : 'gray.700',
                }}
                transition="all 0.3s"
              >
                <HStack spacing={3} flex={1}>
                  <Box>{getStepIcon(step)}</Box>
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="600" fontSize="sm">
                      {step.label}
                    </Text>
                    <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                      {step.status === 'error' && step.error ? step.error : step.description}
                    </Text>
                  </VStack>
                </HStack>
              </Flex>
            ))}

            {/* All Complete Message */}
            {allComplete && (
              <Box
                p={4}
                borderRadius="lg"
                bg="green.50"
                _dark={{ bg: 'green.900' }}
                textAlign="center"
              >
                <Icon as={FiCheckCircle as any} boxSize={8} color={successColor} mb={2} />
                <Text fontWeight="600" color={successColor}>
                  All systems ready!
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default ConnectionValidator;
