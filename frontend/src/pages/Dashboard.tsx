// ==================== MODAL & PREVIEW CONFIGURATION ====================
// 📐 ADJUST THESE VALUES TO CONTROL MODAL AND PREVIEW SIZING
//
// If the preview is cut off or you want to change the modal size:
// 1. Adjust modal.maxHeight/maxWidth to change the overall modal size
// 2. Adjust modalBody.maxHeight to change scrollable content area
// 3. Adjust previewBox.maxHeight to change the sticky preview container height
//
const MODAL_CONFIG = {
  modal: {
    maxHeight: '90vh', // Maximum modal height (increase to make modal taller)
    maxWidth: '95vw', // Maximum modal width (increase to make modal wider)
  },
  modalBody: {
    maxHeight: '90vh - 10rem', // Modal body max height (leave room for header/footer)
  },
  previewBox: {
    maxHeight: '90vh - 12rem', // Preview box max height (sticky container - increase if preview is cut off)
  },
};
// =======================================================================

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
  Grid,
  Heading,
  HStack,
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
import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiTrash2,
  FiZoomIn,
  FiLayers,
  FiMic,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import Iconify from '../components/Iconify';
import FancySelect from '../components/FancySelect';
import VoiceAIChat from '../components/VoiceAIChat';
import ConnectionValidator from '../components/ConnectionValidator';
import DocumentSelector from '../components/DocumentSelector';
import DocumentPreview from '../components/DocumentPreview';
import OrchestrationVoiceControl from '../components/OrchestrationVoiceControl';

