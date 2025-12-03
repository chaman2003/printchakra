import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  HStack,
  IconButton,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Progress,
  Radio,
  RadioGroup,
  SimpleGrid,
  Spinner,
  Stack,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react';
import { FiCpu, FiDownload, FiMonitor, FiPrinter, FiRefreshCw, FiWifiOff } from 'react-icons/fi';
import { Iconify } from '../common';
import apiClient from '../../apiClient';

interface PrinterInfo {
  name: string;
  is_default: boolean;
  driver: string;
  port: string;
  status: string;
}

interface DriverSuggestion {
  printer: string;
  brand: string;
  driver_url: string;
  description: string;
}

interface SystemInfo {
  os: {
    name: string;
    version: string;
    release: string;
    architecture: string;
    processor: string;
  };
  python: {
    version: string;
    implementation: string;
  };
  memory: {
    total_gb: number;
    available_gb: number;
    used_percent: number;
  };
  cpu: {
    cores_physical: number;
    cores_logical: number;
    usage_percent: number;
  };
  gpu: {
    available: boolean;
    name?: string;
    cuda_version?: string;
    device_count?: number;
    total_memory_gb?: number;
    error?: string;
  };
  printers: {
    available: boolean;
    default?: string;
    count?: number;
    list: PrinterInfo[];
    error?: string;
  };
  driver_suggestions: DriverSuggestion[];
}

interface DeviceAndConnectivityPanelProps {
  onCheckConnectivity?: () => void;
}

