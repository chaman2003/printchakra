import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Heading,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
  useDisclosure,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiRefreshCw, FiTrash2, FiZoomIn, FiLayers } from 'react-icons/fi';
import { API_BASE_URL, API_ENDPOINTS, SOCKET_CONFIG, SOCKET_IO_ENABLED, getDefaultHeaders } from '../config';
import Iconify from '../components/Iconify';

interface FileInfo {
  filename: string;
  size: number;
  created: string;
  has_text: boolean;
  processing?: boolean;
  processing_step?: number;
  processing_total?: number;
  processing_stage?: string;
}

interface ProcessingProgress {
  step: number;
  total_steps: number;
  stage_name: string;
  message: string;
}

// Custom hook to load images with proper headers
const useImageWithHeaders = (imageUrl: string) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let revokeUrl: string | null = null;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = await axios.get(imageUrl, {
          headers: getDefaultHeaders(),
          responseType: 'blob',
          timeout: 10000
        });

        if (isMounted) {
          const blob = response.data;
          const url = URL.createObjectURL(blob);
          revokeUrl = url;
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load image:', imageUrl, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    if (imageUrl) {
      loadImage();
    }

    return () => {
      isMounted = false;
      if (revokeUrl) {
        URL.revokeObjectURL(revokeUrl);
      }
    };
  }, [imageUrl]);

  return { blobUrl, loading, error };
};

