import React, { useEffect, useState, useCallback } from 'react';
import apiClient from '../apiClient';
import { useSocket } from '../context/SocketContext';
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
  Radio,
  RadioGroup,
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
import FancySelect from '../components/FancySelect';

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
        
        const response = await apiClient.get(imageUrl.replace(API_BASE_URL, ''), {
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
  const [selectedImageFile, setSelectedImageFile] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);

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
  
  // Orchestrate Print & Capture state
  const [orchestrateStep, setOrchestrateStep] = useState<number>(1); // 1=mode, 2=options, 3=confirm
  const [orchestrateMode, setOrchestrateMode] = useState<'scan' | 'print' | null>(null);
  const [orchestrateOptions, setOrchestrateOptions] = useState({
    // Scan options
    scanPageMode: 'all' as 'all' | 'odd' | 'even' | 'custom',
    scanCustomRange: '',
    scanLayout: 'portrait' as 'portrait' | 'landscape',
    scanPaperSize: 'A4' as string,
    scanPaperSizeCustom: '',
    scanResolution: '300' as string,
    scanResolutionCustom: '',
    scanColorMode: 'color' as 'color' | 'bw',
    // Print options
    printPages: 'all' as 'all' | 'odd' | 'even' | 'custom',
    printCustomRange: '',
    printLayout: 'portrait' as 'portrait' | 'landscape',
    printPaperSize: 'A4' as string,
    printPaperSizeCustom: '',
    printScale: '100' as string,
    printScaleCustom: '',
    printMargins: 'default' as 'default' | 'custom',
    printMarginsCustom: '',
    printPagesPerSheet: '1' as string,
    printPagesPerSheetCustom: '',
    printFiles: [] as File[],
    printConvertedFiles: [] as string[],
    // Default settings
    saveAsDefault: false,
  });
  
  const toast = useToast();
  const imageModal = useDisclosure();
  const conversionModal = useDisclosure();
  const convertedDrawer = useDisclosure();
  const orchestrateModal = useDisclosure();
  
  // File cache system - stores file metadata and counts
  const [filesCacheRef, setFilesCacheRef] = useState<{
    data: any[] | null;
    lastCount: number;
    timestamp: number;
  }>({
    data: null,
    lastCount: 0,
    timestamp: 0,
  });
  
  const [convertedFilesCacheRef, setConvertedFilesCacheRef] = useState<{
    data: any[] | null;
    lastCount: number;
    timestamp: number;
  }>({
    data: null,
    lastCount: 0,
    timestamp: 0,
  });
  
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

  // Use shared Socket from context instead of creating new connections
  const { socket, connected: socketConnected } = useSocket();

  useEffect(() => {
    // Sync local connected state with socket context
    setConnected(socketConnected);
  }, [socketConnected]);

  useEffect(() => {
    console.log('🔌 Dashboard: Setting up Socket.IO event listeners');
    
    if (!socket) {
      console.log('⚠️ Socket not available yet');
      return;
    }

    // Event listeners for file changes
    socket.on('new_file', (data: any) => {
      console.log('New file uploaded:', data);
      loadFiles(false); // Background refresh, no loading spinner
    });

    socket.on('file_deleted', (data: any) => {
      console.log('File deleted:', data);
      loadFiles(false);
    });

    socket.on('processing_progress', (data: ProcessingProgress) => {
      console.log(`📊 Processing: Step ${data.step}/${data.total_steps} - ${data.stage_name}`);
      setProcessingProgress(data);
    });

    socket.on('processing_complete', (data: any) => {
      console.log('✅ Processing complete:', data);
      setProcessingProgress(null);
      setTimeout(() => loadFiles(false), 500); // Refresh after processing
    });

    socket.on('processing_error', (data: any) => {
      console.error('❌ Processing error:', data);
      setProcessingProgress(null);
    });

    loadFiles();

    // SMART CACHING MODE: Polling disabled for network efficiency
    // Files are cached and only updated when:
    // 1. Socket.IO events indicate new_file, file_deleted, or processing_complete
    // 2. User clicks the manual Reload button
    // 3. Page visibility changes (user switches tabs)
    
    let pollInterval = 60000; // Long interval (1 minute) - mostly for safety net
    const maxInterval = 300000; // Max 5 minutes between polls
    let timeoutId: NodeJS.Timeout;

    // Recursive polling with long intervals (safety net only)
    const startPolling = () => {
      timeoutId = setTimeout(async () => {
        console.log('📋 Safety net polling for new files...');
        try {
          await loadFiles(false);
          // On success, reset to normal interval
          if (pollInterval > 60000) {
            console.log('✅ Connection restored, resetting poll interval');
            pollInterval = 60000;
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
      socket.off('new_file');
      socket.off('file_deleted');
      socket.off('processing_progress');
      socket.off('processing_complete');
      socket.off('processing_error');
    };
  }, [socket, filesCacheRef]);

  const loadFiles = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await apiClient.get(API_ENDPOINTS.files, {
        timeout: 10000 // 10 second timeout
      });
      const filesData = Array.isArray(response.data) ? response.data : (response.data.files || []);
      
      // Smart cache: only update if file count changed
      const newCount = filesData.length;
      if (newCount !== filesCacheRef.lastCount) {
        console.log(`📁 File count changed: ${filesCacheRef.lastCount} → ${newCount}, updating cache`);
        setFiles(filesData);
        setFilesCacheRef({
          data: filesData,
          lastCount: newCount,
          timestamp: Date.now(),
        });
      } else {
        console.log(`📁 File count unchanged (${newCount}), using cached data`);
        // Use cached data if available
        if (filesCacheRef.data) {
          setFiles(filesCacheRef.data);
        } else {
          setFiles(filesData);
        }
      }
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
      await apiClient.delete(`${API_ENDPOINTS.delete}/${filename}`);
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
      const response = await apiClient.get(`${API_ENDPOINTS.ocr}/${filename}`);
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

  const openOrchestrateModal = () => {
    // Reset state
    setOrchestrateStep(1);
    setOrchestrateMode(null);
    
    // If files are selected, auto-select print mode
    if (selectedFiles.length > 0) {
      setOrchestrateMode('print');
      setOrchestrateStep(2);
    }
    
    orchestrateModal.onOpen();
  };

  const handleOrchestrateNext = () => {
    if (orchestrateStep === 1 && orchestrateMode) {
      setOrchestrateStep(2);
    } else if (orchestrateStep === 2) {
      // Execute the action
      if (orchestrateMode === 'print') {
        executePrintJob();
      } else {
        executeScanJob();
      }
    }
  };

  const handleOrchestrateBack = () => {
    if (orchestrateStep === 2) {
      if (selectedFiles.length > 0) {
        // If came from dashboard selection, close modal
        orchestrateModal.onClose();
      } else {
        setOrchestrateStep(1);
      }
    }
  };

  const executePrintJob = async () => {
    try {
      const formData = new FormData();
      
      // Add uploaded files
      orchestrateOptions.printFiles.forEach((file, index) => {
        formData.append('files', file);
      });
      
      // Add converted PDFs
      formData.append('convertedFiles', JSON.stringify(orchestrateOptions.printConvertedFiles));
      
      // Add selected dashboard files if any
      if (selectedFiles.length > 0) {
        formData.append('dashboardFiles', JSON.stringify(selectedFiles));
      }
      
      // Add print options
      formData.append('options', JSON.stringify({
        pages: orchestrateOptions.printPages,
        layout: orchestrateOptions.printLayout,
        paperSize: orchestrateOptions.printPaperSize,
        scale: orchestrateOptions.printScale,
        margins: orchestrateOptions.printMargins,
        pagesPerSheet: orchestrateOptions.printPagesPerSheet,
        saveAsDefault: orchestrateOptions.saveAsDefault,
      }));

      const response = await apiClient.post('/orchestrate/print', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast({
        title: 'Print Job Submitted',
        description: response.data.message || 'Documents sent to printer',
        status: 'success',
      });

      orchestrateModal.onClose();
      
    } catch (err: any) {
      toast({
        title: 'Print Failed',
        description: err.response?.data?.error || err.message,
        status: 'error',
      });
    }
  };

  const executeScanJob = async () => {
    try {
      const response = await apiClient.post('/orchestrate/scan', {
        pageMode: orchestrateOptions.scanPageMode,
        customRange: orchestrateOptions.scanCustomRange,
        layout: orchestrateOptions.scanLayout,
        paperSize: orchestrateOptions.scanPaperSize,
        resolution: orchestrateOptions.scanResolution,
        colorMode: orchestrateOptions.scanColorMode,
        saveAsDefault: orchestrateOptions.saveAsDefault,
      });

      toast({
        title: 'Scan Job Initiated',
        description: response.data.message || 'Scanner is ready',
        status: 'success',
      });

      orchestrateModal.onClose();
      
    } catch (err: any) {
      toast({
        title: 'Scan Failed',
        description: err.response?.data?.error || err.message,
        status: 'error',
      });
    }
  };

  const triggerPrint = async () => {
    // Use the new orchestrate modal
    openOrchestrateModal();
  };

  const testPrinter = async () => {
    try {
      // Show a loading toast
      const loadingToast = toast({
        title: 'Running Diagnostics...',
        description: 'Checking printer configuration and connectivity',
        status: 'info',
        duration: null,
        isClosable: true,
      });

      // Call the diagnostics endpoint
      const response = await apiClient.get('/printer/diagnostics');
      
      // Close loading toast
      toast.close(loadingToast);

      // Display results
      if (response.data.success) {
        toast({
          title: 'Diagnostics Complete ✅',
          description: 'Printer is functioning properly',
          status: 'success',
          duration: 5,
        });
      } else {
        toast({
          title: 'Diagnostics Complete ⚠️',
          description: 'Printer may have issues - check details',
          status: 'warning',
          duration: 5,
        });
      }

      // Store diagnostics output for display
      setSelectedFile(null);
      
      // Show detailed output in a modal-like way using alert for now
      // Better: you could add a Modal component to show the full output
      const shortOutput = response.data.output.split('\n').slice(0, 10).join('\n');
      console.log('Full Diagnostics Output:', response.data.output);
      console.log('Printer Status:', response.data);
      
    } catch (err: any) {
      toast({
        title: 'Diagnostics Failed',
        description: err.message || 'Could not run printer diagnostics',
        status: 'error',
        duration: 5,
      });
      console.error('Diagnostics error:', err);
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

  const openImageModal = useCallback((filename: string) => {
    setSelectedImageFile(filename);
    imageModal.onOpen();
  }, [imageModal]);

  const closeImageModal = useCallback(() => {
    setSelectedImageFile(null);
    imageModal.onClose();
  }, [imageModal]);

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

      const response = await apiClient.post(
        '/convert',
        {
          files: selectedFiles,
          format: targetFormat,
          merge_pdf: mergePdf && targetFormat === 'pdf', // Only merge if format is PDF
          filename: customFilename.trim() || undefined // Pass custom filename if provided
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
      const response = await apiClient.get('/get-converted-files');
      if (response.data.files) {
        // Smart cache: only update if file count changed
        const newCount = response.data.files.length;
        if (newCount !== convertedFilesCacheRef.lastCount) {
          console.log(`📄 Converted file count changed: ${convertedFilesCacheRef.lastCount} → ${newCount}, updating cache`);
          setConvertedFiles(response.data.files);
          setConvertedFilesCacheRef({
            data: response.data.files,
            lastCount: newCount,
            timestamp: Date.now(),
          });
        } else {
          console.log(`📄 Converted file count unchanged (${newCount}), using cached data`);
          // Use cached data if available
          if (convertedFilesCacheRef.data) {
            setConvertedFiles(convertedFilesCacheRef.data);
          } else {
            setConvertedFiles(response.data.files);
          }
        }
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

      <Modal 
        isOpen={imageModal.isOpen && Boolean(selectedImageFile)} 
        onClose={closeImageModal} 
        size={{ base: "full", sm: "xl", md: "2xl", lg: "3xl", xl: "4xl" }}
        scrollBehavior="inside"
        isCentered
      >
        <ModalOverlay backdropFilter="blur(12px)" />
        <ModalContent 
          bg={surfaceCard} 
          borderRadius="2xl" 
          border="1px solid rgba(121,95,238,0.25)" 
          boxShadow="halo"
          maxH={{ base: "95vh", md: "90vh" }}
          m={{ base: 2, md: 4 }}
          overflow="hidden"
        >
          <ModalHeader>{selectedImageFile}</ModalHeader>
          <ModalCloseButton borderRadius="full" />
          <ModalBody p={{ base: 2, md: 4 }} display="flex" alignItems="center" justifyContent="center" overflow="hidden">
            {selectedImageFile && (
              <Box
                as="img"
                src={`${API_BASE_URL}${API_ENDPOINTS.processed}/${selectedImageFile}`}
                alt={selectedImageFile}
                maxW="100%"
                maxH={{ base: "calc(95vh - 120px)", md: "calc(90vh - 120px)" }}
                w="auto"
                h="auto"
                objectFit="contain"
                borderRadius="lg"
                onError={(e: any) => {
                  console.error(`Failed to load image: ${selectedImageFile}`);
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="16"%3E Image not found or deleted%3C/text%3E%3C/svg%3E';
                }}
              />
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
                  const response = await apiClient.get(
                    `${API_ENDPOINTS.processed}/${selectedImageFile}`,
                    {
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
                              const response = await apiClient.get(`/converted/${file.filename}`, {
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

      {/* Orchestrate Print & Capture Modal */}
      <Modal isOpen={orchestrateModal.isOpen} onClose={orchestrateModal.onClose} size="lg" isCentered>
        <ModalOverlay backdropFilter="blur(12px)" />
        <ModalContent bg={surfaceCard} borderRadius="2xl" border="1px solid rgba(121,95,238,0.25)">
          {/* STEP 1: Choose Mode */}
          {orchestrateStep === 1 && (
            <>
              <ModalHeader>Orchestrate Print & Capture</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Stack spacing={6}>
                  <Text color="text.muted">Please choose an operation:</Text>
                  <VStack spacing={4} align="start">
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="2px"
                      borderColor={orchestrateMode === 'scan' ? 'brand.400' : 'whiteAlpha.200'}
                      bg={orchestrateMode === 'scan' ? 'rgba(121,95,238,0.1)' : 'transparent'}
                      cursor="pointer"
                      onClick={() => setOrchestrateMode('scan')}
                      _hover={{ borderColor: 'brand.400', bg: 'rgba(121,95,238,0.05)' }}
                    >
                      <Radio isChecked={orchestrateMode === 'scan'} mr={3}>
                        <Stack spacing={1} ml={2}>
                          <Heading size="sm">Scan Mode</Heading>
                          <Text fontSize="sm" color="text.muted">Capture documents from your scanner</Text>
                        </Stack>
                      </Radio>
                    </Box>
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="2px"
                      borderColor={orchestrateMode === 'print' ? 'brand.400' : 'whiteAlpha.200'}
                      bg={orchestrateMode === 'print' ? 'rgba(121,95,238,0.1)' : 'transparent'}
                      cursor="pointer"
                      onClick={() => setOrchestrateMode('print')}
                      _hover={{ borderColor: 'brand.400', bg: 'rgba(121,95,238,0.05)' }}
                    >
                      <Radio isChecked={orchestrateMode === 'print'} mr={3}>
                        <Stack spacing={1} ml={2}>
                          <Heading size="sm">Print Mode</Heading>
                          <Text fontSize="sm" color="text.muted">Print documents from your collection</Text>
                        </Stack>
                      </Radio>
                    </Box>
                  </VStack>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={orchestrateModal.onClose}>
                  Cancel
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={() => setOrchestrateStep(2)}
                  isDisabled={!orchestrateMode}
                >
                  Continue
                </Button>
              </ModalFooter>
            </>
          )}

          {/* STEP 2: Scan Options */}
          {orchestrateStep === 2 && orchestrateMode === 'scan' && (
            <>
              <ModalHeader>Scan Options</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Stack spacing={6}>
                  {/* Page Scan Mode */}
                  <Box>
                    <Heading size="sm" mb={3}>Select Page Scan Mode</Heading>
                    <RadioGroup
                      value={orchestrateOptions.scanPageMode}
                      onChange={(value: string) => setOrchestrateOptions({ ...orchestrateOptions, scanPageMode: value as any })}
                    >
                      <Stack spacing={2}>
                        <Radio value="all">📄 Scan All Pages</Radio>
                        <Radio value="odd">🔢 Odd Pages Only (1, 3, 5...)</Radio>
                        <Radio value="even">🔢 Even Pages Only (2, 4, 6...)</Radio>
                        <Radio value="custom">
                          Custom Page Range:
                          <Input
                            size="sm"
                            ml={3}
                            width="200px"
                            placeholder="e.g., 1-5,7,9"
                            isDisabled={orchestrateOptions.scanPageMode !== 'custom'}
                            value={orchestrateOptions.scanCustomRange}
                            onChange={(e) => setOrchestrateOptions({ ...orchestrateOptions, scanCustomRange: e.target.value })}
                            mt={2}
                          />
                        </Radio>
                      </Stack>
                    </RadioGroup>
                  </Box>

                  {/* Scan Layout */}
                  <Box>
                    <Heading size="sm" mb={3}>Select Scan Layout</Heading>
                    <RadioGroup
                      value={orchestrateOptions.scanLayout}
                      onChange={(value: string) => setOrchestrateOptions({ ...orchestrateOptions, scanLayout: value as any })}
                    >
                      <Stack spacing={2}>
                        <Radio value="portrait">📄 Portrait (Vertical)</Radio>
                        <Radio value="landscape">📐 Landscape (Horizontal)</Radio>
                      </Stack>
                    </RadioGroup>
                  </Box>

                  {/* Paper Size - Fancy Select */}
                  <Box>
                    <FancySelect
                      label="Paper Size"
                      options={[
                        { value: 'A4', label: 'A4 (210×297 mm)' },
                        { value: 'Letter', label: 'Letter (8.5×11 in)' },
                        { value: 'Legal', label: 'Legal (8.5×14 in)' },
                        { value: 'A3', label: 'A3 (297×420 mm)' },
                        { value: 'custom', label: '✏️ Custom Size' },
                      ]}
                      value={orchestrateOptions.scanPaperSize}
                      onChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, scanPaperSize: value })}
                      allowCustom={true}
                      customValue={orchestrateOptions.scanPaperSizeCustom}
                      onCustomChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, scanPaperSizeCustom: value })}
                    />
                  </Box>

                  {/* Resolution - Fancy Select */}
                  <Box>
                    <FancySelect
                      label="Scan Resolution (DPI)"
                      options={[
                        { value: '150', label: '150 DPI - Draft (Fast, Small File)' },
                        { value: '200', label: '200 DPI - Good Quality' },
                        { value: '300', label: '300 DPI - Standard (Recommended)' },
                        { value: '600', label: '600 DPI - High Quality' },
                        { value: '1200', label: '1200 DPI - Maximum Quality' },
                        { value: 'custom', label: '✏️ Custom DPI' },
                      ]}
                      value={orchestrateOptions.scanResolution}
                      onChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, scanResolution: value })}
                      allowCustom={true}
                      customValue={orchestrateOptions.scanResolutionCustom}
                      onCustomChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, scanResolutionCustom: value })}
                    />
                  </Box>

                  {/* Color Mode */}
                  <Box>
                    <Heading size="sm" mb={3}>Select Color Mode</Heading>
                    <RadioGroup
                      value={orchestrateOptions.scanColorMode}
                      onChange={(value: string) => setOrchestrateOptions({ ...orchestrateOptions, scanColorMode: value as any })}
                    >
                      <Stack spacing={2}>
                        <Radio value="color">🎨 Color (Full RGB)</Radio>
                        <Radio value="bw">⬛ Black & White (Grayscale)</Radio>
                      </Stack>
                    </RadioGroup>
                  </Box>

                  {/* Save as Default */}
                  <Checkbox
                    isChecked={orchestrateOptions.saveAsDefault}
                    onChange={(e) => setOrchestrateOptions({ ...orchestrateOptions, saveAsDefault: e.target.checked })}
                  >
                    Save as Default Settings
                  </Checkbox>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={() => setOrchestrateStep(1)}>
                  Back
                </Button>
                <Button colorScheme="brand" onClick={() => setOrchestrateStep(3)}>
                  Proceed
                </Button>
              </ModalFooter>
            </>
          )}

          {/* STEP 2: Print Options */}
          {orchestrateStep === 2 && orchestrateMode === 'print' && (
            <>
              <ModalHeader>Print Options</ModalHeader>
              <ModalCloseButton />
              <ModalBody maxH="60vh" overflowY="auto">
                <Stack spacing={6}>
                  {/* Pages */}
                  <Box>
                    <Heading size="sm" mb={3}>Pages to Print</Heading>
                    <RadioGroup
                      value={orchestrateOptions.printPages}
                      onChange={(value: string) => setOrchestrateOptions({ ...orchestrateOptions, printPages: value as any })}
                    >
                      <Stack spacing={2}>
                        <Radio value="all">All Pages (Default)</Radio>
                        <Radio value="odd">Odd Pages Only</Radio>
                        <Radio value="even">Even Pages Only</Radio>
                        <Radio value="custom">
                          Custom Pages:
                          <Input
                            size="sm"
                            ml={3}
                            width="200px"
                            placeholder="e.g., 1-5,7,9"
                            isDisabled={orchestrateOptions.printPages !== 'custom'}
                            value={orchestrateOptions.printCustomRange}
                            onChange={(e) => setOrchestrateOptions({ ...orchestrateOptions, printCustomRange: e.target.value })}
                            mt={2}
                          />
                        </Radio>
                      </Stack>
                    </RadioGroup>
                  </Box>

                  {/* Layout */}
                  <Box>
                    <Heading size="sm" mb={3}>Layout</Heading>
                    <RadioGroup
                      value={orchestrateOptions.printLayout}
                      onChange={(value: string) => setOrchestrateOptions({ ...orchestrateOptions, printLayout: value as any })}
                    >
                      <Stack spacing={2}>
                        <Radio value="portrait">📄 Portrait</Radio>
                        <Radio value="landscape">📐 Landscape</Radio>
                      </Stack>
                    </RadioGroup>
                  </Box>

                  {/* Paper Size - Fancy Select */}
                  <Box>
                    <FancySelect
                      label="Paper Size"
                      options={[
                        { value: 'A4', label: 'A4 (210×297 mm)' },
                        { value: 'Letter', label: 'Letter (8.5×11 in)' },
                        { value: 'Legal', label: 'Legal (8.5×14 in)' },
                        { value: 'A3', label: 'A3 (297×420 mm)' },
                        { value: 'custom', label: '✏️ Custom Size' },
                      ]}
                      value={orchestrateOptions.printPaperSize}
                      onChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printPaperSize: value })}
                      allowCustom={true}
                      customValue={orchestrateOptions.printPaperSizeCustom}
                      onCustomChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printPaperSizeCustom: value })}
                    />
                  </Box>

                  {/* Scale - Fancy Select */}
                  <Box>
                    <FancySelect
                      label="Print Scale (%)"
                      options={[
                        { value: '50', label: '50% - Reduced' },
                        { value: '75', label: '75% - Smaller' },
                        { value: '100', label: '100% - Actual Size' },
                        { value: '125', label: '125% - Larger' },
                        { value: '150', label: '150% - Extra Large' },
                        { value: 'custom', label: '✏️ Custom Scale' },
                      ]}
                      value={orchestrateOptions.printScale}
                      onChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printScale: value })}
                      allowCustom={true}
                      customValue={orchestrateOptions.printScaleCustom}
                      onCustomChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printScaleCustom: value })}
                    />
                  </Box>

                  {/* Margins - Fancy Select */}
                  <Box>
                    <FancySelect
                      label="Margins"
                      options={[
                        { value: 'default', label: 'Default (1 inch)' },
                        { value: 'narrow', label: 'Narrow (0.5 inch)' },
                        { value: 'wide', label: 'Wide (1.5 inch)' },
                        { value: 'custom', label: '✏️ Custom Margins' },
                      ]}
                      value={orchestrateOptions.printMargins}
                      onChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printMargins: value as any })}
                      allowCustom={true}
                      customValue={orchestrateOptions.printMarginsCustom}
                      onCustomChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printMarginsCustom: value })}
                    />
                  </Box>

                  {/* Pages per Sheet - Fancy Select */}
                  <Box>
                    <FancySelect
                      label="Pages per Sheet"
                      options={[
                        { value: '1', label: '1 Page per Sheet (Normal)' },
                        { value: '2', label: '2 Pages per Sheet (A5 Size)' },
                        { value: '4', label: '4 Pages per Sheet (Booklet)' },
                        { value: '6', label: '6 Pages per Sheet' },
                        { value: '9', label: '9 Pages per Sheet' },
                        { value: 'custom', label: '✏️ Custom Layout' },
                      ]}
                      value={orchestrateOptions.printPagesPerSheet}
                      onChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printPagesPerSheet: value })}
                      allowCustom={true}
                      customValue={orchestrateOptions.printPagesPerSheetCustom}
                      onCustomChange={(value) => setOrchestrateOptions({ ...orchestrateOptions, printPagesPerSheetCustom: value })}
                    />
                  </Box>

                  {/* Select Converted PDFs */}
                  <Box>
                    <Heading size="sm" mb={3}>Select Converted PDFs</Heading>
                    {convertedFiles.length === 0 ? (
                      <Text fontSize="sm" color="text.muted">No converted PDFs available</Text>
                    ) : (
                      <VStack spacing={2}>
                        {convertedFiles.map((file) => (
                          <Box
                            key={file.filename}
                            p={2}
                            borderRadius="md"
                            border="1px"
                            borderColor="whiteAlpha.200"
                            width="full"
                            cursor="pointer"
                            onClick={() => {
                              const isSelected = orchestrateOptions.printConvertedFiles.includes(file.filename);
                              setOrchestrateOptions({
                                ...orchestrateOptions,
                                printConvertedFiles: isSelected
                                  ? orchestrateOptions.printConvertedFiles.filter((f) => f !== file.filename)
                                  : [...orchestrateOptions.printConvertedFiles, file.filename],
                              });
                            }}
                            bg={orchestrateOptions.printConvertedFiles.includes(file.filename) ? 'rgba(121,95,238,0.1)' : 'transparent'}
                          >
                            <Checkbox isChecked={orchestrateOptions.printConvertedFiles.includes(file.filename)}>
                              {file.filename} ({(file.size / 1024).toFixed(2)} KB)
                            </Checkbox>
                          </Box>
                        ))}
                      </VStack>
                    )}
                  </Box>

                  {/* Save as Default */}
                  <Checkbox
                    isChecked={orchestrateOptions.saveAsDefault}
                    onChange={(e) => setOrchestrateOptions({ ...orchestrateOptions, saveAsDefault: e.target.checked })}
                  >
                    Save as Default Settings
                  </Checkbox>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={() => setOrchestrateStep(1)}>
                  Back
                </Button>
                <Button colorScheme="brand" onClick={() => setOrchestrateStep(3)}>
                  Proceed
                </Button>
              </ModalFooter>
            </>
          )}

          {/* STEP 3: Confirmation */}
          {orchestrateStep === 3 && (
            <>
              <ModalHeader>Confirm {orchestrateMode === 'scan' ? 'Scan' : 'Print'} Settings</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <Stack spacing={4}>
                  <Box bg="rgba(121,95,238,0.1)" p={4} borderRadius="lg">
                    <Heading size="sm" mb={3}>Summary</Heading>
                    <VStack spacing={2} align="start" fontSize="sm">
                      {orchestrateMode === 'scan' ? (
                        <>
                          <Text><strong>Mode:</strong> Scan</Text>
                          <Text><strong>Page Mode:</strong> {orchestrateOptions.scanPageMode}</Text>
                          <Text><strong>Layout:</strong> {orchestrateOptions.scanLayout}</Text>
                          <Text><strong>Paper Size:</strong> {orchestrateOptions.scanPaperSize}</Text>
                          <Text><strong>Resolution:</strong> {orchestrateOptions.scanResolution} DPI</Text>
                          <Text><strong>Color Mode:</strong> {orchestrateOptions.scanColorMode}</Text>
                        </>
                      ) : (
                        <>
                          <Text><strong>Mode:</strong> Print</Text>
                          <Text><strong>Pages:</strong> {orchestrateOptions.printPages}</Text>
                          <Text><strong>Layout:</strong> {orchestrateOptions.printLayout}</Text>
                          <Text><strong>Paper Size:</strong> {orchestrateOptions.printPaperSize}</Text>
                          <Text><strong>Scale:</strong> {orchestrateOptions.printScale}%</Text>
                          <Text><strong>Pages per Sheet:</strong> {orchestrateOptions.printPagesPerSheet}</Text>
                          {orchestrateOptions.printConvertedFiles.length > 0 && (
                            <Text><strong>Selected PDFs:</strong> {orchestrateOptions.printConvertedFiles.length} file(s)</Text>
                          )}
                        </>
                      )}
                      {orchestrateOptions.saveAsDefault && (
                        <Text color="brand.400"><strong>✓</strong> Will save as default settings</Text>
                      )}
                    </VStack>
                  </Box>
                </Stack>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={() => setOrchestrateStep(2)}>
                  Back
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={() => {
                    toast({
                      title: 'Operation Started',
                      description: `${orchestrateMode === 'scan' ? 'Scanning' : 'Printing'} with your selected options...`,
                      status: 'info',
                      duration: 3000,
                    });
                    orchestrateModal.onClose();
                    setOrchestrateStep(1);
                    setOrchestrateMode(null);
                  }}
                >
                  Proceed
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </VStack>
  );
};

export default Dashboard;