// Motion components
const MotionBox = motion(Box);
const MotionCard = motion(Card);
const MotionModalContent = motion(ModalContent);
const MotionButton = motion(Button);
const MotionFlex = motion(Flex);

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
          timeout: 10000,
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
interface SecureImageProps {
  filename: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const SecureImage: React.FC<SecureImageProps> = ({ filename, alt, className, onClick, style }) => {
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

  // Smart selection state - simple multi-select
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [rangeStart, setRangeStart] = useState<number | null>(null);
  const [rangeEnd, setRangeEnd] = useState<number | null>(null);

  // Orchestrate Print & Capture state
  const [orchestrateStep, setOrchestrateStep] = useState<number>(1); // 1=mode, 2=options, 3=confirm
  const [orchestrateMode, setOrchestrateMode] = useState<'scan' | 'print' | null>(null);
  const [orchestrateOptions, setOrchestrateOptions] = useState({
    // Scan options
    scanMode: 'single' as 'single' | 'multi',
    scanTextMode: false,
    scanPageMode: 'all' as 'all' | 'odd' | 'even' | 'custom',
    scanCustomRange: '',
    scanLayout: 'portrait' as 'portrait' | 'landscape',
    scanPaperSize: 'A4' as string,
    scanPaperSizeCustom: '',
    scanResolution: '300' as string,
    scanResolutionCustom: '',
    scanColorMode: 'color' as 'color' | 'grayscale' | 'bw',
    // Print options
    printPages: 'all' as 'all' | 'odd' | 'even' | 'custom',
    printCustomRange: '',
    printLayout: 'portrait' as 'portrait' | 'landscape',
    printPaperSize: 'A4' as string,
    printPaperSizeCustom: '',
    printResolution: '300' as string,
    printColorMode: 'color' as 'color' | 'grayscale' | 'bw',
    printScale: '100' as string,
    printScaleCustom: '',
    printMargins: 'default' as 'default' | 'narrow' | 'none',
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
  const voiceAIDrawer = useDisclosure(); // Voice AI chat drawer
  const documentSelectorModal = useDisclosure(); // Document selector modal

  // Selected documents for orchestrate modal
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);

  // Ref for scrolling the modal body
  const modalBodyRef = React.useRef<HTMLDivElement>(null);

  // Load saved defaults from localStorage on mount
  useEffect(() => {
    const savedDefaults = localStorage.getItem('printchakra_orchestrate_defaults');
    if (savedDefaults) {
      try {
        const parsed = JSON.parse(savedDefaults);
        setOrchestrateOptions((prev: typeof orchestrateOptions) => ({
          ...prev,
          ...parsed,
          // Don't restore files and saveAsDefault flag
          printFiles: [],
          printConvertedFiles: [],
          saveAsDefault: false,
        }));
      } catch (e) {
        console.error('Failed to parse saved defaults:', e);
      }
    }
  }, []);

  // Save defaults to localStorage when saveAsDefault is checked
  const saveDefaultSettings = () => {
    const settingsToSave = {
      scanMode: orchestrateOptions.scanMode,
      scanTextMode: orchestrateOptions.scanTextMode,
      scanPageMode: orchestrateOptions.scanPageMode,
      scanLayout: orchestrateOptions.scanLayout,
      scanPaperSize: orchestrateOptions.scanPaperSize,
      scanResolution: orchestrateOptions.scanResolution,
      scanColorMode: orchestrateOptions.scanColorMode,
      printPages: orchestrateOptions.printPages,
      printLayout: orchestrateOptions.printLayout,
      printPaperSize: orchestrateOptions.printPaperSize,
      printScale: orchestrateOptions.printScale,
      printMargins: orchestrateOptions.printMargins,
    };
    localStorage.setItem('printchakra_orchestrate_defaults', JSON.stringify(settingsToSave));
    toast({
      title: '💾 Settings Saved',
      description: 'Your default settings have been saved locally',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

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

  const surfaceCard = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  const statusDotColor = connected ? 'green.400' : 'red.400';
  const statusTextColor = useColorModeValue('gray.600', 'gray.300');

  const { socket, connected: socketConnected } = useSocket();

  useEffect(() => {
    setConnected(socketConnected);
  }, [socketConnected]);

  useEffect(() => {
    console.log('🔌 Dashboard: Setting up Socket.IO event listeners');

    if (!socket) {
      console.log('⚠️ Socket not available yet');
      return;
    }

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

    let pollInterval = 60000;
    const maxInterval = 300000;
    let timeoutId: ReturnType<typeof setTimeout>;

    const startPolling = () => {
      timeoutId = setTimeout(async () => {
        console.log('📋 Safety net polling for new files...');
        try {
          await loadFiles(false);
          if (pollInterval > 60000) {
            console.log('✅ Connection restored, resetting poll interval');
            pollInterval = 60000;
            setConnectionRetries(0);
          }
        } catch (err) {
          pollInterval = Math.min(pollInterval * 1.5, maxInterval);
          setConnectionRetries((prev: number) => prev + 1);
          console.log(`⚠️ Poll failed, backing off to ${pollInterval}ms`);
        }
        startPolling();
      }, pollInterval);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📋 Page became visible - refreshing files');
        loadFiles(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, filesCacheRef]);

  const loadFiles = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await apiClient.get(API_ENDPOINTS.files, {
        timeout: 10000, // 10 second timeout
      });
      const filesData = Array.isArray(response.data) ? response.data : response.data.files || [];

      // Smart cache: only update if file count changed
      const newCount = filesData.length;
      if (newCount !== filesCacheRef.lastCount) {
        console.log(
          `📁 File count changed: ${filesCacheRef.lastCount} → ${newCount}, updating cache`
        );
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
      const errorMsg =
        err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_CLOSED'
          ? '⚠️ Backend connection lost. Retrying...'
          : err.message || 'Failed to load files';
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
      setFiles(files.filter((f: FileInfo) => f.filename !== filename));
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

  const executePrintJob = async () => {
    try {
      const formData = new FormData();

      // Add uploaded files
      orchestrateOptions.printFiles.forEach((file: File, index: number) => {
        formData.append('files', file);
      });

      // Add converted PDFs
      formData.append('convertedFiles', JSON.stringify(orchestrateOptions.printConvertedFiles));

      // Add selected dashboard files if any
      if (selectedFiles.length > 0) {
        formData.append('dashboardFiles', JSON.stringify(selectedFiles));
      }

      // Add print options
      formData.append(
        'options',
        JSON.stringify({
          pages: orchestrateOptions.printPages,
          layout: orchestrateOptions.printLayout,
          paperSize: orchestrateOptions.printPaperSize,
          scale: orchestrateOptions.printScale,
          margins: orchestrateOptions.printMargins,
          pagesPerSheet: orchestrateOptions.printPagesPerSheet,
          saveAsDefault: orchestrateOptions.saveAsDefault,
        })
      );

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

  // Voice command handler for orchestration modal
  const handleVoiceCommand = (command: string, params?: any) => {
    console.log('🎤 Voice command received:', command, params);

    switch (command) {
      case 'SELECT_DOCUMENT':
        documentSelectorModal.onOpen();
        toast({
          title: '📄 Opening Document Selector',
          status: 'info',
          duration: 2000,
        });
        break;

      case 'SCROLL_DOWN':
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollBy({ top: 300, behavior: 'smooth' });
        }
        break;

      case 'SCROLL_UP':
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollBy({ top: -300, behavior: 'smooth' });
        }
        break;

      case 'APPLY_SETTINGS':
        if (orchestrateStep === 2) {
          setOrchestrateStep(3);
          toast({
            title: '✅ Proceeding to Confirmation',
            status: 'success',
            duration: 2000,
          });
        } else if (orchestrateStep === 3) {
          if (orchestrateMode === 'print') {
            executePrintJob();
          } else if (orchestrateMode === 'scan') {
            executeScanJob();
          }
        }
        break;

      case 'GO_BACK':
        if (orchestrateStep > 1) {
          setOrchestrateStep(orchestrateStep - 1);
          toast({
            title: '⬅️ Going Back',
            status: 'info',
            duration: 2000,
          });
        }
        break;

      case 'CANCEL':
        orchestrateModal.onClose();
        toast({
          title: '❌ Orchestration Cancelled',
          status: 'info',
          duration: 2000,
        });
        break;

      case 'SET_COLOR':
        if (params?.colorMode) {
          if (orchestrateMode === 'scan') {
            setOrchestrateOptions({
              ...orchestrateOptions,
              scanColorMode: params.colorMode,
            });
          } else if (orchestrateMode === 'print') {
            setOrchestrateOptions({
              ...orchestrateOptions,
              printColorMode: params.colorMode,
            });
          }
          toast({
            title: `🎨 Color Mode: ${params.colorMode}`,
            status: 'success',
            duration: 2000,
          });
        }
        break;

      case 'SET_LAYOUT':
        if (params?.layout) {
          if (orchestrateMode === 'scan') {
            setOrchestrateOptions({
              ...orchestrateOptions,
              scanLayout: params.layout,
            });
          } else if (orchestrateMode === 'print') {
            setOrchestrateOptions({
              ...orchestrateOptions,
              printLayout: params.layout,
            });
          }
          toast({
            title: `📄 Layout: ${params.layout}`,
            status: 'success',
            duration: 2000,
          });
        }
        break;

      case 'SET_RESOLUTION':
        if (params?.dpi && orchestrateMode === 'scan') {
          setOrchestrateOptions({
            ...orchestrateOptions,
            scanResolution: String(params.dpi),
          });
          toast({
            title: `🔍 Resolution: ${params.dpi} DPI`,
            status: 'success',
            duration: 2000,
          });
        }
        break;

      case 'TOGGLE_OCR':
        if (orchestrateMode === 'scan') {
          setOrchestrateOptions({
            ...orchestrateOptions,
            scanTextMode: params?.enabled ?? !orchestrateOptions.scanTextMode,
          });
          toast({
            title: params?.enabled ? '✅ OCR Enabled' : '❌ OCR Disabled',
            status: 'success',
            duration: 2000,
          });
        }
        break;

      default:
        console.log('Unknown voice command:', command);
    }
  };

  const triggerPrint = async () => {
    // Use the new orchestrate modal
    openOrchestrateModal();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

      setSelectedFile(null);
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

  const openImageModal = useCallback(
    (filename: string) => {
      setSelectedImageFile(filename);
      imageModal.onOpen();
    },
    [imageModal]
  );

  const closeImageModal = useCallback(() => {
    setSelectedImageFile(null);
    imageModal.onClose();
  }, [imageModal]);

  // Conversion handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedFiles([]);
    setLastClickedIndex(null);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const handleFileClick = (index: number, filename: string) => {
    if (!selectionMode) return;

    // Simply toggle the file selection
    setSelectedFiles((prev: string[]) => {
      const isSelected = prev.includes(filename);
      const newSelected = isSelected
        ? prev.filter((f: string) => f !== filename)
        : [...prev, filename];

      // Update range based on selected files
      if (newSelected.length >= 2) {
        const selectedIndices = files
          .map((f: FileInfo, idx: number) => ({ filename: f.filename, index: idx }))
          .filter((f: { filename: string; index: number }) => newSelected.includes(f.filename))
          .map((f: { filename: string; index: number }) => f.index)
          .sort((a: number, b: number) => a - b);

        setRangeStart(selectedIndices[0]);
        setRangeEnd(selectedIndices[selectedIndices.length - 1]);
      } else {
        setRangeStart(null);
        setRangeEnd(null);
      }

      return newSelected;
    });

    setLastClickedIndex(index);
  };

  const selectRange = () => {
    if (rangeStart !== null && rangeEnd !== null) {
      const start = Math.min(rangeStart, rangeEnd);
      const end = Math.max(rangeStart, rangeEnd);
      const rangeFiles = files.slice(start, end + 1).map((f: FileInfo) => f.filename);
      setSelectedFiles(rangeFiles);
    }
  };

  const selectOdd = () => {
    if (rangeStart !== null && rangeEnd !== null) {
      const start = Math.min(rangeStart, rangeEnd);
      const end = Math.max(rangeStart, rangeEnd);
      const oddFiles = files
        .slice(start, end + 1)
        .filter((_: FileInfo, idx: number) => idx % 2 === 0) // 0-indexed, so even idx = odd position (1st, 3rd, 5th...)
        .map((f: FileInfo) => f.filename);
      setSelectedFiles(oddFiles);
    }
  };

  const selectEven = () => {
    if (rangeStart !== null && rangeEnd !== null) {
      const start = Math.min(rangeStart, rangeEnd);
      const end = Math.max(rangeStart, rangeEnd);
      const evenFiles = files
        .slice(start, end + 1)
        .filter((_: FileInfo, idx: number) => idx % 2 === 1) // 0-indexed, so odd idx = even position (2nd, 4th, 6th...)
        .map((f: FileInfo) => f.filename);
      setSelectedFiles(evenFiles);
    }
  };

  const selectAll = () => {
    setSelectedFiles(files.map((f: FileInfo) => f.filename));
    setLastClickedIndex(null);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setLastClickedIndex(null);
    setRangeStart(null);
    setRangeEnd(null);
  };

  const invertSelection = () => {
    const currentlySelected = new Set(selectedFiles);
    const inverted = files
      .filter((f: FileInfo) => !currentlySelected.has(f.filename))
      .map((f: FileInfo) => f.filename);
    setSelectedFiles(inverted);
    setLastClickedIndex(null);
    setRangeStart(null);
    setRangeEnd(null);
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

      const response = await apiClient.post('/convert', {
        files: selectedFiles,
        format: targetFormat,
        merge_pdf: mergePdf && targetFormat === 'pdf', // Only merge if format is PDF
        filename: customFilename.trim() || undefined, // Pass custom filename if provided
      });

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
              description: merged
                ? `${selectedFiles.length} files combined successfully.`
                : `${successFiles.length} files available in converted folder.`,
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
          console.log(
            `📄 Converted file count changed: ${convertedFilesCacheRef.lastCount} → ${newCount}, updating cache`
          );
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

  const [showConnectionStatus, setShowConnectionStatus] = useState(false);

  return (
    <VStack align="stretch" spacing={10} pb={12}>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={6}>
        <Stack spacing={2}>
          <Heading size="lg" display="flex" alignItems="center" gap={3}>
            📊 Dashboard
          </Heading>
          <Text color="text.muted" maxW="lg">
            Monitor document ingestion, inspect OCR output, and orchestrate premium conversions in
            real time.
          </Text>
        </Stack>

        <Stack direction="row" spacing={3} align="center">
          <Flex
            align="center"
            gap={2}
            px={4}
            py={2}
            borderRadius="full"
            bg="surface.blur"
            border="1px solid"
            borderColor="rgba(121,95,238,0.2)"
          >
            <Box
              w={3}
              h={3}
              borderRadius="full"
              bg={error ? 'orange.400' : statusDotColor}
              boxShadow={`0 0 12px ${error ? 'rgba(246,164,76,0.6)' : 'rgba(129,230,217,0.8)'}`}
            />
            <Text fontWeight="600" color={statusTextColor}>
              {error
                ? `Connection issues (retry ${connectionRetries})`
                : connected
                  ? 'Live link established'
                  : 'Disconnected'}
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

      {/* Smart Connection Status - only show when button is clicked */}
      <Button
        size="lg"
        colorScheme="cyan"
        variant="outline"
        mb={4}
        onClick={() => setShowConnectionStatus(true)}
      >
        Show Connection Status
      </Button>

      {/* Connection Validator Modal */}
      <ConnectionValidator
        isOpen={showConnectionStatus}
        onClose={() => setShowConnectionStatus(false)}
      />

      <Stack direction={{ base: 'column', lg: 'row' }} spacing={4} wrap="wrap">
        <MotionBox
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            size="lg"
            colorScheme="brand"
            variant="solid"
            onClick={triggerPrint}
            leftIcon={<Iconify icon={FiLayers} boxSize={5} />}
            boxShadow="0 4px 14px rgba(121,95,238,0.4)"
            _hover={{ boxShadow: '0 6px 20px rgba(121,95,238,0.6)' }}
            transition="all 0.3s"
          >
            Orchestrate Print Capture
          </Button>
        </MotionBox>
        <MotionBox
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            size="lg"
            colorScheme="purple"
            variant="solid"
            onClick={voiceAIDrawer.onOpen}
            leftIcon={<Iconify icon={FiMic} boxSize={5} />}
            boxShadow="0 4px 14px rgba(147,51,234,0.4)"
            _hover={{ boxShadow: '0 6px 20px rgba(147,51,234,0.6)' }}
            transition="all 0.3s"
          >
            Talk with PrintChakra AI
          </Button>
        </MotionBox>
        <MotionBox
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Button
            size="lg"
            variant={selectionMode ? 'solid' : 'ghost'}
            colorScheme={selectionMode ? 'orange' : 'brand'}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Cancel Selection' : 'Select Files'}
          </Button>
        </MotionBox>
        {selectionMode && selectedFiles.length > 0 && (
          <MotionBox
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button size="lg" colorScheme="brand" variant="outline" onClick={openConversionModal}>
              Convert {selectedFiles.length} Selected
            </Button>
          </MotionBox>
        )}
        <MotionBox
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
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
        </MotionBox>
      </Stack>

      {error && (
        <Box
          borderRadius="xl"
          bg="rgba(255, 170, 0, 0.08)"
          border="1px solid rgba(255,170,0,0.2)"
          p={4}
        >
          <Text color="orange.300" fontWeight="600">
            {error}
          </Text>
        </Box>
      )}

      {processingProgress && (
        <Card bg={surfaceCard} border="1px solid rgba(121,95,238,0.15)" boxShadow="subtle">
          <CardHeader>
            <Heading size="sm">
              Processing · Step {processingProgress.step}/{processingProgress.total_steps} ·{' '}
              {processingProgress.stage_name}
            </Heading>
          </CardHeader>
          <CardBody>
            <Stack spacing={3}>
              <Progress
                value={(processingProgress.step / processingProgress.total_steps) * 100}
                colorScheme="brand"
                borderRadius="full"
                height="10px"
              />
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

            {/* Selection Buttons - Simple multi-select */}
            {selectionMode && files.length > 0 && (
              <Stack spacing={3} mb={6}>
                <Flex gap={2} wrap="wrap" align="center">
                  {/* Always show basic buttons */}
                  <Button size="sm" colorScheme="blue" variant="outline" onClick={selectAll}>
                    Select All
                  </Button>

                  <Button
                    size="sm"
                    colorScheme="gray"
                    variant="outline"
                    onClick={clearSelection}
                    isDisabled={selectedFiles.length === 0}
                  >
                    Clear All
                  </Button>

                  {/* Show Select Range button when user has selected 2+ different items */}
                  {selectedFiles.length >= 2 && rangeStart !== null && rangeEnd !== null && (
                    <Button
                      size="sm"
                      colorScheme="green"
                      variant="solid"
                      onClick={selectRange}
                      leftIcon={<Box as="span">📍</Box>}
                      boxShadow="0 0 20px rgba(72, 187, 120, 0.4)"
                    >
                      Select Range ({rangeEnd - rangeStart + 1} items)
                    </Button>
                  )}

                  {/* Show Odd/Even buttons after a range is selected */}
                  {selectedFiles.length > 1 && rangeStart !== null && rangeEnd !== null && (
                    <>
                      <Button size="sm" colorScheme="cyan" variant="outline" onClick={selectOdd}>
                        Select Odd
                      </Button>

                      <Button size="sm" colorScheme="cyan" variant="outline" onClick={selectEven}>
                        Select Even
                      </Button>
                    </>
                  )}
                </Flex>
              </Stack>
            )}

            {files.length === 0 ? (
              <Card
                border="1px solid rgba(121,95,238,0.2)"
                bg={surfaceCard}
                backdropFilter="blur(10px)"
                textAlign="center"
                py={10}
              >
                <CardBody>
                  <Stack spacing={3} align="center">
                    <Iconify icon={FiFileText} boxSize={10} color="brand.300" />
                    <Iconify icon={FiFileText} boxSize={10} color="brand.300" />
                    <Heading size="sm">No files yet</Heading>
                    <Text color="text.muted" maxW="md">
                      Initiate a capture from the Phone interface or trigger a print job to start
                      populating this space.
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={6}>
                {files.map((file: FileInfo, index: number) => {
                  const isSelected = selectedFiles.includes(file.filename);
                  return (
                    <MotionCard
                      key={file.filename}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{
                        y: -8,
                        scale: 1.02,
                        transition: { duration: 0.2 },
                      }}
                      borderRadius="2xl"
                      border={`2px solid ${isSelected ? 'rgba(72, 187, 120, 0.6)' : 'rgba(121,95,238,0.18)'}`}
                      boxShadow={isSelected ? '0 0 20px rgba(72, 187, 120, 0.4)' : 'subtle'}
                      bg={surfaceCard}
                      position="relative"
                      overflow="hidden"
                      cursor={selectionMode ? 'pointer' : 'default'}
                      onClick={(e: React.MouseEvent) => {
                        if (selectionMode && !file.processing) {
                          handleFileClick(index, file.filename);
                        }
                      }}
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            e.stopPropagation();
                            handleFileClick(index, file.filename);
                          }}
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
                          _hover={{
                            borderColor: 'brand.300',
                            transform: file.processing ? undefined : 'translateY(-4px)',
                            transition: 'all 0.3s ease',
                          }}
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
                                <IconButton
                                  aria-label="View"
                                  icon={<Iconify icon={FiZoomIn} boxSize={5} />}
                                  onClick={() => openImageModal(file.filename)}
                                />
                              </Tooltip>
                            )}
                            {file.has_text && !file.processing && (
                              <Tooltip label="View OCR" hasArrow>
                                <IconButton
                                  aria-label="OCR"
                                  icon={<Iconify icon={FiFileText} boxSize={5} />}
                                  onClick={() => viewOCR(file.filename)}
                                />
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
                    </MotionCard>
                  );
                })}
              </SimpleGrid>
            )}
          </Box>

          {selectedFile && ocrText && (
            <Card border="1px solid rgba(69,202,255,0.25)" bg={surfaceCard} boxShadow="subtle">
              <CardHeader display="flex" alignItems="center" justifyContent="space-between">
                <Heading size="sm">OCR · {selectedFile}</Heading>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setOcrText('');
                  }}
                >
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
        size={{ base: 'full', sm: 'xl', md: '2xl', lg: '3xl', xl: '4xl' }}
        scrollBehavior="inside"
        isCentered
      >
        <ModalOverlay backdropFilter="blur(12px)" />
        <ModalContent
          bg={surfaceCard}
          borderRadius="2xl"
          border="1px solid rgba(121,95,238,0.25)"
          boxShadow="halo"
          maxH={{ base: '95vh', md: '90vh' }}
          m={{ base: 2, md: 4 }}
          overflow="hidden"
        >
          <ModalHeader>{selectedImageFile}</ModalHeader>
          <ModalCloseButton borderRadius="full" />
          <ModalBody
            p={{ base: 2, md: 4 }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            overflow="hidden"
          >
            {selectedImageFile && (
              <Box
                as="img"
                src={`${API_BASE_URL}${API_ENDPOINTS.processed}/${selectedImageFile}`}
                alt={selectedImageFile}
                maxW="100%"
                maxH={{ base: 'calc(95vh - 120px)', md: 'calc(90vh - 120px)' }}
                w="auto"
                h="auto"
                objectFit="contain"
                borderRadius="lg"
                onError={(e: any) => {
                  console.error(`Failed to load image: ${selectedImageFile}`);
                  e.target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="16"%3E Image not found or deleted%3C/text%3E%3C/svg%3E';
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
                <Box
                  mt={2}
                  maxH="160px"
                  overflowY="auto"
                  bg="surface.blur"
                  borderRadius="lg"
                  p={3}
                  border="1px solid rgba(121,95,238,0.2)"
                >
                  <Stack spacing={2} fontSize="sm">
                    {selectedFiles.map((filename: string) => (
                      <Text key={filename}>{filename}</Text>
                    ))}
                  </Stack>
                </Box>
              </Box>

              <Box>
                <Text fontWeight="600" mb={2}>
                  Convert to
                </Text>
                <Select
                  value={targetFormat}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTargetFormat(e.target.value)
                  }
                  isDisabled={converting}
                >
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="docx">Word Document (DOCX)</option>
                </Select>
              </Box>

              {targetFormat === 'pdf' && selectedFiles.length > 1 && (
                <Flex
                  align="center"
                  justify="space-between"
                  bg="surface.blur"
                  borderRadius="lg"
                  p={3}
                  border="1px solid rgba(69,202,255,0.25)"
                >
                  <Stack spacing={1}>
                    <Text fontWeight="600">Merge into single PDF</Text>
                    <Text fontSize="sm" color="text.muted">
                      {mergePdf
                        ? 'All files will merge into one premium PDF output.'
                        : 'Each file becomes an individual PDF.'}
                    </Text>
                  </Stack>
                  <Checkbox
                    isChecked={mergePdf}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setMergePdf(e.target.checked)
                    }
                    isDisabled={converting}
                    colorScheme="brand"
                  />
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustomFilename(e.target.value)
                    }
                    isDisabled={converting}
                    maxLength={50}
                  />
                  <Text fontSize="xs" color="text.muted" mt={1}>
                    If empty, will use auto-generated name like
                    "merged_document_20251021_123456.pdf"
                  </Text>
                </Box>
              )}

              {conversionProgress && (
                <Box
                  bg="rgba(69,202,255,0.1)"
                  borderRadius="lg"
                  p={3}
                  border="1px solid rgba(69,202,255,0.2)"
                >
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
            <Button
              colorScheme="brand"
              onClick={handleConvert}
              isLoading={converting}
              loadingText="Converting"
            >
              Convert
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Drawer
        isOpen={convertedDrawer.isOpen}
        placement="right"
        onClose={convertedDrawer.onClose}
        size="md"
      >
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
                {convertedFiles.map((file: any) => (
                  <Card
                    key={file.filename}
                    borderRadius="xl"
                    border="1px solid rgba(69,202,255,0.18)"
                  >
                    <CardBody>
                      <Stack spacing={3}>
                        <Stack spacing={1}>
                          <Heading size="sm">{file.filename}</Heading>
                          <Text fontSize="xs" color="text.muted">
                            {(file.size / 1024).toFixed(2)} KB ·{' '}
                            {new Date(file.created).toLocaleString()}
                          </Text>
                        </Stack>
                        <Flex gap={2} wrap="wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            flex={1}
                            minW="120px"
                            leftIcon={<Iconify icon={FiDownload} boxSize={4} />}
                            onClick={async () => {
                              try {
                                const response = await apiClient.get(
                                  `/converted/${file.filename}`,
                                  {
                                    responseType: 'blob',
                                  }
                                );
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
                          <Button
                            variant="ghost"
                            size="sm"
                            flex={1}
                            minW="120px"
                            colorScheme="red"
                            leftIcon={<Iconify icon={FiTrash2} boxSize={4} />}
                            onClick={async () => {
                              if (!window.confirm(`Delete ${file.filename}?`)) return;

                              try {
                                await apiClient.delete(`/delete-converted/${file.filename}`);
                                setConvertedFiles(
                                  convertedFiles.filter((f: any) => f.filename !== file.filename)
                                );
                                toast({
                                  title: 'File deleted',
                                  description: `${file.filename} has been deleted.`,
                                  status: 'success',
                                });
                              } catch (err: any) {
                                console.error('Delete failed:', err);
                                toast({
                                  title: 'Delete failed',
                                  description: err.message,
                                  status: 'error',
                                });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </Flex>
                      </Stack>
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
      <Modal
        isOpen={orchestrateModal.isOpen}
        onClose={orchestrateModal.onClose}
        size="6xl"
        isCentered
        scrollBehavior="inside"
      >
        <ModalOverlay backdropFilter="blur(16px)" bg="blackAlpha.700" />
        <MotionModalContent
          bg={surfaceCard}
          borderRadius={{ base: 'xl', md: '2xl', lg: '3xl' }}
          border="1px solid"
          borderColor="brand.300"
          boxShadow="0 25px 60px rgba(121, 95, 238, 0.4)"
          maxH={MODAL_CONFIG.modal.maxHeight}
          maxW={MODAL_CONFIG.modal.maxWidth}
          w="auto"
          h="auto"
          mx="auto"
          my="auto"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {/* STEP 1: Choose Mode */}
          {orchestrateStep === 1 && (
            <>
              <ModalHeader
                fontSize="3xl"
                fontWeight="700"
                py="1.5rem"
                bgGradient="linear(to-r, brand.500, nebula.500)"
                bgClip="text"
                display="flex"
                alignItems="center"
                gap={3}
              >
                <Iconify icon="solar:settings-bold-duotone" width={32} height={32} />
                Orchestrate Print & Capture
              </ModalHeader>
              <ModalCloseButton
                size="lg"
                top={6}
                right={6}
                _hover={{ bg: 'red.500', color: 'white' }}
              />
              <ModalBody py={8} px={10}>
                <Stack spacing={8}>
                  <Text fontSize="lg" color="text.muted" textAlign="center" fontWeight="500">
                    Choose your operation to get started
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                    <MotionBox
                      p={8}
                      borderRadius="2xl"
                      border="3px solid"
                      borderColor={orchestrateMode === 'scan' ? 'brand.400' : 'whiteAlpha.200'}
                      bg={orchestrateMode === 'scan' ? 'rgba(121,95,238,0.12)' : 'whiteAlpha.50'}
                      cursor="pointer"
                      onClick={() => setOrchestrateMode('scan')}
                      position="relative"
                      overflow="hidden"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      whileHover={{
                        borderColor: 'brand.400',
                        y: -8,
                        scale: 1.02,
                        boxShadow: '0 12px 30px rgba(121,95,238,0.35)',
                        transition: { duration: 0.2 },
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {orchestrateMode === 'scan' && (
                        <Box
                          position="absolute"
                          top={4}
                          right={4}
                          bg="brand.500"
                          color="white"
                          borderRadius="full"
                          p={1}
                        >
                          <Iconify icon="solar:check-circle-bold" width={24} height={24} />
                        </Box>
                      )}
                      <VStack align="start" spacing={4}>
                        <Box p={4} bg="brand.500" borderRadius="xl" color="white">
                          <Iconify icon="solar:document-add-bold-duotone" width={40} height={40} />
                        </Box>
                        <Heading size="lg">Scan Mode</Heading>
                        <Text fontSize="md" color="text.muted" lineHeight="1.6">
                          Capture physical documents from your scanner with advanced options for
                          quality, layout, and text detection
                        </Text>
                      </VStack>
                    </MotionBox>
                    <MotionBox
                      p={8}
                      borderRadius="2xl"
                      border="3px solid"
                      borderColor={orchestrateMode === 'print' ? 'brand.400' : 'whiteAlpha.200'}
                      bg={orchestrateMode === 'print' ? 'rgba(121,95,238,0.12)' : 'whiteAlpha.50'}
                      cursor="pointer"
                      onClick={() => setOrchestrateMode('print')}
                      position="relative"
                      overflow="hidden"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      whileHover={{
                        borderColor: 'brand.400',
                        y: -8,
                        scale: 1.02,
                        boxShadow: '0 12px 30px rgba(121,95,238,0.35)',
                        transition: { duration: 0.2 },
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {orchestrateMode === 'print' && (
                        <Box
                          position="absolute"
                          top={4}
                          right={4}
                          bg="brand.500"
                          color="white"
                          borderRadius="full"
                          p={1}
                        >
                          <Iconify icon="solar:check-circle-bold" width={24} height={24} />
                        </Box>
                      )}
                      <VStack align="start" spacing={4}>
                        <Box p={4} bg="nebula.500" borderRadius="xl" color="white">
                          <Iconify icon="solar:printer-bold-duotone" width={40} height={40} />
                        </Box>
                        <Heading size="lg">Print Mode</Heading>
                        <Text fontSize="md" color="text.muted" lineHeight="1.6">
                          Print documents from your collection with precise control over layout,
                          margins, scaling, and page selection
                        </Text>
                      </VStack>
                    </MotionBox>
                  </SimpleGrid>
                </Stack>
              </ModalBody>
              <ModalFooter
                py="1.5rem"
                px="2.5rem"
                borderTop="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Button variant="ghost" mr={3} onClick={orchestrateModal.onClose} size="lg">
                  Cancel
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={() => setOrchestrateStep(2)}
                  isDisabled={!orchestrateMode}
                  size="lg"
                  px={8}
                  rightIcon={<Iconify icon="solar:arrow-right-bold" width={20} height={20} />}
                >
                  Continue
                </Button>
              </ModalFooter>
            </>
          )}

          {/* STEP 2: Scan Options */}
          {orchestrateStep === 2 && orchestrateMode === 'scan' && (
            <>
              <ModalHeader
                fontSize="2xl"
                fontWeight="700"
                py="1.5rem"
                display="flex"
                alignItems="center"
                gap={3}
                borderBottom="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Box p={2} bg="brand.500" borderRadius="lg" color="white">
                  <Iconify icon="solar:document-add-bold-duotone" width={24} height={24} />
                </Box>
                Scan Configuration
                <Badge colorScheme="purple" fontSize="sm" px={3} py={1}>
                  Step 2 of 3
                </Badge>
              </ModalHeader>
              <ModalCloseButton
                size="lg"
                top={6}
                right={6}
                _hover={{ bg: 'red.500', color: 'white' }}
              />
              <ModalBody
                ref={modalBodyRef}
                py="1rem"
                px="1.5rem"
                maxH={`calc(${MODAL_CONFIG.modalBody.maxHeight})`}
                overflowY="auto"
                overflowX="hidden"
                css={{
                  '&::-webkit-scrollbar': { width: '8px' },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(121,95,238,0.4)',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(121,95,238,0.6)',
                  },
                }}
              >
                {/* Voice Control - Embedded in Modal */}
                <OrchestrationVoiceControl mode="scan" onCommand={handleVoiceCommand} />
                <Grid
                  templateColumns={{ base: '1fr', lg: '1fr 1fr' }}
                  gap="1.5rem"
                  alignItems="start"
                >
                  {/* Live Preview - Scan Mode (LEFT SIDE) */}
                  <Box
                    display={{ base: 'none', lg: 'flex' }}
                    flexDirection="column"
                    position="sticky"
                    top={0}
                    alignSelf="start"
                    maxH={`calc(${MODAL_CONFIG.previewBox.maxHeight})`}
                    order={{ base: 2, lg: 1 }}
                  >
                    <DocumentPreview
                      documents={
                        selectedDocuments.length > 0
                          ? selectedDocuments.map(doc => ({
                              filename: doc.filename,
                              thumbnailUrl:
                                doc.thumbnailUrl ||
                                `${API_BASE_URL}${API_ENDPOINTS.processed}/${doc.filename}`,
                            }))
                          : []
                      }
                      previewSettings={{
                        layout: orchestrateOptions.scanLayout,
                        paperSize: orchestrateOptions.scanPaperSize,
                        colorMode: orchestrateOptions.scanColorMode,
                      }}
                    />
                  </Box>

                  {/* Options Panel (RIGHT SIDE) */}
                  <Stack spacing={3} order={{ base: 1, lg: 2 }}>
                    {/* Select Document Button */}
                    <Button
                      size="lg"
                      colorScheme="brand"
                      variant="solid"
                      leftIcon={
                        <Iconify icon="solar:document-add-bold-duotone" width={20} height={20} />
                      }
                      onClick={documentSelectorModal.onOpen}
                      w="full"
                      py="1.5rem"
                      fontSize="md"
                      fontWeight="600"
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 20px rgba(121,95,238,0.3)',
                      }}
                      transition="all 0.3s"
                    >
                      {selectedDocuments.length > 0
                        ? `${selectedDocuments.length} Document${selectedDocuments.length > 1 ? 's' : ''} Selected`
                        : 'Select Document to Scan'}
                    </Button>

                    {/* Select Page Scan Mode */}
                    <Box
                      p="1.25rem"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      _dark={{ bg: 'whiteAlpha.50' }}
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'brand.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
                        <Iconify
                          icon="solar:document-bold-duotone"
                          width={24}
                          height={24}
                          color="var(--chakra-colors-brand-500)"
                        />
                        Page Scan Mode
                      </Heading>
                      <Select
                        value={orchestrateOptions.scanMode}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setOrchestrateOptions({
                            ...orchestrateOptions,
                            scanMode: e.target.value as any,
                          })
                        }
                        bg="whiteAlpha.50"
                        borderColor="brand.300"
                        size="lg"
                        _hover={{ borderColor: 'brand.400' }}
                        _focus={{
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 3px rgba(121,95,238,0.2)',
                        }}
                      >
                        <option value="single">📄 Single Page</option>
                        <option value="multi">📚 Multi-Page Document</option>
                      </Select>
                    </Box>

                    {/* Text Detection */}
                    <Box
                      p="1.25rem"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor={orchestrateOptions.scanTextMode ? 'brand.400' : 'whiteAlpha.200'}
                      bg={
                        orchestrateOptions.scanTextMode ? 'rgba(121,95,238,0.08)' : 'whiteAlpha.50'
                      }
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'brand.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <Flex justify="space-between" align="center">
                        <Box flex="1">
                          <Heading size="md" mb={2} display="flex" alignItems="center" gap={2}>
                            <Iconify
                              icon="solar:text-bold-duotone"
                              width={24}
                              height={24}
                              color="var(--chakra-colors-brand-500)"
                            />
                            Text Detection
                          </Heading>
                          <Text fontSize="sm" color="text.muted">
                            Extract text from scanned documents using OCR
                          </Text>
                        </Box>
                        <Checkbox
                          size="lg"
                          colorScheme="brand"
                          isChecked={orchestrateOptions.scanTextMode}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              scanTextMode: e.target.checked,
                            })
                          }
                        >
                          <Text fontWeight="600">Enable OCR</Text>
                        </Checkbox>
                      </Flex>
                    </Box>

                    {/* Page Selection */}
                    <Box
                      p="1rem"
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400', boxShadow: 'md' }}
                    >
                      <Heading size="sm" mb={3} display="flex" alignItems="center" gap={2}>
                        <Iconify
                          icon="solar:documents-bold-duotone"
                          width={20}
                          height={20}
                          color="var(--chakra-colors-brand-500)"
                        />
                        Page Selection
                      </Heading>
                      <RadioGroup
                        value={orchestrateOptions.scanPageMode}
                        onChange={(value: string) =>
                          setOrchestrateOptions({
                            ...orchestrateOptions,
                            scanPageMode: value as any,
                          })
                        }
                      >
                        <Stack spacing={4}>
                          <Radio value="all" colorScheme="brand" size="lg">
                            <Text fontWeight="500">All Pages</Text>
                          </Radio>
                          <Radio value="odd" colorScheme="brand" size="lg">
                            <Text fontWeight="500">Odd Pages Only</Text>
                            <Text fontSize="xs" color="text.muted">
                              (1, 3, 5...)
                            </Text>
                          </Radio>
                          <Radio value="even" colorScheme="brand" size="lg">
                            <Text fontWeight="500">Even Pages Only</Text>
                            <Text fontSize="xs" color="text.muted">
                              (2, 4, 6...)
                            </Text>
                          </Radio>
                          <Radio value="custom" colorScheme="brand" size="lg">
                            <Flex direction="column" gap={2} w="full">
                              <Text fontWeight="500">Custom Page Range</Text>
                              {orchestrateOptions.scanPageMode === 'custom' && (
                                <Input
                                  size="md"
                                  placeholder="e.g., 1-5,7,9-12"
                                  value={orchestrateOptions.scanCustomRange}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setOrchestrateOptions({
                                      ...orchestrateOptions,
                                      scanCustomRange: e.target.value,
                                    })
                                  }
                                  bg="whiteAlpha.100"
                                  borderColor="brand.300"
                                  _hover={{ borderColor: 'brand.400' }}
                                  _focus={{
                                    borderColor: 'brand.500',
                                    boxShadow: '0 0 0 3px rgba(121,95,238,0.2)',
                                  }}
                                />
                              )}
                            </Flex>
                          </Radio>
                        </Stack>
                      </RadioGroup>
                    </Box>

                    {/* Layout */}
                    <Box
                      p="1.25rem"
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'brand.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
                        <Iconify
                          icon="solar:tablet-bold-duotone"
                          width={24}
                          height={24}
                          color="var(--chakra-colors-brand-500)"
                        />
                        Scan Layout
                      </Heading>
                      <ButtonGroup isAttached width="full" size="lg">
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.scanLayout === 'portrait' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.scanLayout === 'portrait' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({ ...orchestrateOptions, scanLayout: 'portrait' })
                          }
                          leftIcon={<Iconify icon="solar:document-bold" width={20} height={20} />}
                          _hover={{ transform: 'scale(1.02)' }}
                          transition="all 0.2s"
                        >
                          Portrait
                        </Button>
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.scanLayout === 'landscape' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.scanLayout === 'landscape' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              scanLayout: 'landscape',
                            })
                          }
                          leftIcon={<Iconify icon="solar:tablet-bold" width={20} height={20} />}
                          _hover={{ transform: 'scale(1.02)' }}
                          transition="all 0.2s"
                        >
                          Landscape
                        </Button>
                      </ButtonGroup>
                    </Box>

                    {/* Paper Size */}
                    <Box
                      p={5}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'brand.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <FancySelect
                        label="📏 Paper Size"
                        options={[
                          { value: 'A4', label: 'A4 (210×297 mm)' },
                          { value: 'Letter', label: 'Letter (8.5×11 in)' },
                          { value: 'Legal', label: 'Legal (8.5×14 in)' },
                        ]}
                        value={orchestrateOptions.scanPaperSize}
                        onChange={(value: string) =>
                          setOrchestrateOptions({ ...orchestrateOptions, scanPaperSize: value })
                        }
                      />
                    </Box>

                    {/* Resolution */}
                    <Box
                      p={5}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'brand.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
                        <Iconify
                          icon="solar:magnifer-zoom-in-bold-duotone"
                          width={24}
                          height={24}
                          color="var(--chakra-colors-brand-500)"
                        />
                        Scan Resolution (DPI)
                      </Heading>
                      <FancySelect
                        label=""
                        options={[
                          { value: '150', label: '150 DPI - Draft Quality' },
                          { value: '300', label: '300 DPI - Standard (Recommended)' },
                          { value: '600', label: '600 DPI - High Quality' },
                          { value: '1200', label: '1200 DPI - Professional' },
                        ]}
                        value={orchestrateOptions.scanResolution}
                        onChange={(value: string) =>
                          setOrchestrateOptions({ ...orchestrateOptions, scanResolution: value })
                        }
                      />
                    </Box>

                    {/* Color Mode */}
                    <Box
                      p={5}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'brand.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
                        <Iconify
                          icon="solar:palette-2-bold-duotone"
                          width={24}
                          height={24}
                          color="var(--chakra-colors-brand-500)"
                        />
                        Color Mode
                      </Heading>
                      <ButtonGroup isAttached width="full" size="lg">
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.scanColorMode === 'color' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.scanColorMode === 'color' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({ ...orchestrateOptions, scanColorMode: 'color' })
                          }
                          leftIcon={<Iconify icon="solar:pallete-bold" width={18} height={18} />}
                          _hover={{ transform: 'scale(1.02)' }}
                          transition="all 0.2s"
                        >
                          Color
                        </Button>
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.scanColorMode === 'grayscale' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.scanColorMode === 'grayscale' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              scanColorMode: 'grayscale',
                            })
                          }
                          leftIcon={<Iconify icon="solar:sun-fog-bold" width={18} height={18} />}
                          _hover={{ transform: 'scale(1.02)' }}
                          transition="all 0.2s"
                        >
                          Grayscale
                        </Button>
                        <Button
                          flex={1}
                          variant={orchestrateOptions.scanColorMode === 'bw' ? 'solid' : 'outline'}
                          colorScheme={orchestrateOptions.scanColorMode === 'bw' ? 'brand' : 'gray'}
                          onClick={() =>
                            setOrchestrateOptions({ ...orchestrateOptions, scanColorMode: 'bw' })
                          }
                          leftIcon={<Iconify icon="solar:contrast-bold" width={18} height={18} />}
                          _hover={{ transform: 'scale(1.02)' }}
                          transition="all 0.2s"
                        >
                          B&W
                        </Button>
                      </ButtonGroup>
                    </Box>

                    {/* Save as Default */}
                    <Box
                      p={6}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="brand.400"
                      bg="rgba(121,95,238,0.12)"
                      transition="all 0.3s"
                      _hover={{
                        transform: 'scale(1.02)',
                        borderColor: 'brand.500',
                        boxShadow: '0 8px 20px rgba(121,95,238,0.3)',
                      }}
                    >
                      <Checkbox
                        size="lg"
                        colorScheme="brand"
                        isChecked={orchestrateOptions.saveAsDefault}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setOrchestrateOptions({
                            ...orchestrateOptions,
                            saveAsDefault: e.target.checked,
                          });
                          if (e.target.checked) {
                            saveDefaultSettings();
                          }
                        }}
                      >
                        <HStack spacing={2}>
                          <Iconify icon="solar:save-bold-duotone" width={20} height={20} />
                          <Text fontWeight="600" fontSize="md">
                            Save as Default Settings
                          </Text>
                        </HStack>
                      </Checkbox>
                      <Text fontSize="sm" color="text.muted" mt={2} ml={8}>
                        Your preferences will be remembered for future scans
                      </Text>
                    </Box>
                  </Stack>
                </Grid>
              </ModalBody>
              <ModalFooter
                py="1.5rem"
                px="2.5rem"
                borderTop="1px solid"
                borderColor="whiteAlpha.200"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <HStack spacing={4}>
                  {selectedDocuments.length > 0 && (
                    <>
                      <HStack spacing={2} fontSize="sm">
                        <Iconify icon="solar:document-bold" width={16} height={16} />
                        <Text fontWeight="500">
                          {selectedDocuments.length}{' '}
                          {selectedDocuments.length === 1 ? 'sheet' : 'sheets'}
                        </Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {orchestrateOptions.scanPaperSize}
                        </Badge>
                        <Badge colorScheme="purple" fontSize="xs" textTransform="uppercase">
                          {orchestrateOptions.scanLayout}
                        </Badge>
                        {orchestrateOptions.scanColorMode !== 'color' && (
                          <Badge colorScheme="gray" fontSize="xs" textTransform="uppercase">
                            {orchestrateOptions.scanColorMode}
                          </Badge>
                        )}
                      </HStack>
                    </>
                  )}
                </HStack>
                <HStack>
                  <Button
                    variant="ghost"
                    onClick={() => setOrchestrateStep(1)}
                    size="lg"
                    leftIcon={<Iconify icon="solar:arrow-left-bold" width={20} height={20} />}
                  >
                    Back
                  </Button>
                  <Button
                    colorScheme="brand"
                    onClick={() => setOrchestrateStep(3)}
                    size="lg"
                    px={8}
                    rightIcon={<Iconify icon="solar:arrow-right-bold" width={20} height={20} />}
                  >
                    Review Settings
                  </Button>
                </HStack>
              </ModalFooter>
            </>
          )}

          {/* STEP 2: Print Options */}
          {orchestrateStep === 2 && orchestrateMode === 'print' && (
            <>
              <ModalHeader
                fontSize="2xl"
                fontWeight="700"
                py="1.5rem"
                display="flex"
                alignItems="center"
                gap={3}
                borderBottom="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Box p={2} bg="nebula.500" borderRadius="lg" color="white">
                  <Iconify icon="solar:printer-bold-duotone" width={24} height={24} />
                </Box>
                Print Configuration
                <Badge colorScheme="blue" fontSize="sm" px={3} py={1}>
                  Step 2 of 3
                </Badge>
              </ModalHeader>
              <ModalCloseButton
                size="lg"
                top={6}
                right={6}
                _hover={{ bg: 'red.500', color: 'white' }}
              />
              <ModalBody
                ref={modalBodyRef}
                py={4}
                px={6}
                maxH="calc(85vh - 140px)"
                overflowY="auto"
                overflowX="hidden"
                css={{
                  '&::-webkit-scrollbar': { width: '8px' },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': {
                    background: 'rgba(69,202,255,0.4)',
                    borderRadius: '10px',
                  },
                  '&::-webkit-scrollbar-thumb:hover': {
                    background: 'rgba(69,202,255,0.6)',
                  },
                }}
              >
                {/* Voice Control - Embedded in Modal */}
                <OrchestrationVoiceControl mode="print" onCommand={handleVoiceCommand} />
                
                <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} alignItems="start">
                  {/* Live Preview - Print Mode (LEFT SIDE) */}
                  <Box
                    display={{ base: 'none', lg: 'flex' }}
                    flexDirection="column"
                    position="sticky"
                    top={0}
                    alignSelf="start"
                    maxH={`calc(${MODAL_CONFIG.previewBox.maxHeight})`}
                    order={{ base: 2, lg: 1 }}
                  >
                    <DocumentPreview
                      documents={
                        selectedDocuments.length > 0
                          ? selectedDocuments.map(doc => ({
                              filename: doc.filename,
                              thumbnailUrl:
                                doc.thumbnailUrl ||
                                `${API_BASE_URL}${API_ENDPOINTS.processed}/${doc.filename}`,
                            }))
                          : []
                      }
                      previewSettings={{
                        layout: orchestrateOptions.printLayout,
                        scale: parseInt(orchestrateOptions.printScale),
                        paperSize: orchestrateOptions.printPaperSize,
                        colorMode: orchestrateOptions.printColorMode,
                      }}
                    />
                  </Box>

                  {/* Options Panel (RIGHT SIDE) */}
                  <Stack spacing={3} order={{ base: 1, lg: 2 }}>
                    {/* Select Document Button */}
                    <Button
                      size="lg"
                      colorScheme="nebula"
                      variant="solid"
                      leftIcon={
                        <Iconify icon="solar:printer-bold-duotone" width={20} height={20} />
                      }
                      onClick={documentSelectorModal.onOpen}
                      w="full"
                      py="1.5rem"
                      fontSize="md"
                      fontWeight="600"
                      _hover={{
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 20px rgba(69,202,255,0.3)',
                      }}
                      transition="all 0.3s"
                    >
                      {selectedDocuments.length > 0
                        ? `${selectedDocuments.length} Document${selectedDocuments.length > 1 ? 's' : ''} Selected for Print`
                        : 'Select Documents to Print'}
                    </Button>

                    {/* Pages to Print */}
                    <Box
                      p={5}
                      borderRadius="xl"
                      border="2px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.3s"
                      _hover={{
                        borderColor: 'nebula.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      <Heading size="md" mb={4} display="flex" alignItems="center" gap={2}>
                        <Iconify
                          icon="solar:documents-bold-duotone"
                          width={24}
                          height={24}
                          color="var(--chakra-colors-nebula-500)"
                        />
                        Pages to Print
                      </Heading>
                      <RadioGroup
                        value={orchestrateOptions.printPages}
                        onChange={(value: string) =>
                          setOrchestrateOptions({ ...orchestrateOptions, printPages: value as any })
                        }
                      >
                        <Stack spacing={3}>
                          <Radio value="all" colorScheme="brand">
                            All Pages
                          </Radio>
                          <Radio value="odd" colorScheme="brand">
                            Odd Pages Only (1, 3, 5...)
                          </Radio>
                          <Radio value="even" colorScheme="brand">
                            Even Pages Only (2, 4, 6...)
                          </Radio>
                          <Radio value="custom" colorScheme="brand">
                            <Flex
                              direction="column"
                              gap={2}
                              mt={orchestrateOptions.printPages === 'custom' ? 2 : 0}
                            >
                              <Text>Custom Pages</Text>
                              {orchestrateOptions.printPages === 'custom' && (
                                <Input
                                  size="sm"
                                  placeholder="e.g., 1-5,7,9"
                                  value={orchestrateOptions.printCustomRange}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setOrchestrateOptions({
                                      ...orchestrateOptions,
                                      printCustomRange: e.target.value,
                                    })
                                  }
                                  bg="whiteAlpha.100"
                                  borderColor="brand.300"
                                  _hover={{ borderColor: 'brand.400' }}
                                />
                              )}
                            </Flex>
                          </Radio>
                        </Stack>
                      </RadioGroup>
                    </Box>

                    {/* Layout */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400' }}
                    >
                      <Heading size="sm" mb={3}>
                        📐 Layout
                      </Heading>
                      <ButtonGroup isAttached width="full">
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.printLayout === 'portrait' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.printLayout === 'portrait' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              printLayout: 'portrait',
                            })
                          }
                        >
                          📄 Portrait
                        </Button>
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.printLayout === 'landscape' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.printLayout === 'landscape' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              printLayout: 'landscape',
                            })
                          }
                        >
                          📐 Landscape
                        </Button>
                      </ButtonGroup>
                    </Box>

                    {/* Paper Size */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400' }}
                    >
                      <FancySelect
                        label="📏 Paper Size"
                        options={[
                          { value: 'A4', label: 'A4 (210×297 mm)' },
                          { value: 'Letter', label: 'Letter (8.5×11 in)' },
                          { value: 'Legal', label: 'Legal (8.5×14 in)' },
                        ]}
                        value={orchestrateOptions.printPaperSize}
                        onChange={(value: string) =>
                          setOrchestrateOptions({ ...orchestrateOptions, printPaperSize: value })
                        }
                      />
                    </Box>

                    {/* Print Resolution (DPI) */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400' }}
                    >
                      <FancySelect
                        label="🔍 Scan Resolution (DPI)"
                        options={[
                          { value: '150', label: '150 DPI - Draft Quality' },
                          { value: '300', label: '300 DPI - Standard (Recommended)' },
                          { value: '600', label: '600 DPI - High Quality' },
                          { value: '1200', label: '1200 DPI - Professional' },
                        ]}
                        value={orchestrateOptions.printResolution}
                        onChange={(value: string) =>
                          setOrchestrateOptions({ ...orchestrateOptions, printResolution: value })
                        }
                      />
                    </Box>

                    {/* Color Mode */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400' }}
                    >
                      <Heading size="sm" mb={3}>
                        Color Mode
                      </Heading>
                      <ButtonGroup isAttached width="full" size="md">
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.printColorMode === 'color' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.printColorMode === 'color' ? 'nebula' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              printColorMode: 'color',
                            })
                          }
                          leftIcon={<Iconify icon="solar:pallete-bold" width={18} height={18} />}
                        >
                          Color
                        </Button>
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.printColorMode === 'grayscale' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.printColorMode === 'grayscale' ? 'nebula' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              printColorMode: 'grayscale',
                            })
                          }
                          leftIcon={<Iconify icon="solar:sun-fog-bold" width={18} height={18} />}
                        >
                          Grayscale
                        </Button>
                        <Button
                          flex={1}
                          variant={orchestrateOptions.printColorMode === 'bw' ? 'solid' : 'outline'}
                          colorScheme={
                            orchestrateOptions.printColorMode === 'bw' ? 'nebula' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({ ...orchestrateOptions, printColorMode: 'bw' })
                          }
                          leftIcon={<Iconify icon="solar:contrast-bold" width={18} height={18} />}
                        >
                          B&W
                        </Button>
                      </ButtonGroup>
                    </Box>

                    {/* Print Scale */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400' }}
                    >
                      <Heading size="sm" mb={3}>
                        🔍 Print Scale (%)
                      </Heading>
                      <Flex align="center" gap={3}>
                        <Input
                          type="number"
                          min="25"
                          max="400"
                          value={orchestrateOptions.printScale}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              printScale: e.target.value,
                            })
                          }
                          bg="whiteAlpha.100"
                          borderColor="brand.300"
                          _hover={{ borderColor: 'brand.400' }}
                        />
                        <Text minW="40px">%</Text>
                      </Flex>
                      <Text fontSize="xs" color="text.muted" mt={2}>
                        Default: 100% (Actual Size)
                      </Text>
                    </Box>