// Image component that loads with proper headers
const SecureImage: React.FC<{
  filename: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ filename, alt, className, onClick, style }) => {
  const imageUrl = `${API_BASE_URL}${API_ENDPOINTS.processed}/${filename}`;
  const { blobUrl, loading, error } = useImageWithHeaders(imageUrl);

  if (loading) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        className={className}
        style={style}
        minH="160px"
        bg="surface.blur"
        borderRadius="lg"
      >
        <Spinner size="lg" color="brand.400" />
        <Text mt={3} fontSize="sm" color="text.muted">
          Loading preview…
        </Text>
      </Flex>
    );
  }

  if (error || !blobUrl) {
    return (
      <Flex
        direction="column"
        align="center"
        justify="center"
        className={className}
        style={style}
        minH="160px"
        bg="surface.blur"
        borderRadius="lg"
      >
        <Iconify icon={FiFileText} boxSize={8} color="brand.300" />
        <Text mt={3} fontSize="sm" color="text.muted">
          Preview unavailable
        </Text>
      </Flex>
    );
  }

  return (
    <Box
      as="img"
      src={blobUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      style={style}
      cursor={onClick ? 'pointer' : 'default'}
      objectFit="cover"
      w="100%"
      h="100%"
      borderRadius="lg"
    />
  );
};

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [selectedImageFile, setSelectedImageFile] = useState<string | null>(null);

  // File conversion state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [targetFormat, setTargetFormat] = useState<string>('pdf');
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<string>('');
  const [mergePdf, setMergePdf] = useState<boolean>(true); // New: merge PDF option
  const [customFilename, setCustomFilename] = useState<string>(''); // New: custom filename for merged PDF
  
  // Converted files state
  const [convertedFiles, setConvertedFiles] = useState<any[]>([]);
  const toast = useToast();
  const imageModal = useDisclosure();
  const conversionModal = useDisclosure();
  const convertedDrawer = useDisclosure();
  
  // Theme values with insane visual enhancements
  const surfaceCard = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  // const surfaceGlass = useColorModeValue('rgba(255,255,255,0.85)', 'rgba(20,24,45,0.75)');
  // const borderColor = useColorModeValue('brand.200', 'nebula.700');
  // const borderSubtle = useColorModeValue('brand.100', 'whiteAlpha.200');
  // const accentPrimary = useColorModeValue('brand.500', 'nebula.400');
  // const accentSecondary = useColorModeValue('nebula.500', 'cyber.400');
  // const textMuted = useColorModeValue('gray.600', 'whiteAlpha.700');
  // const textInverse = useColorModeValue('gray.800', 'whiteAlpha.900');
  // const hoverBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  // const glowColor = useColorModeValue('brand.500', 'nebula.400');
  
  const statusDotColor = connected ? 'green.400' : 'red.400';
  const statusTextColor = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    // Only connect Socket.IO if enabled (local development only)
    if (!SOCKET_IO_ENABLED) {
      console.log('⚠️ Socket.IO disabled on production - using HTTP polling');
      setConnected(true); // Assume connected for UI purposes
      
      // Load files immediately
      loadFiles();
      
      let pollInterval = 3000; // Start with 3 seconds
      const maxInterval = 30000; // Max 30 seconds between polls
      let timeoutId: NodeJS.Timeout;
      
      // Recursive polling with dynamic interval
      const startPolling = () => {
        timeoutId = setTimeout(async () => {
          console.log('📋 Polling for new files...');
          try {
            await loadFiles(false);
            // On success, reset to normal interval
            if (pollInterval > 3000) {
              console.log('✅ Connection restored, resetting poll interval');
              pollInterval = 3000;
              setConnectionRetries(0);
            }
          } catch (err) {
            // On error, increase poll interval (exponential backoff)
            pollInterval = Math.min(pollInterval * 1.5, maxInterval);
            setConnectionRetries(prev => prev + 1);
            console.log(`⚠️ Poll failed, backing off to ${pollInterval}ms`);
          }
          startPolling(); // Schedule next poll
        }, pollInterval);
      };
      
      startPolling();
      
      // Also refresh when the page becomes visible (user switches tabs/apps)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          console.log('📋 Page became visible - refreshing files');
          loadFiles(false); // Don't show loading spinner
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    console.log('🔌 Dashboard: Initializing Socket.IO connection to:', API_BASE_URL);
    const newSocket = io(API_BASE_URL, {
      ...SOCKET_CONFIG,
      forceNew: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Dashboard: Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Dashboard: Disconnected from server:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error: any) => {
      console.error('⚠️ Dashboard: Connection error:', error);
    });

    newSocket.on('error', (error: any) => {
      console.error('⚠️ Dashboard: Socket error:', error);
    });

    newSocket.on('new_file', (data) => {
      console.log('New file uploaded:', data);
      loadFiles(false); // Background refresh, no loading spinner
    });

    newSocket.on('file_deleted', (data) => {
      console.log('File deleted:', data);
      loadFiles(false);
    });

    newSocket.on('processing_progress', (data: ProcessingProgress) => {
      console.log(`📊 Processing: Step ${data.step}/${data.total_steps} - ${data.stage_name}`);
      setProcessingProgress(data);
    });

    newSocket.on('processing_complete', (data) => {
      console.log('✅ Processing complete:', data);
      setProcessingProgress(null);
      setTimeout(() => loadFiles(false), 500); // Refresh after processing
    });

    newSocket.on('processing_error', (data) => {
      console.error('❌ Processing error:', data);
      setProcessingProgress(null);
    });

    loadFiles();

    return () => {
      newSocket.close();
    };
  }, []);

  const loadFiles = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.files}`, {
        headers: getDefaultHeaders(),
        timeout: 10000 // 10 second timeout
      });
      const filesData = Array.isArray(response.data) ? response.data : (response.data.files || []);
      setFiles(filesData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      const errorMsg = err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_CLOSED'
        ? '⚠️ Backend connection lost. Retrying...'
        : (err.message || 'Failed to load files');
      setError(errorMsg);
      
      // Don't show persistent error on background polls
      if (!showLoading) {
        setTimeout(() => setError(null), 5000); // Clear error after 5s
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const deleteFile = async (filename: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.delete}/${filename}`, {
        headers: getDefaultHeaders()
      });
      setFiles(files.filter(f => f.filename !== filename));
      if (selectedFile === filename) {
        setSelectedFile(null);
        setOcrText('');
      }
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message,
        status: 'error',
      });
    }
  };

  const viewOCR = async (filename: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ocr}/${filename}`, {
        headers: getDefaultHeaders()
      });
      setOcrText(response.data.text || 'No text found');
      setSelectedFile(filename);
    } catch (err: any) {
      toast({
        title: 'Unable to load OCR',
        description: err.message,
        status: 'error',
      });
    }
  };

  const triggerPrint = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'blank'
      }, {
        headers: getDefaultHeaders()
      });
      toast({
        title: 'Print initiated',
        description: response.data.message,
        status: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Print failed',
        description: err.message,
        status: 'error',
      });
    }
  };

  const testPrinter = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'test'
      }, {
        headers: getDefaultHeaders()
      });
      toast({
        title: 'Test successful',
        description: response.data.message,
        status: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Test failed',
        description: err.message,
        status: 'error',
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleRefreshClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    loadFiles(true);
  };

  const openImageModal = (filename: string) => {
    setSelectedImageFile(filename);
    imageModal.onOpen();
  };

  const closeImageModal = () => {
    setSelectedImageFile(null);
    imageModal.onClose();
  };

  // Conversion handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedFiles([]);
  };

  const toggleFileSelection = (filename: string) => {
    setSelectedFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const openConversionModal = () => {
    if (selectedFiles.length === 0) {
      toast({
        title: 'Select files first',
        description: 'Pick at least one document before starting a conversion.',
        status: 'info',
      });
      return;
    }
    conversionModal.onOpen();
  };

  const closeConversionModal = () => {
    setTargetFormat('pdf');
    setConversionProgress('');
    setCustomFilename(''); // Reset custom filename
    conversionModal.onClose();
  };

  const handleConvert = async () => {
    try {
      setConverting(true);
      setConversionProgress('Starting conversion...');

      const response = await axios.post(
        `${API_BASE_URL}/convert`,
        {
          files: selectedFiles,
          format: targetFormat,
          merge_pdf: mergePdf && targetFormat === 'pdf', // Only merge if format is PDF
          filename: customFilename.trim() || undefined // Pass custom filename if provided
        },
        {
          headers: getDefaultHeaders()
        }
      );

      if (response.data.success) {
        const { success_count, fail_count, results, merged } = response.data;
        
        if (merged) {
          setConversionProgress(
            `✅ Merged into single PDF!\n${selectedFiles.length} files combined`
          );
        } else {
          setConversionProgress(
            `✅ Conversion complete!\nSuccess: ${success_count}\nFailed: ${fail_count}`
          );
        }

        // Show detailed results
        const successFiles = results.filter((r: any) => r.success).map((r: any) => r.output);
        if (successFiles.length > 0) {
          setTimeout(() => {
            toast({
              title: merged ? 'Merged PDF ready' : 'Conversion complete',
              description: merged ? `${selectedFiles.length} files combined successfully.` : `${successFiles.length} files available in converted folder.`,
              status: 'success',
              duration: 6000,
            });
            closeConversionModal();
            setSelectionMode(false);
            setSelectedFiles([]);
            loadConvertedFiles(); // Refresh converted files list
          }, 1500);
        }
      } else {
        setConversionProgress(`❌ Conversion failed: ${response.data.error}`);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setConversionProgress(`❌ Conversion error: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };
  
  // Load converted files
  const loadConvertedFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/get-converted-files`, {
        headers: getDefaultHeaders()
      });
      if (response.data.files) {
        setConvertedFiles(response.data.files);
      }
    } catch (err) {
      console.error('Failed to load converted files:', err);
    }
  };

  return (
    <VStack align="stretch" spacing={10} pb={12}>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={6}>
        <Stack spacing={2}>
          <Heading size="lg" display="flex" alignItems="center" gap={3}>
            📊 Dashboard
          </Heading>
          <Text color="text.muted" maxW="lg">
            Monitor document ingestion, inspect OCR output, and orchestrate premium conversions in real time.
          </Text>
        </Stack>

        <Stack direction="row" spacing={3} align="center">
          <Flex align="center" gap={2} px={4} py={2} borderRadius="full" bg="surface.blur" border="1px solid" borderColor="rgba(121,95,238,0.2)">
            <Box w={3} h={3} borderRadius="full" bg={error ? 'orange.400' : statusDotColor} boxShadow={`0 0 12px ${error ? 'rgba(246,164,76,0.6)' : 'rgba(129,230,217,0.8)'}`} />
            <Text fontWeight="600" color={statusTextColor}>
              {error ? `Connection issues (retry ${connectionRetries})` : connected ? 'Live link established' : 'Disconnected'}
            </Text>
          </Flex>
          <IconButton
            aria-label="Refresh files"
            icon={<Iconify icon={FiRefreshCw} boxSize={5} />}
            onClick={handleRefreshClick}
            variant="ghost"
            colorScheme="brand"
            size="lg"
          />
        </Stack>
      </Flex>

      <Stack direction={{ base: 'column', lg: 'row' }} spacing={4} wrap="wrap">
        <Button size="lg" colorScheme="brand" variant="solid" onClick={triggerPrint} leftIcon={<Iconify icon={FiLayers} boxSize={5} />}>
          Orchestrate Print Capture
        </Button>
        <Button size="lg" variant="outline" onClick={testPrinter} leftIcon={<Iconify icon={FiFileText} boxSize={5} />}>
          Run Printer Diagnostics
        </Button>
        <Button size="lg" variant={selectionMode ? 'solid' : 'ghost'} colorScheme={selectionMode ? 'orange' : 'brand'} onClick={toggleSelectionMode}>
          {selectionMode ? 'Cancel Selection' : 'Select Files'}
        </Button>
        {selectionMode && selectedFiles.length > 0 && (
          <Button size="lg" colorScheme="brand" variant="outline" onClick={openConversionModal}>
            Convert {selectedFiles.length} Selected
          </Button>
        )}
        <Button
          size="lg"
          variant="ghost"
          onClick={() => {
            if (!convertedDrawer.isOpen) {
              loadConvertedFiles();
            }
            convertedDrawer.onToggle();
          }}
        >
          {convertedDrawer.isOpen ? 'Hide Converted Files' : 'Show Converted Files'}
        </Button>
      </Stack>

      {error && (
        <Box borderRadius="xl" bg="rgba(255, 170, 0, 0.08)" border="1px solid rgba(255,170,0,0.2)" p={4}>
          <Text color="orange.300" fontWeight="600">{error}</Text>
        </Box>
      )}

      {processingProgress && (
        <Card bg={surfaceCard} border="1px solid rgba(121,95,238,0.15)" boxShadow="subtle">
          <CardHeader>
            <Heading size="sm">
              Processing · Step {processingProgress.step}/{processingProgress.total_steps} · {processingProgress.stage_name}
            </Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={3}>
              <Progress value={(processingProgress.step / processingProgress.total_steps) * 100} colorScheme="brand" borderRadius="full" height="10px" />
              <Text color="text.muted">{processingProgress.message}</Text>
            </Stack>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <Flex align="center" justify="center" py={12}>
          <Spinner size="xl" thickness="5px" color="brand.400" />
        </Flex>
      ) : (
        <Stack spacing={10}>
          <Box>
            <Flex justify="space-between" align="baseline" mb={4}>
              <Heading size="md">Files · {files.length}</Heading>
              {selectionMode && (
                <Tag size="lg" colorScheme="purple" borderRadius="full">
                  {selectedFiles.length} selected
                </Tag>
              )}
            </Flex>

            {files.length === 0 ? (
              <Card border="1px solid rgba(121,95,238,0.2)" bg={surfaceCard} backdropFilter="blur(10px)" textAlign="center" py={10}>
                <CardBody>
                  <Stack spacing={3} align="center">
                    <Iconify icon={FiFileText} boxSize={10} color="brand.300" />
                      <Iconify icon={FiFileText} boxSize={10} color="brand.300" />
                    <Heading size="sm">No files yet</Heading>
                    <Text color="text.muted" maxW="md">
                      Initiate a capture from the Phone interface or trigger a print job to start populating this space.
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
                {files.map((file) => {
                  const isSelected = selectedFiles.includes(file.filename);
                  return (
                    <Card
                      key={file.filename}
                      borderRadius="2xl"
                      border={`1px solid ${isSelected ? 'rgba(69,202,255,0.45)' : 'rgba(121,95,238,0.18)'}`}
                      boxShadow={isSelected ? 'halo' : 'subtle'}
                      bg={surfaceCard}
                      position="relative"
                      overflow="hidden"
                    >
                      {selectionMode && !file.processing && (
                        <Checkbox
                          position="absolute"
                          top={4}
                          left={4}
                          colorScheme="brand"
                          size="lg"
                          borderRadius="md"
                          isChecked={isSelected}
                          onChange={() => toggleFileSelection(file.filename)}
                        />
                      )}

                      <CardHeader>
                        <Stack spacing={2}>
                          <Heading size="sm" noOfLines={1} title={file.filename}>
                            {file.filename}
                          </Heading>
                          <Text fontSize="xs" color="text.muted">
                            {formatFileSize(file.size)} · {formatDate(file.created)}
                          </Text>
                        </Stack>
                      </CardHeader>

                      <CardBody>
                        <Box
                          position="relative"
                          borderRadius="xl"
                          overflow="hidden"
                          border="1px solid rgba(121,95,238,0.18)"
                          _hover={{ borderColor: 'brand.300', transform: file.processing ? undefined : 'translateY(-4px)', transition: 'all 0.3s ease' }}
                        >
                          <Box h="220px" bg="surface.blur">
                            <SecureImage
                              filename={file.filename}
                              alt={file.filename}
                              onClick={() => !file.processing && openImageModal(file.filename)}
                            />
                          </Box>
                          {!file.processing && (
                            <Flex
                              position="absolute"
                              inset={0}
                              align="center"
                              justify="center"
                              opacity={0}
                              _hover={{ opacity: 1, backdropFilter: 'blur(8px)', bg: 'rgba(9,12,28,0.55)' }}
                              color="white"
                              transition="all 0.3s ease"
                            >
                              <Stack align="center" spacing={1}>
                                <Iconify icon={FiZoomIn} boxSize={6} />
                                <Text fontSize="sm">Amplify preview</Text>
                              </Stack>
                            </Flex>
                          )}

                          {file.processing && (
                            <Flex
                              position="absolute"
                              inset={0}
                              align="center"
                              justify="center"
                              direction="column"
                              bg="rgba(4,7,19,0.76)"
                              color="white"
                              gap={3}
                            >
                              <Spinner size="lg" thickness="4px" color="brand.200" />
                              <Text fontWeight="600">
                                Processing {file.processing_step}/{file.processing_total}
                              </Text>
                              <Text fontSize="sm" color="rgba(255,255,255,0.75)">
                                {file.processing_stage}
                              </Text>
                            </Flex>
                          )}
                        </Box>
                      </CardBody>

                      <CardFooter>
                        <Flex w="100%" justify="space-between" align="center">
                          <Stack spacing={1}>
                            {file.processing && (
                              <Tag size="md" colorScheme="purple" borderRadius="full">
                                Active pipeline
                              </Tag>
                            )}
                            {!file.processing && file.has_text && (
                              <Badge colorScheme="green" borderRadius="full" px={2}>
                                OCR ready
                              </Badge>
                            )}
                          </Stack>

                          <ButtonGroup size="sm" variant="ghost" spacing={1}>
                            {!file.processing && (
                              <Tooltip label="View" hasArrow>
                                <IconButton aria-label="View" icon={<Iconify icon={FiZoomIn} boxSize={5} />} onClick={() => openImageModal(file.filename)} />
                              </Tooltip>
                            )}
                            {file.has_text && !file.processing && (
                              <Tooltip label="View OCR" hasArrow>
                                <IconButton aria-label="OCR" icon={<Iconify icon={FiFileText} boxSize={5} />} onClick={() => viewOCR(file.filename)} />
                              </Tooltip>
                            )}
                            <Tooltip label="Delete" hasArrow>
                              <IconButton
                                aria-label="Delete"
                                icon={<Iconify icon={FiTrash2} boxSize={5} />}
                                onClick={() => deleteFile(file.filename)}
                                isDisabled={file.processing}
                              />
                            </Tooltip>
                          </ButtonGroup>
                        </Flex>
                      </CardFooter>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>

          {selectedFile && ocrText && (
            <Card border="1px solid rgba(69,202,255,0.25)" bg={surfaceCard} boxShadow="subtle">
              <CardHeader display="flex" alignItems="center" justifyContent="space-between">
                <Heading size="sm">OCR · {selectedFile}</Heading>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedFile(null); setOcrText(''); }}>
                  Close
                </Button>
              </CardHeader>
              <CardBody>
                <Box
                  bg="rgba(15,20,42,0.88)"
                  color="white"
                  borderRadius="2xl"
                  p={5}
                  fontFamily="mono"
                  fontSize="sm"
                  maxH="320px"
                  overflowY="auto"
                  boxShadow="inset 0 0 0 1px rgba(69,202,255,0.18)"
                >
                  {ocrText}
                </Box>
              </CardBody>
            </Card>
          )}
        </Stack>
      )}

      <Modal isOpen={imageModal.isOpen && Boolean(selectedImageFile)} onClose={closeImageModal} size="4xl">
        <ModalOverlay backdropFilter="blur(12px)" />
        <ModalContent bg={surfaceCard} borderRadius="2xl" border="1px solid rgba(121,95,238,0.25)" boxShadow="halo">
          <ModalHeader>{selectedImageFile}</ModalHeader>
          <ModalCloseButton borderRadius="full" />
          <ModalBody>
            {selectedImageFile && (
              <Box borderRadius="2xl" overflow="hidden" border="1px solid rgba(121,95,238,0.2)">
                <SecureImage filename={selectedImageFile} alt={selectedImageFile} />
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeImageModal}>
              Close
            </Button>
        <Button
              colorScheme="brand"
          leftIcon={<Iconify icon={FiDownload} boxSize={5} />}
              onClick={async () => {
                if (!selectedImageFile) return;
                try {
                  const response = await axios.get(
                    `${API_BASE_URL}${API_ENDPOINTS.processed}/${selectedImageFile}`,
                    {
                      headers: getDefaultHeaders(),
                      responseType: 'blob',
                    }
                  );
                  const blob = response.data;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = selectedImageFile;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err: any) {
                  console.error('Download failed:', err);
                  toast({
                    title: 'Download failed',
                    description: err.message,
                    status: 'error',
                  });
                }
              }}
            >
              Download
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={conversionModal.isOpen} onClose={closeConversionModal} size="lg">
        <ModalOverlay backdropFilter="blur(12px)" />
        <ModalContent bg={surfaceCard} borderRadius="2xl" border="1px solid rgba(121,95,238,0.25)">
          <ModalHeader>Convert Files</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={5}>
              <Box>
                <Text fontWeight="600">Selected Files: {selectedFiles.length}</Text>
                <Box mt={2} maxH="160px" overflowY="auto" bg="surface.blur" borderRadius="lg" p={3} border="1px solid rgba(121,95,238,0.2)">
                  <Stack spacing={2} fontSize="sm">
                    {selectedFiles.map((filename) => (
                      <Text key={filename}>{filename}</Text>
                    ))}
                  </Stack>
                </Box>
              </Box>

              <Box>
                <Text fontWeight="600" mb={2}>
                  Convert to
                </Text>
                <Select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)} isDisabled={converting}>
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="docx">Word Document (DOCX)</option>
                </Select>
              </Box>

              {targetFormat === 'pdf' && selectedFiles.length > 1 && (
                <Flex align="center" justify="space-between" bg="surface.blur" borderRadius="lg" p={3} border="1px solid rgba(69,202,255,0.25)">
                  <Stack spacing={1}>
                    <Text fontWeight="600">Merge into single PDF</Text>
                    <Text fontSize="sm" color="text.muted">
                      {mergePdf ? 'All files will merge into one premium PDF output.' : 'Each file becomes an individual PDF.'}
                    </Text>
                  </Stack>
                  <Checkbox isChecked={mergePdf} onChange={(e) => setMergePdf(e.target.checked)} isDisabled={converting} colorScheme="brand" />
                </Flex>
              )}

              {targetFormat === 'pdf' && mergePdf && selectedFiles.length > 1 && (
                <Box>
                  <Text fontWeight="600" mb={2}>
                    PDF Filename (optional)
                  </Text>
                  <Input
                    placeholder="Enter custom filename (without .pdf extension)"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    isDisabled={converting}
                    maxLength={50}
                  />
                  <Text fontSize="xs" color="text.muted" mt={1}>
                    If empty, will use auto-generated name like "merged_document_20251021_123456.pdf"
                  </Text>
                </Box>
              )}

              {conversionProgress && (
                <Box bg="rgba(69,202,255,0.1)" borderRadius="lg" p={3} border="1px solid rgba(69,202,255,0.2)">
                  <Text fontFamily="mono" whiteSpace="pre-wrap" color="brand.200">
                    {conversionProgress}
                  </Text>
                </Box>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeConversionModal} isDisabled={converting}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleConvert} isLoading={converting} loadingText="Converting">
              Convert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Drawer isOpen={convertedDrawer.isOpen} placement="right" onClose={convertedDrawer.onClose} size="md">
        <DrawerOverlay backdropFilter="blur(8px)" />
        <DrawerContent bg={surfaceCard} borderColor="rgba(121,95,238,0.25)" borderLeftWidth="1px">
          <DrawerHeader display="flex" alignItems="center" justifyContent="space-between">
            <Heading size="sm">Converted Files</Heading>
            <Button size="sm" variant="ghost" onClick={convertedDrawer.onClose}>
              Close
            </Button>
          </DrawerHeader>
          <DrawerBody>
            {convertedFiles.length === 0 ? (
              <Flex direction="column" align="center" justify="center" h="full" color="text.muted">
                <Iconify icon={FiFileText} boxSize={12} mb={4} />
                <Text>No converted artifacts yet.</Text>
              </Flex>
            ) : (
              <Stack spacing={4}>
                {convertedFiles.map((file) => (
                  <Card key={file.filename} borderRadius="xl" border="1px solid rgba(69,202,255,0.18)">
                    <CardBody>
                      <Flex justify="space-between" align="center">
                        <Stack spacing={1}>
                          <Heading size="sm">{file.filename}</Heading>
                          <Text fontSize="xs" color="text.muted">
                            {(file.size / 1024).toFixed(2)} KB · {new Date(file.created).toLocaleString()}
                          </Text>
                        </Stack>
                        <Button
                          variant="ghost"
                          leftIcon={<Iconify icon={FiDownload} boxSize={5} />}
                          onClick={async () => {
                            try {
                              const response = await axios.get(`${API_BASE_URL}/converted/${file.filename}`, {
                                headers: getDefaultHeaders(),
                                responseType: 'blob',
                              });
                              const blob = response.data;
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = file.filename;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch (err: any) {
                              console.error('Download failed:', err);
                              toast({
                                title: 'Download failed',
                                description: err.message,
                                status: 'error',
                              });
                            }
                          }}
                        >
                          Download
                        </Button>
                      </Flex>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" width="full" onClick={convertedDrawer.onClose}>
              Close Drawer
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </VStack>
  );
};

export default Dashboard;