export const DeviceAndConnectivityPanel: React.FC<DeviceAndConnectivityPanelProps> = ({ onCheckConnectivity }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultPrinter, setDefaultPrinter] = useState<string>('');
  const [settingDefault, setSettingDefault] = useState(false);

  // Consistent styling with SurfaceCard
  const bgCard = useColorModeValue('rgba(255, 248, 240, 0.95)', 'rgba(12, 16, 35, 0.92)');
  const borderColor = useColorModeValue('rgba(121, 95, 238, 0.08)', 'rgba(255, 255, 255, 0.08)');
  const shadow = useColorModeValue(
    '0 20px 35px rgba(121, 95, 238, 0.08)',
    '0 25px 50px rgba(0, 0, 0, 0.8)'
  );
  const textMuted = useColorModeValue('gray.600', 'gray.400');
  const tagBg = useColorModeValue('gray.100', 'rgba(121, 95, 238, 0.15)');

  const fetchSystemInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/system/info');
      setSystemInfo(response.data);
      setDefaultPrinter(response.data.printers?.default || '');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch system info');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSetDefaultPrinter = useCallback(async (printerName: string) => {
    setSettingDefault(true);
    setError(null);
    try {
      await apiClient.post('/system/set-default-printer', { printer_name: printerName });
      setDefaultPrinter(printerName);
      if (systemInfo) {
        setSystemInfo({
          ...systemInfo,
          printers: {
            ...systemInfo.printers,
            default: printerName,
          },
        });
      }
    } catch (err: any) {
      console.error('Failed to set default printer:', err);
      setError(err.response?.data?.error || 'Failed to set default printer');
    } finally {
      setSettingDefault(false);
    }
  }, [systemInfo]);

  useEffect(() => {
    fetchSystemInfo();
  }, [fetchSystemInfo]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return 'green';
      case 'offline':
      case 'error':
        return 'red';
      case 'busy':
      case 'printing':
        return 'blue';
      case 'paused':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  const getMemoryColor = (percent: number) => {
    if (percent < 50) return 'green';
    if (percent < 80) return 'yellow';
    return 'red';
  };

  const handleOpenModal = () => {
    fetchSystemInfo();
    onOpen();
  };

  return (
    <>
      <ButtonGroup isAttached variant="outline" size="sm">
        <Button
          leftIcon={<Iconify icon={FiMonitor} />}
          color={textMuted}
          _hover={{ color: 'brand.400', bg: 'rgba(121, 95, 238, 0.1)' }}
          fontWeight="medium"
          onClick={handleOpenModal}
          borderRight="none"
        >
          Device Info
        </Button>

        {onCheckConnectivity && (
          <Button
            colorScheme="cyan"
            variant="solid"
            onClick={onCheckConnectivity}
            leftIcon={<Iconify icon={FiWifiOff} boxSize={3} />}
            boxShadow="0 4px 14px rgba(34,211,238,0.4)"
            _hover={{ boxShadow: '0 6px 20px rgba(34,211,238,0.6)' }}
            transition="all 0.3s"
          >
            Check Connectivity
          </Button>
        )}
      </ButtonGroup>

      <Modal isOpen={isOpen} onClose={onClose} size="4xl" isCentered scrollBehavior="inside">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent
          bg={bgCard}
          borderRadius="2xl"
          border="1px solid"
          borderColor={borderColor}
          boxShadow={shadow}
          maxH="90vh"
        >
          <Flex
            borderBottom="1px solid"
            borderColor={borderColor}
            align="center"
            justify="space-between"
            py={4}
            px={8}
          >
            <HStack spacing={3}>
              <Iconify icon={FiMonitor} boxSize={6} color="brand.400" />
              <Text fontWeight="700" fontSize="lg">
                System Status
              </Text>
              {systemInfo?.printers?.available && (
                <Tag size="lg" colorScheme="green" variant="subtle" borderRadius="full">
                  {systemInfo.printers.count} Printers
                </Tag>
              )}
            </HStack>
            <HStack spacing={2}>
              <Tooltip label="Refresh" placement="top">
                <IconButton
                  aria-label="Refresh"
                  icon={<Iconify icon={FiRefreshCw} boxSize={4} />}
                  size="sm"
                  variant="ghost"
                  color={textMuted}
                  _hover={{ color: 'brand.400', bg: 'rgba(121, 95, 238, 0.1)' }}
                  onClick={fetchSystemInfo}
                  isLoading={loading}
                />
              </Tooltip>
              <ModalCloseButton position="relative" top="0" right="0" />
            </HStack>
          </Flex>

          <ModalBody py={6} px={8}>
            {loading && !systemInfo ? (
              <Flex justify="center" py={16}>
                <Spinner size="lg" color="brand.400" thickness="4px" />
              </Flex>
            ) : error ? (
              <Text color="red.400" fontSize="md" py={4}>
                {error}
              </Text>
            ) : systemInfo ? (
              <VStack align="stretch" spacing={6} w="100%">
                {/* Printers Section - Top Priority */}
                <Box
                  bg={useColorModeValue('gray.50', 'rgba(121, 95, 238, 0.05)')}
                  borderRadius="xl"
                  p={5}
                  border="1px solid"
                  borderColor={borderColor}
                >
                  <HStack mb={4} spacing={3}>
                    <Iconify icon={FiPrinter} boxSize={5} color="brand.400" />
                    <Text fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="wider" color="brand.400">
                      Printers & Default Selection
                    </Text>
                  </HStack>

                  {systemInfo.printers.available ? (
                    <RadioGroup value={defaultPrinter} onChange={(value) => handleSetDefaultPrinter(value)}>
                      <VStack align="stretch" spacing={3}>
                        {systemInfo.printers.list.map((printer, idx) => (
                          <Box
                            key={idx}
                            bg={useColorModeValue('white', 'rgba(255,255,255,0.03)')}
                            px={4}
                            py={3}
                            borderRadius="lg"
                            border="1.5px solid"
                            borderColor={defaultPrinter === printer.name ? 'brand.400' : borderColor}
                            cursor="pointer"
                            transition="all 0.2s"
                            _hover={{ borderColor: 'brand.400', boxShadow: `0 0 0 2px rgba(121, 95, 238, 0.1)` }}
                          >
                            <Flex align="center" justify="space-between" gap={3}>
                              <Radio value={printer.name} isDisabled={settingDefault} />
                              <VStack align="start" spacing={0.5} flex={1}>
                                <Text fontSize="sm" fontWeight="600">
                                  {printer.name}
                                </Text>
                                <Text fontSize="xs" color={textMuted}>
                                  {printer.driver}
                                </Text>
                              </VStack>
                              <HStack spacing={2}>
                                <Tag size="sm" colorScheme={getStatusColor(printer.status)} variant="subtle">
                                  {printer.status}
                                </Tag>
                                {defaultPrinter === printer.name && (
                                  <Tag size="sm" colorScheme="brand" variant="solid" fontSize="11px">
                                    ACTIVE
                                  </Tag>
                                )}
                              </HStack>
                            </Flex>
                          </Box>
                        ))}
                      </VStack>
                    </RadioGroup>
                  ) : (
                    <Text fontSize="sm" color={textMuted} fontStyle="italic">
                      {systemInfo.printers.error || 'No printers found'}
                    </Text>
                  )}
                </Box>

                <Divider borderColor={borderColor} opacity={0.4} />

                {/* Driver Suggestions */}
                {systemInfo.driver_suggestions.length > 0 && (
                  <>
                    <Box>
                      <HStack mb={4} spacing={3}>
                        <Iconify icon={FiDownload} boxSize={5} color="brand.400" />
                        <Text fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="wider" color="brand.400">
                          Driver Downloads
                        </Text>
                      </HStack>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} w="100%">
                        {systemInfo.driver_suggestions.map((suggestion, idx) => (
                          <Link
                            key={idx}
                            href={suggestion.driver_url}
                            isExternal
                            _hover={{ textDecoration: 'none' }}
                          >
                            <Box
                              bg={useColorModeValue('white', 'rgba(255,255,255,0.03)')}
                              px={4}
                              py={3}
                              borderRadius="lg"
                              border="1px solid"
                              borderColor={borderColor}
                              _hover={{ bg: 'rgba(121, 95, 238, 0.1)', borderColor: 'brand.400', transform: 'translateY(-2px)' }}
                              transition="all 0.2s"
                              boxShadow="sm"
                            >
                              <Flex align="center" justify="space-between" gap={2}>
                                <VStack align="start" spacing={0}>
                                  <Text fontSize="sm" fontWeight="700">
                                    {suggestion.brand}
                                  </Text>
                                  <Text fontSize="xs" color={textMuted}>
                                    {suggestion.description}
                                  </Text>
                                </VStack>
                                <Iconify icon={FiDownload} boxSize={4} color="brand.400" />
                              </Flex>
                            </Box>
                          </Link>
                        ))}
                      </SimpleGrid>
                    </Box>
                    <Divider borderColor={borderColor} opacity={0.4} />
                  </>
                )}

                {/* System Resources */}
                <Box>
                  <HStack mb={4} spacing={3}>
                    <Iconify icon={FiCpu} boxSize={5} color="brand.400" />
                    <Text fontWeight="700" fontSize="sm" textTransform="uppercase" letterSpacing="wider" color="brand.400">
                      System Resources
                    </Text>
                  </HStack>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="100%">
                    {/* Left Column */}
                    <VStack align="stretch" spacing={4}>
                      {/* OS */}
                      <Flex justify="space-between" align="center" bg={useColorModeValue('gray.50', 'rgba(121, 95, 238, 0.05)')} p={3} borderRadius="lg">
                        <Text fontSize="sm" color={textMuted} fontWeight="600">
                          OS
                        </Text>
                        <Tag size="sm" variant="outline" colorScheme="gray">
                          {systemInfo.os.name} {systemInfo.os.release}
                        </Tag>
                      </Flex>

                      {/* CPU */}
                      <Flex justify="space-between" align="center" bg={useColorModeValue('gray.50', 'rgba(121, 95, 238, 0.05)')} p={3} borderRadius="lg">
                        <Text fontSize="sm" color={textMuted} fontWeight="600">
                          CPU
                        </Text>
                        <HStack spacing={2}>
                          <Text fontWeight="600" fontSize="sm">
                            {systemInfo.cpu.usage_percent.toFixed(0)}%
                          </Text>
                          <Text color={textMuted} fontSize="xs">
                            ({systemInfo.cpu.cores_logical} cores)
                          </Text>
                        </HStack>
                      </Flex>
                    </VStack>

                    {/* Right Column */}
                    <VStack align="stretch" spacing={4}>
                      {/* Memory */}
                      <Box bg={useColorModeValue('gray.50', 'rgba(121, 95, 238, 0.05)')} p={3} borderRadius="lg">
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontSize="sm" color={textMuted} fontWeight="600">
                            Memory
                          </Text>
                          <Text fontSize="sm" fontWeight="600">
                            {systemInfo.memory.available_gb.toFixed(1)} / {systemInfo.memory.total_gb.toFixed(1)} GB
                          </Text>
                        </Flex>
                        <Progress
                          value={systemInfo.memory.used_percent}
                          size="sm"
                          colorScheme={getMemoryColor(systemInfo.memory.used_percent)}
                          borderRadius="full"
                          bg={useColorModeValue('gray.200', 'whiteAlpha.300')}
                        />
                      </Box>

                      {/* GPU */}
                      <Box bg={useColorModeValue('gray.50', 'rgba(121, 95, 238, 0.05)')} p={3} borderRadius="lg">
                        <Flex justify="space-between" align="center">
                          <Text fontSize="sm" color={textMuted} fontWeight="600">
                            GPU
                          </Text>
                          {systemInfo.gpu.available ? (
                            <Tooltip label={`CUDA ${systemInfo.gpu.cuda_version} • ${systemInfo.gpu.total_memory_gb?.toFixed(1)} GB VRAM`}>
                              <Tag size="sm" colorScheme="green" variant="subtle">
                                <Iconify icon={FiCpu} mr={1} boxSize={3} />
                                {systemInfo.gpu.name?.replace('NVIDIA ', '').replace('GeForce ', '')}
                              </Tag>
                            </Tooltip>
                          ) : (
                            <Tag size="sm" colorScheme="gray" variant="subtle">
                              CPU Mode
                            </Tag>
                          )}
                        </Flex>
                      </Box>
                    </VStack>
                  </SimpleGrid>
                </Box>
              </VStack>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DeviceAndConnectivityPanel;
