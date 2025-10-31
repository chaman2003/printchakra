import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Spinner,
  Stack,
  Text,
  VStack,
  HStack,
  Badge,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiWifi, FiCheckCircle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import Iconify from './Iconify';
import apiClient from '../apiClient';

interface ConnectionStatus {
  phoneWiFi: 'checking' | 'connected' | 'failed' | 'idle';
  printerConnection: 'checking' | 'connected' | 'failed' | 'idle';
  phoneCamera: 'checking' | 'connected' | 'failed' | 'idle';
}

interface ConnectionDetails {
  phoneWiFi: string;
  printerConnection: string;
  phoneCamera: string;
}

interface SmartConnectionStatusProps {
  onStatusComplete?: (allConnected: boolean) => void;
}

const SmartConnectionStatus: React.FC<SmartConnectionStatusProps> = ({ onStatusComplete }) => {
  const [status, setStatus] = useState<ConnectionStatus>({
    phoneWiFi: 'idle',
    printerConnection: 'idle',
    phoneCamera: 'idle',
  });
  const [details, setDetails] = useState<ConnectionDetails>({
    phoneWiFi: 'Ready to check',
    printerConnection: 'Ready to check',
    phoneCamera: 'Ready to check',
  });
  const [isChecking, setIsChecking] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>(
    'idle'
  );

  const bgCard = useColorModeValue('rgba(255, 255, 255, 0.05)', 'rgba(30, 30, 40, 0.6)');
  const borderColor = useColorModeValue('rgba(69, 202, 255, 0.2)', 'rgba(69, 202, 255, 0.15)');

  const runConnectionCheck = async () => {
    setIsChecking(true);
    setOverallStatus('checking');

    try {
      // Step 1: Check Phone Wi-Fi Connection
      setStatus(prev => ({ ...prev, phoneWiFi: 'checking' }));
      setDetails(prev => ({ ...prev, phoneWiFi: 'Checking Wi-Fi link...' }));

      const phoneCheck = await apiClient.get('/connection/phone-wifi').catch(() => ({
        data: { connected: false, message: 'Phone not detected on network' },
      }));

      const phoneConnected = phoneCheck?.data?.connected;
      setStatus(prev => ({ ...prev, phoneWiFi: phoneConnected ? 'connected' : 'failed' }));
      setDetails(prev => ({
        ...prev,
        phoneWiFi: phoneConnected
          ? `Phone connected (${phoneCheck?.data?.ip || 'Network active'})`
          : phoneCheck?.data?.message || 'Phone not detected',
      }));

      // Step 2: Check Printer Connection
      setStatus(prev => ({ ...prev, printerConnection: 'checking' }));
      setDetails(prev => ({ ...prev, printerConnection: 'Verifying printer access...' }));

      const printerCheck = await apiClient.get('/connection/printer-status').catch(() => ({
        data: { connected: false, message: 'Printer not responding' },
      }));

      const printerConnected = printerCheck?.data?.connected;
      setStatus(prev => ({
        ...prev,
        printerConnection: printerConnected ? 'connected' : 'failed',
      }));
      setDetails(prev => ({
        ...prev,
        printerConnection: printerConnected
          ? `Printer ready (${printerCheck?.data?.model || 'Connected'})`
          : printerCheck?.data?.message || 'Printer not responding',
      }));

      // Step 3: Check Phone Camera Readiness
      setStatus(prev => ({ ...prev, phoneCamera: 'checking' }));
      setDetails(prev => ({ ...prev, phoneCamera: 'Checking camera session...' }));

      const cameraCheck = await apiClient.get('/connection/camera-ready').catch(() => ({
        data: { ready: false, message: 'Camera session not detected' },
      }));

      const cameraReady = cameraCheck?.data?.ready;
      setStatus(prev => ({ ...prev, phoneCamera: cameraReady ? 'connected' : 'failed' }));
      setDetails(prev => ({
        ...prev,
        phoneCamera: cameraReady
          ? 'Camera ready'
          : cameraCheck?.data?.message || 'Camera session not detected',
      }));

      // Determine overall status
      const allConnected = phoneConnected && printerConnected && cameraReady;
      setOverallStatus(allConnected ? 'success' : 'failed');

      if (onStatusComplete) {
        onStatusComplete(allConnected);
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      setOverallStatus('failed');
      setStatus({
        phoneWiFi: 'failed',
        printerConnection: 'failed',
        phoneCamera: 'failed',
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Stack spacing={4} w="full">
      <Box
        bg={bgCard}
        border={`2px solid ${borderColor}`}
        borderRadius="2xl"
        p={6}
        position="relative"
        overflow="hidden"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            overallStatus === 'success'
              ? 'linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(72, 187, 120, 0) 100%)'
              : overallStatus === 'failed'
                ? 'linear-gradient(135deg, rgba(245, 101, 101, 0.1) 0%, rgba(245, 101, 101, 0) 100%)'
                : 'transparent',
          pointerEvents: 'none',
        }}
      >
        <Stack spacing={4} position="relative" zIndex={1}>
          <Flex justify="space-between" align="center">
            <VStack align="flex-start" spacing={1}>
              <Text fontSize="lg" fontWeight="700">
                🔗 Smart System Connection
              </Text>
              <Text fontSize="sm" color="text.muted">
                {overallStatus === 'idle' && 'Click to verify all device connections'}
                {overallStatus === 'checking' && 'Verifying connectivity...'}
                {overallStatus === 'success' && '✅ All systems connected and ready'}
                {overallStatus === 'failed' && '⚠️ Some connections need attention'}
              </Text>
            </VStack>
            {isChecking && <Spinner size="sm" color="brand.400" />}
          </Flex>

          <VStack spacing={3} align="stretch">
            <Flex justify="center" align="center" gap={2} w="full" wrap="wrap">
              <ConnectionDevice
                label="Smartphone"
                status={status.phoneWiFi}
                details={details.phoneWiFi}
              />
              <ConnectionLine isConnected={status.phoneWiFi === 'connected'} />
              <ConnectionDevice
                label="Laptop"
                status={status.printerConnection}
                details={details.printerConnection}
              />
              <ConnectionLine isConnected={status.printerConnection === 'connected'} />
              <ConnectionDevice
                label="Printer"
                status={status.phoneCamera}
                details={details.phoneCamera}
              />
            </Flex>

            <Stack spacing={2} pt={4} borderTop={`1px solid ${borderColor}`}>
              <StatusItem
                label="Phone ↔ Laptop (Wi-Fi)"
                status={status.phoneWiFi}
                details={details.phoneWiFi}
              />
              <StatusItem
                label="Laptop ↔ Printer (Connection)"
                status={status.printerConnection}
                details={details.printerConnection}
              />
              <StatusItem
                label="Phone Ready (Camera)"
                status={status.phoneCamera}
                details={details.phoneCamera}
              />
            </Stack>

            <Flex gap={3} justify="flex-end" pt={2}>
              <Button
                size="md"
                colorScheme="brand"
                isLoading={isChecking}
                loadingText="Checking..."
                onClick={runConnectionCheck}
                leftIcon={<Iconify icon={FiRefreshCw} boxSize={4} />}
              >
                {isChecking ? 'Verifying Connections' : 'Start Connection Check'}
              </Button>
              {overallStatus === 'success' && (
                <Badge
                  colorScheme="green"
                  p={2}
                  borderRadius="md"
                  fontSize="sm"
                  display="flex"
                  alignItems="center"
                  gap={2}
                >
                  <Iconify icon={FiCheckCircle} boxSize={4} />
                  System Ready
                </Badge>
              )}
            </Flex>
          </VStack>
        </Stack>
      </Box>

      {overallStatus === 'failed' && (
        <Box
          bg="rgba(245, 101, 101, 0.08)"
          border="1px solid rgba(245, 101, 101, 0.2)"
          borderRadius="lg"
          p={4}
        >
          <VStack align="flex-start" spacing={2}>
            <Text fontWeight="600" color="red.300">
              ⚠️ Connection Issues Detected
            </Text>
            <Text fontSize="sm" color="text.muted">
              Please check:
            </Text>
            <VStack align="flex-start" spacing={1} pl={4} fontSize="sm">
              {status.phoneWiFi === 'failed' && (
                <Text>• Ensure phone is on same Wi-Fi network as laptop</Text>
              )}
              {status.printerConnection === 'failed' && (
                <Text>• Check printer is powered on and connected to network</Text>
              )}
              {status.phoneCamera === 'failed' && (
                <Text>• Open camera app on phone and ensure camera is enabled</Text>
              )}
            </VStack>
            <Button
              size="sm"
              variant="outline"
              onClick={runConnectionCheck}
              isLoading={isChecking}
              mt={2}
            >
              Retry Connection Check
            </Button>
          </VStack>
        </Box>
      )}
    </Stack>
  );
};

const ConnectionDevice: React.FC<{
  label: string;
  status: string;
  details: string;
}> = ({ label, status, details }) => {
  const statusColor =
    status === 'connected' ? 'green.400' : status === 'failed' ? 'red.400' : 'yellow.400';

  return (
    <Tooltip label={details} placement="top">
      <VStack spacing={1} align="center">
        <Box
          w="12"
          h="12"
          borderRadius="lg"
          bg={`${statusColor}.900`}
          border={`2px solid ${statusColor}`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxShadow={status === 'connected' ? `0 0 20px ${statusColor}` : 'md'}
          _hover={{ transform: 'scale(1.05)', transition: 'all 0.2s' }}
        >
          {status === 'checking' ? (
            <Spinner size="sm" color={statusColor} />
          ) : status === 'connected' ? (
            <Iconify icon={FiCheckCircle} boxSize={6} color={statusColor} />
          ) : status === 'failed' ? (
            <Iconify icon={FiAlertCircle} boxSize={6} color={statusColor} />
          ) : (
            <Iconify icon={FiWifi} boxSize={6} color={statusColor} />
          )}
        </Box>
        <Text fontSize="xs" fontWeight="600" textAlign="center">
          {label}
        </Text>
      </VStack>
    </Tooltip>
  );
};

const ConnectionLine: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
  return (
    <Flex
      h="1"
      w="16"
      bg={isConnected ? 'green.400' : 'gray.600'}
      borderRadius="full"
      position="relative"
      align="center"
      justify="center"
      boxShadow={isConnected ? '0 0 15px rgba(72, 187, 120, 0.6)' : 'md'}
    />
  );
};

const StatusItem: React.FC<{
  label: string;
  status: string;
  details: string;
}> = ({ label, status, details }) => {
  const statusColor = status === 'connected' ? 'green' : status === 'failed' ? 'red' : 'yellow';

  return (
    <HStack spacing={3} justify="space-between" p={2} borderRadius="md" bg="rgba(0,0,0,0.2)">
      <HStack spacing={2} flex={1}>
        <Badge colorScheme={statusColor} variant="solid" borderRadius="full">
          {status === 'connected' ? '✓' : status === 'failed' ? '✕' : '○'}
        </Badge>
        <Text fontSize="sm" fontWeight="500">
          {label}
        </Text>
      </HStack>
      <Text fontSize="xs" color="text.muted" textAlign="right">
        {details}
      </Text>
    </HStack>
  );
};

export default SmartConnectionStatus;