                    {/* Margins */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="whiteAlpha.200"
                      bg="whiteAlpha.50"
                      transition="all 0.2s"
                      _hover={{ borderColor: 'brand.400' }}
                    >
                      <Heading size="sm" mb={3}>
                        📏 Margins
                      </Heading>
                      <ButtonGroup isAttached width="full" size="sm">
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.printMargins === 'default' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.printMargins === 'default' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({
                              ...orchestrateOptions,
                              printMargins: 'default',
                            })
                          }
                        >
                          Default (1")
                        </Button>
                        <Button
                          flex={1}
                          variant={
                            orchestrateOptions.printMargins === 'narrow' ? 'solid' : 'outline'
                          }
                          colorScheme={
                            orchestrateOptions.printMargins === 'narrow' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({ ...orchestrateOptions, printMargins: 'narrow' })
                          }
                        >
                          Narrow
                        </Button>
                        <Button
                          flex={1}
                          variant={orchestrateOptions.printMargins === 'none' ? 'solid' : 'outline'}
                          colorScheme={
                            orchestrateOptions.printMargins === 'none' ? 'brand' : 'gray'
                          }
                          onClick={() =>
                            setOrchestrateOptions({ ...orchestrateOptions, printMargins: 'none' })
                          }
                        >
                          None
                        </Button>
                      </ButtonGroup>
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
                        onChange={(value: string) =>
                          setOrchestrateOptions({
                            ...orchestrateOptions,
                            printPagesPerSheet: value,
                          })
                        }
                        allowCustom={true}
                        customValue={orchestrateOptions.printPagesPerSheetCustom}
                        onCustomChange={(value: string) =>
                          setOrchestrateOptions({
                            ...orchestrateOptions,
                            printPagesPerSheetCustom: value,
                          })
                        }
                      />
                    </Box>

                    {/* Select Converted PDFs */}
                    <Box>
                      <Heading size="sm" mb={3}>
                        Select Converted PDFs
                      </Heading>
                      {convertedFiles.length === 0 ? (
                        <Text fontSize="sm" color="text.muted">
                          No converted PDFs available
                        </Text>
                      ) : (
                        <VStack spacing={2}>
                          {convertedFiles.map((file: any) => (
                            <Box
                              key={file.filename}
                              p={2}
                              borderRadius="md"
                              border="1px"
                              borderColor="whiteAlpha.200"
                              width="full"
                              cursor="pointer"
                              onClick={() => {
                                const isSelected = orchestrateOptions.printConvertedFiles.includes(
                                  file.filename
                                );
                                setOrchestrateOptions({
                                  ...orchestrateOptions,
                                  printConvertedFiles: isSelected
                                    ? orchestrateOptions.printConvertedFiles.filter(
                                        (f: string) => f !== file.filename
                                      )
                                    : [...orchestrateOptions.printConvertedFiles, file.filename],
                                });
                              }}
                              bg={
                                orchestrateOptions.printConvertedFiles.includes(file.filename)
                                  ? 'rgba(121,95,238,0.1)'
                                  : 'transparent'
                              }
                            >
                              <Checkbox
                                isChecked={orchestrateOptions.printConvertedFiles.includes(
                                  file.filename
                                )}
                              >
                                {file.filename} ({(file.size / 1024).toFixed(2)} KB)
                              </Checkbox>
                            </Box>
                          ))}
                        </VStack>
                      )}
                    </Box>

                    {/* Save as Default */}
                    <Box
                      p={4}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="brand.400"
                      bg="rgba(121,95,238,0.1)"
                      transition="all 0.3s"
                      _hover={{ transform: 'scale(1.02)', borderColor: 'brand.500' }}
                    >
                      <Checkbox
                        size="lg"
                        colorScheme="brand"
                        isChecked={orchestrateOptions.saveAsDefault}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setOrchestrateOptions({
                            ...orchestrateOptions,
                            saveAsDefault: e.target.checked,
                          })
                        }
                      >
                        <Text fontWeight="600">💾 Save as Default Settings</Text>
                      </Checkbox>
                    </Box>
                  </Stack>
                </Grid>
              </ModalBody>
              <ModalFooter
                py="1.5rem"
                px="2.5rem"
                borderTop="1px solid"
                borderColor="whiteAlpha.200"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <HStack spacing={4}>
                  {selectedDocuments.length > 0 && (
                    <>
                      <HStack spacing={2} fontSize="sm">
                        <Iconify icon="solar:document-bold" width={16} height={16} />
                        <Text fontWeight="500">
                          {selectedDocuments.length}{' '}
                          {selectedDocuments.length === 1 ? 'sheet' : 'sheets'}
                        </Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {orchestrateOptions.printPaperSize}
                        </Badge>
                        <Badge colorScheme="purple" fontSize="xs" textTransform="uppercase">
                          {orchestrateOptions.printLayout}
                        </Badge>
                      </HStack>
                    </>
                  )}
                </HStack>
                <HStack>
                  <Button
                    variant="ghost"
                    onClick={() => setOrchestrateStep(1)}
                    size="lg"
                    leftIcon={<Iconify icon="solar:arrow-left-bold" width={20} height={20} />}
                  >
                    Back
                  </Button>
                  <Button
                    colorScheme="nebula"
                    onClick={() => setOrchestrateStep(3)}
                    size="lg"
                    px={8}
                    rightIcon={<Iconify icon="solar:arrow-right-bold" width={20} height={20} />}
                  >
                    Review Settings
                  </Button>
                </HStack>
              </ModalFooter>
            </>
          )}

          {/* STEP 3: Confirmation */}
          {orchestrateStep === 3 && (
            <>
              <ModalHeader
                fontSize="2xl"
                fontWeight="700"
                py="1.5rem"
                display="flex"
                alignItems="center"
                gap={3}
                borderBottom="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Box p={2} bg="green.500" borderRadius="lg" color="white">
                  <Iconify icon="solar:check-circle-bold-duotone" width={24} height={24} />
                </Box>
                Review & Confirm
                <Badge ml="auto" colorScheme="green" fontSize="sm" px={3} py={1}>
                  Step 3 of 3
                </Badge>
              </ModalHeader>
              <ModalCloseButton
                size="lg"
                top={6}
                right={6}
                _hover={{ bg: 'red.500', color: 'white' }}
              />
              <ModalBody py={8} px={10}>
                <Stack spacing={6}>
                  <Box
                    bg="linear-gradient(135deg, rgba(121,95,238,0.15), rgba(69,202,255,0.15))"
                    p={8}
                    borderRadius="2xl"
                    border="2px solid"
                    borderColor={orchestrateMode === 'scan' ? 'brand.300' : 'nebula.300'}
                    boxShadow="0 8px 25px rgba(121,95,238,0.2)"
                  >
                    <Heading size="lg" mb={6} display="flex" alignItems="center" gap={3}>
                      <Iconify
                        icon={
                          orchestrateMode === 'scan'
                            ? 'solar:document-add-bold-duotone'
                            : 'solar:printer-bold-duotone'
                        }
                        width={32}
                        height={32}
                        color={
                          orchestrateMode === 'scan'
                            ? 'var(--chakra-colors-brand-500)'
                            : 'var(--chakra-colors-nebula-500)'
                        }
                      />
                      {orchestrateMode === 'scan' ? 'Scan' : 'Print'} Configuration Summary
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      {orchestrateMode === 'scan' ? (
                        <>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Operation Mode:</Text>
                            <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
                              Scan
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Page Mode:</Text>
                            <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.scanPageMode}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Layout:</Text>
                            <Badge colorScheme="cyan" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.scanLayout}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Paper Size:</Text>
                            <Badge colorScheme="teal" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.scanPaperSize}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Resolution:</Text>
                            <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.scanResolution} DPI
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Color Mode:</Text>
                            <Badge colorScheme="pink" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.scanColorMode}
                            </Badge>
                          </HStack>
                          {orchestrateOptions.scanTextMode && (
                            <HStack
                              justify="space-between"
                              p={4}
                              bg="green.100"
                              borderRadius="lg"
                              gridColumn={{ base: 'span 1', md: 'span 2' }}
                            >
                              <HStack>
                                <Iconify
                                  icon="solar:check-circle-bold"
                                  width={20}
                                  height={20}
                                  color="green.600"
                                />
                                <Text fontWeight="600" color="green.700">
                                  OCR Text Detection:
                                </Text>
                              </HStack>
                              <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                                Enabled
                              </Badge>
                            </HStack>
                          )}
                        </>
                      ) : (
                        <>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Operation Mode:</Text>
                            <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                              Print
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Pages:</Text>
                            <Badge colorScheme="purple" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.printPages}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Layout:</Text>
                            <Badge colorScheme="cyan" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.printLayout}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Paper Size:</Text>
                            <Badge colorScheme="teal" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.printPaperSize}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Scale:</Text>
                            <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.printScale}%
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Pages per Sheet:</Text>
                            <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.printPagesPerSheet}
                            </Badge>
                          </HStack>
                          <HStack
                            justify="space-between"
                            p={4}
                            bg="whiteAlpha.200"
                            borderRadius="lg"
                          >
                            <Text fontWeight="600">Margins:</Text>
                            <Badge colorScheme="pink" fontSize="md" px={3} py={1}>
                              {orchestrateOptions.printMargins}
                            </Badge>
                          </HStack>
                          {orchestrateOptions.printConvertedFiles.length > 0 && (
                            <HStack justify="space-between" p={4} bg="blue.100" borderRadius="lg">
                              <HStack>
                                <Iconify
                                  icon="solar:document-text-bold"
                                  width={20}
                                  height={20}
                                  color="blue.600"
                                />
                                <Text fontWeight="600" color="blue.700">
                                  Selected PDFs:
                                </Text>
                              </HStack>
                              <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                                {orchestrateOptions.printConvertedFiles.length} file(s)
                              </Badge>
                            </HStack>
                          )}
                        </>
                      )}
                      {orchestrateOptions.saveAsDefault && (
                        <HStack
                          justify="space-between"
                          p={4}
                          bg="green.100"
                          borderRadius="lg"
                          gridColumn={{ base: 'span 1', md: 'span 2' }}
                        >
                          <HStack>
                            <Iconify
                              icon="solar:save-bold-duotone"
                              width={20}
                              height={20}
                              color="green.600"
                            />
                            <Text fontWeight="600" color="green.700">
                              Save as Default:
                            </Text>
                          </HStack>
                          <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                            Yes
                          </Badge>
                        </HStack>
                      )}
                    </SimpleGrid>
                  </Box>
                  <Box
                    p={5}
                    bg="yellow.50"
                    borderRadius="xl"
                    border="2px solid"
                    borderColor="yellow.300"
                    _dark={{ bg: 'rgba(255,193,7,0.15)', borderColor: 'yellow.600' }}
                  >
                    <HStack spacing={3} mb={2}>
                      <Iconify
                        icon="solar:info-circle-bold"
                        width={24}
                        height={24}
                        color="orange.500"
                      />
                      <Text
                        fontWeight="700"
                        fontSize="lg"
                        color="orange.700"
                        _dark={{ color: 'orange.300' }}
                      >
                        Ready to Proceed
                      </Text>
                    </HStack>
                    <Text color="text.muted" fontSize="sm">
                      Review your settings above. Click "Start{' '}
                      {orchestrateMode === 'scan' ? 'Scanning' : 'Printing'}" to begin the operation
                      with these configurations.
                    </Text>
                  </Box>
                </Stack>
              </ModalBody>
              <ModalFooter
                py="1.5rem"
                px="2.5rem"
                borderTop="1px solid"
                borderColor="whiteAlpha.200"
              >
                <Button
                  variant="ghost"
                  mr={3}
                  onClick={() => setOrchestrateStep(2)}
                  size="lg"
                  leftIcon={<Iconify icon="solar:arrow-left-bold" width={20} height={20} />}
                >
                  Back
                </Button>
                <Button
                  colorScheme={orchestrateMode === 'scan' ? 'brand' : 'blue'}
                  onClick={() => {
                    toast({
                      title: '✅ Operation Started',
                      description: `${orchestrateMode === 'scan' ? 'Scanning' : 'Printing'} with your selected options...`,
                      status: 'success',
                      duration: 4000,
                      isClosable: true,
                    });
                    orchestrateModal.onClose();
                    setOrchestrateStep(1);
                    setOrchestrateMode(null);
                  }}
                  size="lg"
                  px={8}
                  rightIcon={<Iconify icon="solar:play-circle-bold" width={24} height={24} />}
                >
                  Start {orchestrateMode === 'scan' ? 'Scanning' : 'Printing'}
                </Button>
              </ModalFooter>
            </>
          )}
        </MotionModalContent>
      </Modal>

      {/* Voice AI Chat Drawer */}
      <VoiceAIChat
        isOpen={voiceAIDrawer.isOpen}
        onClose={voiceAIDrawer.onClose}
        onOrchestrationTrigger={(mode, config) => {
          console.log('🎯 Dashboard: Orchestration triggered', { mode, config });

          // Set orchestration mode
          setOrchestrateMode(mode);

          // Apply configuration if provided
          if (config) {
            setOrchestrateOptions(prev => ({
              ...prev,
              // Apply scan configuration
              ...(mode === 'scan' && {
                scanColorMode: config.colorMode || prev.scanColorMode,
                scanLayout: config.layout || prev.scanLayout,
                scanResolution: config.resolution || prev.scanResolution,
                scanPaperSize: config.paperSize || prev.scanPaperSize,
                scanTextMode: config.scanTextMode !== undefined ? config.scanTextMode : prev.scanTextMode,
                scanPageMode: config.pages || prev.scanPageMode,
                scanCustomRange: config.customRange || prev.scanCustomRange,
              }),
              // Apply print configuration
              ...(mode === 'print' && {
                printColorMode: config.colorMode || prev.printColorMode,
                printLayout: config.layout || prev.printLayout,
                printResolution: config.resolution || prev.printResolution,
                printPaperSize: config.paperSize || prev.printPaperSize,
                printPages: config.pages || prev.printPages,
                printCustomRange: config.customRange || prev.printCustomRange,
                printScale: config.scale || prev.printScale,
              }),
            }));
          }

          // Skip step 1 (mode selection) and go directly to step 2 (configuration)
          setOrchestrateStep(2);

          // Open orchestration modal
          orchestrateModal.onOpen();

          // Show visual feedback
          toast({
            title: `${mode === 'print' ? '🖨️ Print' : '📸 Scan'} Mode Activated`,
            description: 'AI has configured your settings. Review and proceed.',
            status: 'success',
            duration: 4000,
            isClosable: true,
          });
        }}
      />

      {/* Document Selector Modal */}
      <DocumentSelector
        isOpen={documentSelectorModal.isOpen}
        onClose={documentSelectorModal.onClose}
        onSelect={docs => {
          setSelectedDocuments(docs);
          documentSelectorModal.onClose();
        }}
        currentDocuments={files.map(file => ({
          filename: file.filename,
          size: file.size,
          type: 'image',
          thumbnailUrl: `${API_BASE_URL}${API_ENDPOINTS.processed}/${file.filename}`,
          isProcessed: file.has_text,
        }))}
        convertedDocuments={convertedFiles.map((file: any) => ({
          filename: file.filename,
          size: file.size,
          type: 'pdf',
          thumbnailUrl: `${API_BASE_URL}/converted/${file.filename}`,
          isProcessed: true,
        }))}
        allowMultiple={true}
        mode={orchestrateMode || 'print'}
      />
    </VStack>
  );
};

export default Dashboard;
