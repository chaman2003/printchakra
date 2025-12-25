import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Progress,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Tag,
  Text,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FiClock, FiPlay, FiSettings } from 'react-icons/fi';
import { Iconify } from '../common';
import { useCalibration } from '../../context/CalibrationContext';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ isOpen, onClose }) => {
  const {
    initialDelay,
    setInitialDelay,
    isCalibrated,
    startDelayCountdown,
    countdownValue,
    isCountingDown,
    cancelCountdown,
    resetCalibration,
  } = useCalibration();

  const [tempDelay, setTempDelay] = useState<number>(initialDelay);
  const [isTestingDelay, setIsTestingDelay] = useState(false);
  const toast = useToast();

  // Sync tempDelay with initialDelay when it changes externally
  useEffect(() => {
    setTempDelay(initialDelay);
  }, [initialDelay]);

  const bgCard = useColorModeValue('rgba(255, 248, 240, 0.95)', 'rgba(12, 16, 35, 0.92)');
  const borderColor = useColorModeValue('rgba(121, 95, 238, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const shadow = useColorModeValue(
    '0 20px 35px rgba(121, 95, 238, 0.08)',
    '0 25px 50px rgba(0, 0, 0, 0.8)'
  );
  const textMuted = useColorModeValue('gray.600', 'gray.400');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        bg={bgCard}
        borderRadius="2xl"
        border="1px solid"
        borderColor={borderColor}
        boxShadow={shadow}
      >
        <ModalHeader borderBottom="1px solid" borderColor={borderColor} py={4}>
          <HStack spacing={3}>
            <Iconify icon={FiSettings} boxSize={6} color="brand.400" />
            <Text fontWeight="700" fontSize="lg">
              Printer Calibration
            </Text>
            {isCalibrated && (
              <Tag size="md" colorScheme="green" variant="subtle" borderRadius="full">
                Calibrated
              </Tag>
            )}
          </HStack>
          <ModalCloseButton top={3} right={3} />
        </ModalHeader>

        <ModalBody py={6} px={6}>
          <VStack align="stretch" spacing={6}>
            {/* Current Delay Display */}
            <Box
              bg={useColorModeValue('white', 'rgba(255,255,255,0.03)')}
              px={4}
              py={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
            >
              <Flex align="center" justify="space-between" mb={3}>
                <HStack spacing={2}>
                  <Iconify icon={FiClock} boxSize={4} color="brand.400" />
                  <Text fontSize="sm" fontWeight="600">Initial Capture Delay</Text>
                </HStack>
                <Tag size="lg" colorScheme="brand" variant="solid" borderRadius="full">
                  {initialDelay}s
                </Tag>
              </Flex>
              <Text fontSize="xs" color={textMuted}>
                Delay before phone starts capturing the first document after print job starts.
                This allows printer initialization time.
              </Text>
            </Box>

            {/* Set Initial Delay */}
            <Box>
              <Text fontSize="sm" fontWeight="600" mb={3}>
                Set Initial Delay (seconds)
              </Text>
              <HStack spacing={4} mb={3}>
                <Slider
                  value={tempDelay}
                  onChange={(val) => setTempDelay(val)}
                  min={0}
                  max={30}
                  step={1}
                  flex={1}
                >
                  <SliderTrack bg={useColorModeValue('gray.200', 'whiteAlpha.300')}>
                    <SliderFilledTrack bg="brand.400" />
                  </SliderTrack>
                  <SliderThumb boxSize={5} />
                </Slider>
                <NumberInput
                  value={tempDelay}
                  onChange={(_, val) => setTempDelay(isNaN(val) ? 0 : val)}
                  min={0}
                  max={60}
                  w="80px"
                  size="sm"
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </HStack>
              <Button
                size="sm"
                colorScheme="brand"
                w="full"
                onClick={() => {
                  setInitialDelay(tempDelay);
                  toast({
                    title: 'Delay Updated',
                    description: `Initial capture delay set to ${tempDelay} seconds`,
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                  });
                }}
                isDisabled={tempDelay === initialDelay}
              >
                Save Delay
              </Button>
            </Box>

            {/* Test Delay */}
            <Box
              bg={useColorModeValue('gray.50', 'rgba(255,255,255,0.03)')}
              px={4}
              py={4}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
            >
              <Text fontSize="sm" fontWeight="600" mb={2}>
                Test Delay Time
              </Text>
              <Text fontSize="xs" color={textMuted} mb={3}>
                Start a test countdown to verify the delay before capture begins.
              </Text>
              {isCountingDown ? (
                <VStack spacing={3}>
                  <Box
                    w="100%"
                    bg={useColorModeValue('brand.50', 'rgba(121, 95, 238, 0.1)')}
                    borderRadius="lg"
                    p={4}
                    textAlign="center"
                  >
                    <Text fontSize="4xl" fontWeight="bold" color="brand.400">
                      {countdownValue}
                    </Text>
                    <Text fontSize="sm" color={textMuted}>seconds remaining</Text>
                  </Box>
                  <Progress
                    value={((initialDelay - (countdownValue || 0)) / initialDelay) * 100}
                    size="sm"
                    colorScheme="brand"
                    borderRadius="full"
                    w="100%"
                  />
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => {
                      cancelCountdown();
                      setIsTestingDelay(false);
                    }}
                  >
                    Cancel Test
                  </Button>
                </VStack>
              ) : (
                <Button
                  size="sm"
                  colorScheme="green"
                  variant="outline"
                  w="full"
                  leftIcon={<Iconify icon={FiPlay} boxSize={4} />}
                  onClick={async () => {
                    setIsTestingDelay(true);
                    try {
                      await startDelayCountdown();
                      toast({
                        title: 'Delay Complete!',
                        description: 'Capture would start now in a real workflow.',
                        status: 'success',
                        duration: 3000,
                        isClosable: true,
                      });
                    } catch (e) {
                      // Cancelled
                    }
                    setIsTestingDelay(false);
                  }}
                  isLoading={isTestingDelay && !isCountingDown}
                >
                  Test {initialDelay}s Delay
                </Button>
              )}
            </Box>

            {/* Footer Actions */}
            <HStack spacing={2} justify="space-between" pt={2}>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="red"
                onClick={() => {
                  resetCalibration();
                  setTempDelay(10);
                  toast({
                    title: 'Calibration Reset',
                    description: 'Delay reset to default (10 seconds)',
                    status: 'info',
                    duration: 2000,
                  });
                }}
              >
                Reset to Default
              </Button>
              <Button onClick={onClose}>
                Done
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CalibrationModal;
