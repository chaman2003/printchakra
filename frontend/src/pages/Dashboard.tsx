import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Divider,
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
  FiWifiOff,
  FiActivity,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import { Iconify, FancySelect, ConnectionValidator } from '../components/common';
import { SmartConnectionStatusHandle } from '../components/common/SmartConnectionStatus';
import { VoiceAIChat, DocumentPreview, DashboardHeroCard, DashboardActionPanel, DeviceInfoPanel } from '../components';
import DocumentSelector, {
  DocumentSelectorHandle,
} from '../components/document/DocumentSelector';
import PageShell from '../components/layout/PageShell';
import SurfaceCard from '../components/layout/SurfaceCard';
import { DashboardShell } from '../components/layout/DashboardRegions';
import { FileInfo } from '../types';

// ==================== MODAL & PREVIEW CONFIGURATION ====================
// 🔧 ADJUST THESE VALUES TO CONTROL MODAL AND PREVIEW SIZING
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

const includeIfDefined = (value: any, key: string) =>
  value === undefined || value === null ? {} : { [key]: value };

const describeVoiceUpdates = (updates: Record<string, any>) => {
  if (!updates) {
    return '';
  }

  const labels: Record<string, string> = {
    color_mode: 'Color Mode',
    orientation: 'Orientation',
    paper_size: 'Paper Size',
    page_size: 'Page Size',
    paper_size_custom: 'Paper Size',
    margins: 'Margins',
    margins_custom: 'Margins',
    scale: 'Scale',
    scale_custom: 'Scale',
    copies: 'Copies',
    duplex: 'Duplex',
    quality: 'Quality',
    resolution: 'Resolution',
    format: 'Format',
    custom_range: 'Custom Range',
    pages: 'Pages',
    page_mode: 'Pages',
    pages_per_sheet: 'Pages Per Sheet',
    pages_per_sheet_custom: 'Pages Per Sheet',
    mode: 'Scan Mode',
    text_mode: 'Text Mode',
    printColorMode: 'Color Mode',
    printLayout: 'Orientation',
    printPaperSize: 'Paper Size',
    printPaperSizeCustom: 'Paper Size',
    printResolution: 'Resolution',
    printPages: 'Pages',
    printCustomRange: 'Custom Range',
    printScale: 'Scale',
    printScaleCustom: 'Scale',
    printMargins: 'Margins',
    printMarginsCustom: 'Margins',
    printPagesPerSheet: 'Pages Per Sheet',
    printPagesPerSheetCustom: 'Pages Per Sheet',
    printCopies: 'Copies',
    printDuplex: 'Duplex',
    printQuality: 'Quality',
    scanColorMode: 'Color Mode',
    scanLayout: 'Orientation',
    scanResolution: 'Resolution',
    scanResolutionCustom: 'Resolution',
    scanPaperSize: 'Paper Size',
    scanPaperSizeCustom: 'Paper Size',
    scanPageMode: 'Pages',
    scanCustomRange: 'Custom Range',
    scanFormat: 'Format',
    scanTextMode: 'Text Mode',
    scanMode: 'Scan Mode',
    scanQuality: 'Quality',
  };

  return Object.entries(updates)
    .map(([key, value]) => {
      const label = labels[key] || key;
      if (typeof value === 'boolean') {
        return `${label}: ${value ? 'On' : 'Off'}`;
      }
      return `${label}: ${value}`;
    })
    .join(', ');
};

// Motion components
const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card);
const MotionModalContent = motion.create(ModalContent);
const MotionButton = motion.create(Button);
const MotionFlex = motion.create(Flex);

interface ProcessingProgress {
  step: number;
  total_steps: number;
  stage_name: string;
  message?: string;
}

type PreviewControlSource = 'manual' | 'voice';

interface PreviewControlState {
  docIndex: number;
  page: number;
  source: PreviewControlSource;
  token: number;
}

type OrchestrationAction = 'print' | 'scan';

const useImageWithHeaders = (imageUrl: string) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    let revokeUrl: string | null = null;
    setLoading(true);
    setError(null);

    const loadImage = async () => {
      try {
        const headers: Record<string, string> = {
          'X-Requested-With': 'XMLHttpRequest',
        };

        // Add ngrok bypass header if using ngrok tunnel
        if (API_BASE_URL.includes('ngrok') || API_BASE_URL.includes('loca.lt')) {
          headers['ngrok-skip-browser-warning'] = 'true';
        }

        const response = await fetch(imageUrl, {
          headers,
        });

        if (!response.ok) {
          console.error(`Failed to fetch image: ${response.status} ${response.statusText}`, imageUrl);
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        
        // Validate blob
        if (!blob || blob.size === 0) {
          throw new Error('Empty image response');
        }

        const url = URL.createObjectURL(blob);
        revokeUrl = url;
        setBlobUrl(url);
      } catch (err) {
        console.error('Image load error:', err, imageUrl);
        setError(err as Error);
        setBlobUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
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
  // Try /processed first, fallback to /thumbnail
  const imageUrl = `${API_BASE_URL}${API_ENDPOINTS.processed}/${filename}`;
  const thumbnailUrl = `${API_BASE_URL}/thumbnail/${filename}`;
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
    // Fallback to thumbnail endpoint if /processed fails
    return (
      <Box
        as="img"
        src={thumbnailUrl}
        alt={alt}
        className={className}
        onClick={onClick}
        style={style}
        cursor={onClick ? 'pointer' : 'default'}
        objectFit="cover"
        w="100%"
        h="100%"
        borderRadius="lg"
        onError={(e: any) => {
          // If thumbnail also fails, show placeholder
          (e.target as HTMLImageElement).style.display = 'none';
          const placeholder = document.createElement('div');
          placeholder.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(0,0,0,0.2); border-radius: 8px;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg><span style="margin-top: 8px; font-size: 12px; color: #999;">Preview unavailable</span></div>';
          (e.target as HTMLImageElement).parentElement?.appendChild(placeholder);
        }}
      />
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

  const currentDocumentOptions = useMemo(
    () =>
      files.map(file => ({
        filename: file.filename,
        size: file.size,
        type: file.mime_type?.includes('pdf') ? 'pdf' : 'image',
        thumbnailUrl: `${API_BASE_URL}/thumbnail/${file.filename}`,
        isProcessed: file.has_text,
      })),
    [files]
  );

  const convertedDocumentOptions = useMemo(
    () =>
      convertedFiles.map((file: any) => ({
        filename: file.filename,
        size: file.size || 0,
        type: 'pdf',
        thumbnailUrl: `${API_BASE_URL}/thumbnail/${file.filename}`,
        isProcessed: true,
      })),
    [convertedFiles]
  );

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
    scanFormat: 'pdf' as string,
    scanQuality: 'normal' as string,
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
    printCopies: '1' as string,
    printDuplex: false,
    printQuality: 'normal' as string,
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
  const documentSelectorModal = useDisclosure(); // Document selector modal

  // Selected documents for orchestrate modal
  const [selectedDocuments, setSelectedDocuments] = useState<any[]>([]);
  const [previewControl, setPreviewControl] = useState<PreviewControlState>(() => ({
    docIndex: 0,
    page: 1,
    source: 'manual',
    token: Date.now(),
  }));

  const bumpPreviewFocus = useCallback(
    (updates: Partial<Omit<PreviewControlState, 'token'>>) => {
      setPreviewControl(prev => ({
        docIndex: updates.docIndex ?? prev.docIndex,
        page: updates.page ?? prev.page,
        source: updates.source ?? prev.source,
        token: Date.now(),
      }));
    },
    []
  );

  useEffect(() => {
    if (selectedDocuments.length === 0) {
      setPreviewControl({
        docIndex: 0,
        page: 1,
        source: 'manual',
        token: Date.now(),
      });
      return;
    }

    setPreviewControl(prev => {
      if (prev.docIndex <= selectedDocuments.length - 1) {
        return prev;
      }
      return {
        ...prev,
        docIndex: 0,
        page: 1,
        token: Date.now(),
      };
    });
  }, [selectedDocuments.length]);

  // Connection status modal state
  const connectivityModal = useDisclosure();
  const connectionStatusRef = React.useRef<SmartConnectionStatusHandle>(null);

  // Ref for scrolling the modal body
  const modalBodyRef = React.useRef<HTMLDivElement>(null);
  const voiceOrchestrationTriggerRef = React.useRef<
    ((mode: OrchestrationAction, config?: any) => void) | null
  >(null);
  const lastOrchestrationUpdateRef = React.useRef<string | null>(null);
  const documentSelectorRef = React.useRef<DocumentSelectorHandle | null>(null);
  const voiceDocumentSelectionRef = React.useRef<{ section: 'current' | 'converted'; index: number }>(
    {
      section: 'current',
      index: 1,
    }
  );

  const [isChatVisible, setIsChatVisible] = useState(false); // Chat hidden by default
  const [orchestrationContext, setOrchestrationContext] = useState<'manual' | 'voice'>('manual');
  const isVoiceOrchestration = orchestrationContext === 'voice';

  useEffect(() => {
    if (!orchestrateModal.isOpen && orchestrationContext === 'voice') {
      setOrchestrationContext('manual');
    }
  }, [orchestrateModal.isOpen, orchestrationContext]);

  useEffect(() => {
    if (orchestrationContext === 'voice' && !isChatVisible) {
      setIsChatVisible(true);
    }
  }, [orchestrationContext, isChatVisible]);

  const legacyVoiceKeyMap = useMemo<Record<OrchestrationAction, Record<string, string>>>(
    () => ({
      print: {
        colorMode: 'color_mode',
        color_mode: 'color_mode',
        layout: 'orientation',
        orientation: 'orientation',
        paperSize: 'paper_size',
        pageSize: 'paper_size',
        paper_size: 'paper_size',
        paperSizeCustom: 'paper_size_custom',
        paper_size_custom: 'paper_size_custom',
        resolution: 'resolution',
        pages: 'pages',
        customRange: 'custom_range',
        custom_range: 'custom_range',
        scale: 'scale',
        scaleCustom: 'scale_custom',
        scale_custom: 'scale_custom',
        margins: 'margins',
        marginsCustom: 'margins_custom',
        pagesPerSheet: 'pages_per_sheet',
        pages_per_sheet: 'pages_per_sheet',
        pagesPerSheetCustom: 'pages_per_sheet_custom',
        pages_per_sheet_custom: 'pages_per_sheet_custom',
        copies: 'copies',
        duplex: 'duplex',
        quality: 'quality',
      },
      scan: {
        colorMode: 'color_mode',
        color_mode: 'color_mode',
        layout: 'orientation',
        orientation: 'orientation',
        paperSize: 'paper_size',
        pageSize: 'paper_size',
        page_size: 'paper_size',
        paper_size: 'paper_size',
        paperSizeCustom: 'paper_size_custom',
        paper_size_custom: 'paper_size_custom',
        resolution: 'resolution',
        scanResolution: 'resolution',
        resolutionCustom: 'resolution_custom',
        resolution_custom: 'resolution_custom',
        format: 'format',
        scanFormat: 'format',
        mode: 'mode',
        scanMode: 'mode',
        pageMode: 'page_mode',
        scanPageMode: 'page_mode',
        customRange: 'custom_range',
        scanCustomRange: 'custom_range',
        textMode: 'text_mode',
        scanTextMode: 'text_mode',
        quality: 'quality',
      },
    }),
    []
  );

  const normalizeVoiceUpdates = useCallback(
    (actionType: OrchestrationAction | undefined, updates: Record<string, any> = {}) => {
      if (!actionType || !updates) {
        return {};
      }

      if (actionType === 'print') {
        return {
          ...includeIfDefined(updates.color_mode, 'printColorMode'),
          ...includeIfDefined(updates.orientation, 'printLayout'),
          ...includeIfDefined(updates.paper_size, 'printPaperSize'),
          ...includeIfDefined(updates.paper_size_custom, 'printPaperSizeCustom'),
          ...includeIfDefined(updates.margins, 'printMargins'),
          ...includeIfDefined(updates.margins_custom, 'printMarginsCustom'),
          ...includeIfDefined(
            updates.scale !== undefined && updates.scale !== null
              ? String(updates.scale)
              : undefined,
            'printScale'
          ),
          ...includeIfDefined(updates.scale_custom, 'printScaleCustom'),
          ...includeIfDefined(
            updates.resolution !== undefined && updates.resolution !== null
              ? String(updates.resolution)
              : undefined,
            'printResolution'
          ),
          ...includeIfDefined(updates.pages, 'printPages'),
          ...includeIfDefined(updates.custom_range, 'printCustomRange'),
          ...includeIfDefined(
            updates.copies !== undefined && updates.copies !== null
              ? String(updates.copies)
              : undefined,
            'printCopies'
          ),
          ...includeIfDefined(
            typeof updates.duplex === 'boolean' ? updates.duplex : undefined,
            'printDuplex'
          ),
          ...includeIfDefined(
            updates.pages_per_sheet !== undefined && updates.pages_per_sheet !== null
              ? String(updates.pages_per_sheet)
              : undefined,
            'printPagesPerSheet'
          ),
          ...includeIfDefined(updates.pages_per_sheet_custom, 'printPagesPerSheetCustom'),
          ...includeIfDefined(updates.quality, 'printQuality'),
        };
      }

      return {
        ...includeIfDefined(updates.color_mode, 'scanColorMode'),
        ...includeIfDefined(updates.orientation, 'scanLayout'),
        ...includeIfDefined(
          updates.resolution !== undefined && updates.resolution !== null
            ? String(updates.resolution)
            : undefined,
          'scanResolution'
        ),
        ...includeIfDefined(updates.page_size || updates.paper_size, 'scanPaperSize'),
        ...includeIfDefined(updates.paper_size_custom, 'scanPaperSizeCustom'),
        ...includeIfDefined(updates.format, 'scanFormat'),
        ...includeIfDefined(updates.page_mode, 'scanPageMode'),
        ...includeIfDefined(updates.custom_range, 'scanCustomRange'),
        ...includeIfDefined(
          updates.resolution_custom !== undefined && updates.resolution_custom !== null
            ? String(updates.resolution_custom)
            : undefined,
          'scanResolutionCustom'
        ),
        ...includeIfDefined(
          typeof updates.text_mode === 'boolean' ? updates.text_mode : undefined,
          'scanTextMode'
        ),
        ...includeIfDefined(updates.mode, 'scanMode'),
        ...includeIfDefined(updates.quality, 'scanQuality'),
      };
    },
    []
  );

  const applyVoiceConfigurationUpdates = useCallback(
    (
      actionType: OrchestrationAction | undefined,
      updates: Record<string, any>,
      normalizedOverride?: Record<string, any>
    ) => {
      if (
        !actionType ||
        ((!updates || Object.keys(updates).length === 0) &&
          (!normalizedOverride || Object.keys(normalizedOverride).length === 0))
      ) {
        return false;
      }

      const normalized =
        normalizedOverride && Object.keys(normalizedOverride).length > 0
          ? normalizedOverride
          : normalizeVoiceUpdates(actionType, updates);

      if (!normalized || Object.keys(normalized).length === 0) {
        return false;
      }

      setOrchestrateOptions(prev => ({
        ...prev,
        ...normalized,
      }));

      const summarySource =
        updates && Object.keys(updates).length > 0 ? updates : normalized;
      const summary = describeVoiceUpdates(summarySource);
      if (summary) {
        setVoiceAdjustmentLog(prev => {
          const next = [
            {
              timestamp: new Date().toISOString(),
              summary,
              action: actionType,
            },
            ...prev,
          ];
          return next.slice(0, 6);
        });
      }

      return true;
    },
    [normalizeVoiceUpdates, setOrchestrateOptions]
  );

  const resolveInitialVoiceConfigOptions = useCallback(
    (mode: OrchestrationAction, config?: any) => {
      if (!config || typeof config !== 'object') {
        return {};
      }

      if (config.options && typeof config.options === 'object') {
        return config.options;
      }

      const prefixedKey = Object.keys(config).some(key =>
        key.startsWith(mode === 'print' ? 'print' : 'scan')
      );
      if (prefixedKey) {
        return config;
      }

      const mapping = legacyVoiceKeyMap[mode];
      const snakeSource: Record<string, any> = {};

      Object.entries(config).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }
        const mappedKey = mapping?.[key];
        if (mappedKey) {
          snakeSource[mappedKey] = value;
        }
      });

      if (Object.keys(snakeSource).length === 0) {
        return {};
      }

      return normalizeVoiceUpdates(mode, snakeSource);
    },
    [legacyVoiceKeyMap, normalizeVoiceUpdates]
  );

  const handleOrchestrationUpdate = useCallback(
    (payload: any) => {
      if (!payload?.type) {
        return;
      }

      const eventId =
        payload.timestamp || `${payload.type}-${JSON.stringify(payload.updates ?? payload.result ?? '')}`;
      if (lastOrchestrationUpdateRef.current === eventId) {
        return;
      }
      lastOrchestrationUpdateRef.current = eventId;

      switch (payload.type) {
        case 'voice_configuration_updated': {
          const actionType = payload.action_type as OrchestrationAction | undefined;
          const updates = payload.updates || {};
          const applied = applyVoiceConfigurationUpdates(
            actionType,
            updates,
            payload.frontend_updates
          );
          if (applied) {
            if (!orchestrateModal.isOpen) {
              orchestrateModal.onOpen();
            }
            const described =
              describeVoiceUpdates(
                Object.keys(updates).length > 0 ? updates : payload.frontend_updates || {}
              ) || 'settings updated';
            toast({
              title: 'Voice Settings Applied',
              description: `Updated via voice: ${described}`,
              status: 'success',
              duration: 3000,
            });
          }
          break;
        }
        case 'configuration_updated': {
          const actionType = payload.action_type as OrchestrationAction | undefined;
          const normalized =
            payload.frontend_updates || payload.frontend_state?.options || {};
          applyVoiceConfigurationUpdates(actionType, payload.updates || {}, normalized);
          break;
        }
        case 'configuration_complete': {
          setOrchestrateStep(3);
          if (!orchestrateModal.isOpen) {
            orchestrateModal.onOpen();
          }
          toast({
            title: 'Configuration Complete',
            description: 'Voice assistant finished adjusting your settings.',
            status: 'info',
            duration: 3000,
          });
          break;
        }
        case 'voice_command_detected': {
          const mode = payload.intent as OrchestrationAction | undefined;
          if (mode === 'print' || mode === 'scan') {
            const shouldOpen = payload.open_ui ?? payload.result?.open_ui;
            if (shouldOpen && voiceOrchestrationTriggerRef.current) {
              const configPayload =
                payload.frontend_state ||
                payload.result?.frontend_state ||
                payload.result?.configuration;
              voiceOrchestrationTriggerRef.current(mode, configPayload);
            }
            if (payload.skip_mode_selection || payload.result?.skip_mode_selection) {
              setOrchestrateStep(2);
            }
          }
          break;
        }
        default:
          break;
      }
    },
    [applyVoiceConfigurationUpdates, orchestrateModal, setOrchestrateStep, toast]
  );

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
      scanFormat: orchestrateOptions.scanFormat,
      scanResolution: orchestrateOptions.scanResolution,
      scanColorMode: orchestrateOptions.scanColorMode,
      printPages: orchestrateOptions.printPages,
      printLayout: orchestrateOptions.printLayout,
      printPaperSize: orchestrateOptions.printPaperSize,
      printScale: orchestrateOptions.printScale,
      printMargins: orchestrateOptions.printMargins,
      printCopies: orchestrateOptions.printCopies,
      printDuplex: orchestrateOptions.printDuplex,
      printQuality: orchestrateOptions.printQuality,
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

  // Fetch document info including pages for PDFs
  const fetchDocumentInfo = useCallback(async (filename: string) => {
    try {
      const response = await apiClient.get(`/document/info/${filename}`);
      const docInfo = response.data;
      
      // Prepend API_BASE_URL to thumbnail URLs if they're relative paths
      if (docInfo.pages) {
        docInfo.pages = docInfo.pages.map((page: any) => ({
          ...page,
          thumbnailUrl: page.thumbnailUrl.startsWith('http') 
            ? page.thumbnailUrl 
            : `${API_BASE_URL}${page.thumbnailUrl}`
        }));
      }
      
      return docInfo;
    } catch (error) {
      console.error('Error fetching document info:', error);
      // Return basic structure as fallback
      return {
        filename: filename,
        file_type: filename.split('.').pop()?.toLowerCase() || 'unknown',
        pages: [{
          pageNumber: 1,
          thumbnailUrl: `${API_BASE_URL}/thumbnail/${filename}`
        }]
      };
    }
  }, []);

  // Enhance selected documents with page information
  const enhanceDocumentsWithPages = useCallback(async (docs: any[]) => {
    const enhanced = await Promise.all(
      docs.map(async (doc) => {
        const docInfo = await fetchDocumentInfo(doc.filename);
        return {
          ...doc,
          pages: docInfo.pages || [{
            pageNumber: 1,
            thumbnailUrl: doc.thumbnailUrl || `${API_BASE_URL}/thumbnail/${doc.filename}`
          }]
        };
      })
    );
    return enhanced;
  }, [fetchDocumentInfo]);

  // File cache system - stores file metadata and counts
  // Use refs to avoid rerunning useEffect hooks when cache metadata updates
  const filesCacheRef = React.useRef<{ data: any[] | null; lastCount: number; timestamp: number }>(
    {
      data: null,
      lastCount: 0,
      timestamp: 0,
    }
  );

  const convertedFilesCacheRef = React.useRef<{ data: any[] | null; lastCount: number; timestamp: number }>(
    {
      data: null,
      lastCount: 0,
      timestamp: 0,
    }
  );

  const [voiceAdjustmentLog, setVoiceAdjustmentLog] = useState<
    Array<{ timestamp: string; summary: string; action: OrchestrationAction }>
  >([]);

  const renderVoiceAdjustmentPanel = useCallback(
    (mode: OrchestrationAction) => {
      const entries = voiceAdjustmentLog
        .filter(entry => entry.action === mode)
        .slice(0, 4);

      if (entries.length === 0) {
        return null;
      }

      return (
        <Box
          border="1px solid"
          borderColor="rgba(121,95,238,0.35)"
          bg="rgba(121,95,238,0.08)"
          borderRadius="xl"
          p={4}
          mb={4}
        >
          <HStack justify="space-between" mb={3}>
            <Heading size="sm">Recent AI adjustments</Heading>
            <Badge colorScheme="brand" variant="subtle">
              {mode === 'print' ? 'Print' : 'Scan'}
            </Badge>
          </HStack>
          <Stack spacing={2}>
            {entries.map(entry => (
              <Flex
                key={`${entry.timestamp}-${entry.summary}`}
                align="baseline"
                justify="space-between"
                gap={4}
              >
                <Text fontSize="sm" flex={1} color="text.muted">
                  {entry.summary}
                </Text>
                <Text fontSize="xs" color="text.secondary">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Text>
              </Flex>
            ))}
          </Stack>
        </Box>
      );
    },
    [voiceAdjustmentLog]
  );

  const getSectionFromParam = useCallback((section?: string): 'current' | 'converted' | 'upload' => {
    if (!section) {
      return 'current';
    }
    const normalized = section.toLowerCase();
    if (normalized.includes('convert')) {
      return 'converted';
    }
    if (normalized.includes('upload')) {
      return 'upload';
    }
    return 'current';
  }, []);

  const selectDocumentForVoice = useCallback(
    async (section: 'current' | 'converted', documentNumber?: number) => {
      if (!documentNumber || Number.isNaN(documentNumber) || documentNumber < 1) {
        return false;
      }

      const docs = section === 'converted' ? convertedDocumentOptions : currentDocumentOptions;
      const targetDoc = docs[documentNumber - 1];
      if (!targetDoc) {
        toast({
          title: 'Document not found',
          description: `Section ${section} does not have item #${documentNumber}.`,
          status: 'warning',
          duration: 3000,
        });
        return false;
      }

      documentSelectorModal.onOpen();
      documentSelectorRef.current?.focusSection(section);
      documentSelectorRef.current?.selectDocumentByIndex(section, documentNumber);
      voiceDocumentSelectionRef.current = { section, index: documentNumber };

      const enhancedDocs = await enhanceDocumentsWithPages([targetDoc]);
      setSelectedDocuments(enhancedDocs);
      bumpPreviewFocus({ docIndex: 0, page: 1, source: 'voice' });

      toast({
        title: 'Document ready',
        description: `${targetDoc.filename} selected via voice`,
        status: 'success',
        duration: 2500,
      });
      return true;
    },
    [
      convertedDocumentOptions,
      currentDocumentOptions,
      documentSelectorModal,
      enhanceDocumentsWithPages,
      bumpPreviewFocus,
      toast,
    ]
  );

  const forceCloseChat = useCallback(() => {
    setIsChatVisible(false);
    setOrchestrationContext('manual');
  }, []);

  const handleDockedChatClose = useCallback(() => {
    if (orchestrationContext === 'voice') {
      toast({
        title: 'Voice assistant active',
        description: 'Chat stays visible while AI configures your settings.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      setIsChatVisible(true);
      return;
    }

    setIsChatVisible(false);
  }, [orchestrationContext, toast]);

  const handleChatVisibilityToggle = useCallback(() => {
    if (isChatVisible) {
      handleDockedChatClose();
    } else {
      setIsChatVisible(true);
    }
  }, [handleDockedChatClose, isChatVisible]);

  const handleVoiceCommand = useCallback(
    async (data: any) => {
      const { command, params } = data;
      console.log(`Handling voice command: ${command}`, params);

      const sectionParam = getSectionFromParam(params?.section);
      const parsedDocumentNumber = params?.document_number
        ? parseInt(params.document_number, 10)
        : undefined;

      switch (command) {
        case 'select_document': {
          if (sectionParam === 'upload') {
            documentSelectorModal.onOpen();
            documentSelectorRef.current?.focusSection('upload');
            toast({
              title: 'Upload',
              description: 'Switching to upload tab.',
              status: 'info',
              duration: 2000,
            });
            break;
          }

          const targetSection = sectionParam as 'current' | 'converted';
          documentSelectorModal.onOpen();
          documentSelectorRef.current?.focusSection(targetSection);

          if (parsedDocumentNumber) {
            await selectDocumentForVoice(targetSection, parsedDocumentNumber);
          } else {
            voiceDocumentSelectionRef.current = { section: targetSection, index: 1 };
            toast({
              title: 'Document Selection',
              description: `Browsing ${targetSection} documents`,
              status: 'info',
              duration: 2000,
            });
          }
          break;
        }

        case 'switch_section': {
          documentSelectorModal.onOpen();
          documentSelectorRef.current?.focusSection(sectionParam);
          if (sectionParam !== 'upload') {
            voiceDocumentSelectionRef.current = {
              section: sectionParam,
              index: 1,
            };
          }
          toast({
            title: 'Section Switch',
            description: `Switching to ${sectionParam} section`,
            status: 'info',
            duration: 2000,
          });
          break;
        }

        case 'next_document': {
          const ctx = voiceDocumentSelectionRef.current;
          const docs = ctx.section === 'converted' ? convertedDocumentOptions : currentDocumentOptions;
          if (docs.length === 0) {
            toast({
              title: 'No documents',
              description: `No documents available in ${ctx.section} section`,
              status: 'warning',
              duration: 2000,
            });
            break;
          }
          const nextIndex = Math.min(docs.length, ctx.index + 1);
          await selectDocumentForVoice(ctx.section, nextIndex);
          break;
        }

        case 'previous_document': {
          const ctx = voiceDocumentSelectionRef.current;
          const docs = ctx.section === 'converted' ? convertedDocumentOptions : currentDocumentOptions;
          if (docs.length === 0) {
            toast({
              title: 'No documents',
              description: `No documents available in ${ctx.section} section`,
              status: 'warning',
              duration: 2000,
            });
            break;
          }
          const prevIndex = Math.max(1, ctx.index - 1);
          await selectDocumentForVoice(ctx.section, prevIndex);
          break;
        }

        case 'upload_document': {
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) {
            fileInput.click();
          }
          toast({
            title: 'Upload',
            description: 'Opening upload dialog...',
            status: 'info',
            duration: 2000,
          });
          break;
        }

        case 'confirm': {
          if (orchestrateMode === 'print') {
            executePrintJob();
          } else if (orchestrateMode === 'scan') {
            executeScanJob();
          }
          toast({
            title: 'Executing',
            description: `Starting ${orchestrateMode} operation...`,
            status: 'success',
            duration: 2000,
          });
          break;
        }

        case 'cancel': {
          orchestrateModal.onClose();
          toast({
            title: 'Cancelled',
            description: 'Operation cancelled',
            status: 'warning',
            duration: 2000,
          });
          break;
        }

        case 'status': {
          toast({
            title: 'Current Status',
            description: orchestrateMode
              ? `${orchestrateMode.toUpperCase()} mode active`
              : 'No active operation',
            status: 'info',
            duration: 3000,
          });
          break;
        }

        case 'repeat_settings': {
          const currentSettings = orchestrateMode === 'print'
            ? `Print settings: ${orchestrateOptions.printColorMode}, ${orchestrateOptions.printLayout}, ${orchestrateOptions.printPaperSize}`
            : orchestrateMode === 'scan'
              ? `Scan settings: ${orchestrateOptions.scanColorMode}, ${orchestrateOptions.scanLayout}, ${orchestrateOptions.scanResolution} DPI`
              : 'No settings configured';

          toast({
            title: 'Current Settings',
            description: currentSettings,
            status: 'info',
            duration: 4000,
          });
          break;
        }

        case 'stop_recording': {
          if (isChatVisible) {
            forceCloseChat();
          }
          toast({
            title: 'Voice Stopped',
            description: 'Recording stopped',
            status: 'info',
            duration: 2000,
          });
          break;
        }

        default:
          console.warn(`Unknown voice command: ${command}`);
      }
    },
    [
      convertedDocumentOptions,
      currentDocumentOptions,
      documentSelectorModal,
      documentSelectorRef,
      getSectionFromParam,
      forceCloseChat,
      handleDockedChatClose,
      isChatVisible,
      orchestrateMode,
      orchestrateOptions.printColorMode,
      orchestrateOptions.printLayout,
      orchestrateOptions.printPaperSize,
      orchestrateOptions.scanColorMode,
      orchestrateOptions.scanLayout,
      orchestrateOptions.scanResolution,
      orchestrateModal,
      selectDocumentForVoice,
      toast,
    ]
  );

  const handleOrchestrationUpdateRef = React.useRef(handleOrchestrationUpdate);
  useEffect(() => {
    handleOrchestrationUpdateRef.current = handleOrchestrationUpdate;
  }, [handleOrchestrationUpdate]);

  const surfaceCard = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  const dockedChatBg = useColorModeValue('rgba(248, 250, 255, 0.95)', 'rgba(9, 14, 26, 0.96)');
  const dockedBorderColor = useColorModeValue('rgba(121,95,238,0.12)', 'rgba(121,95,238,0.35)');
  const statusDotColor = connected ? 'green.400' : 'red.400';
  const statusTextColor = useColorModeValue('gray.600', 'gray.300');
  const statusText = error
    ? `Connection issues (retry ${connectionRetries})`
    : connected
      ? 'Live link established'
      : 'Disconnected';
  const showReopenOrchestrateButton = Boolean(orchestrateMode && !orchestrateModal.isOpen);

  // Derived color values to avoid calling hooks conditionally inside JSX
  const systemModalBgGradient = useColorModeValue(
    'linear-gradient(135deg, #ffffff 0%, #f8f7ff 100%)',
    'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)'
  );
  const validatorBoxBg = useColorModeValue('rgba(255,255,255,0.5)', 'rgba(0,0,0,0.2)');
  const chatSidebarBg = useColorModeValue('white', 'gray.800');
  const chatSidebarBorderColor = useColorModeValue('gray.200', 'gray.700');

  const { socket, connected: socketConnected } = useSocket();

  useEffect(() => {
    setConnected(socketConnected);
  }, [socketConnected]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const newFileListener = (data: any) => {
      console.log('New file uploaded:', data);
      loadFiles(false); // Background refresh, no loading spinner
    };
    socket.on('new_file', newFileListener);

    const fileDeletedListener = (data: any) => {
      console.log('File deleted:', data);
      loadFiles(false);
    };
    socket.on('file_deleted', fileDeletedListener);

    const processingProgressListener = (data: ProcessingProgress) => {
      console.log(`Processing: Step ${data.step}/${data.total_steps} - ${data.stage_name}`);
      setProcessingProgress(data);
    };
    socket.on('processing_progress', processingProgressListener);

    const processingCompleteListener = (data: any) => {
      console.log('Processing complete:', data);
      setProcessingProgress(null);
      setTimeout(() => loadFiles(false), 500); // Refresh after processing
    };
    socket.on('processing_complete', processingCompleteListener);

    const processingErrorListener = (data: any) => {
      console.error('Processing error:', data);
      setProcessingProgress(null);
    };
    socket.on('processing_error', processingErrorListener);

    // Listen for orchestration updates from voice commands
    const orchestrationUpdateListener = (payload: any) => {
      handleOrchestrationUpdateRef.current?.(payload);
    };
    socket.on('orchestration_update', orchestrationUpdateListener);

    loadFiles();
    loadConvertedFiles(); // Load converted files on component mount

    let pollInterval = 60000;
    const maxInterval = 300000;
    let timeoutId: ReturnType<typeof setTimeout>;
    // local counter removed - avoid poll debug logging in production

    const startPolling = () => {
      // -- startPolling invoked
      timeoutId = setTimeout(async () => {
        console.log('Safety net polling for new files...');
        try {
          await loadFiles(false);
          if (pollInterval > 60000) {
            console.log('Connection restored, resetting poll interval');
            pollInterval = 60000;
            setConnectionRetries(0);
          }
        } catch (err) {
          pollInterval = Math.min(pollInterval * 1.5, maxInterval);
          setConnectionRetries((prev: number) => prev + 1);
          console.log(`Poll failed, backing off to ${pollInterval}ms`);
        }
        startPolling();
      }, pollInterval);
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible - refreshing files');
        loadFiles(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      socket.off('new_file', newFileListener);
      socket.off('file_deleted', fileDeletedListener);
      socket.off('processing_progress', processingProgressListener);
      socket.off('processing_complete', processingCompleteListener);
      socket.off('processing_error', processingErrorListener);
      socket.off('orchestration_update', orchestrationUpdateListener);
      // -- startPolling cleaned up
    };
  }, [socket]);

  const lastLoadFilesRunRef = React.useRef<number>(0);
  const minLoadFilesInterval = 1000; // ms - minimum interval between calls

  const loadFiles = useCallback(async (showLoading = true) => {
    const now = Date.now();
    if (now - lastLoadFilesRunRef.current < minLoadFilesInterval) {
      console.log('Skipping loadFiles due to rate limit');
      return;
    }
    lastLoadFilesRunRef.current = now;
    // Prevent overlapping calls that can cause duplicate requests
    if ((loadFiles as any)._isRunning) {
      console.log('loadFiles: already running - skipping');
      return;
    }
    (loadFiles as any)._isRunning = true;
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
      if (newCount !== filesCacheRef.current.lastCount) {
        console.log(
          `File count changed: ${filesCacheRef.current.lastCount} → ${newCount}, updating cache`
        );
        setFiles(filesData);
        filesCacheRef.current = {
          data: filesData,
          lastCount: newCount,
          timestamp: Date.now(),
        };
      } else {
        console.log(`File count unchanged (${newCount}), using cached data`);
        // Use cached data if available
        if (filesCacheRef.current.data) {
          setFiles(filesCacheRef.current.data);
        } else {
          setFiles(filesData);
        }
      }
      setError(null);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      const errorMsg =
        err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_CLOSED'
          ? 'Backend connection lost. Retrying...'
          : err.message || 'Failed to load files';
      setError(errorMsg);

      // Don't show persistent error on background polls
      if (!showLoading) {
        setTimeout(() => setError(null), 5000); // Clear error after 5s
      }
    } finally {
      (loadFiles as any)._isRunning = false;
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

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
    setOrchestrationContext('manual');
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

  const reopenOrchestrateModal = () => {
    // If it was triggered by voice, reopen voice chat as well
    if (orchestrationContext === 'voice') {
      setIsChatVisible(true);
    }
    
    // Reopen with current mode and step 2 (keep same settings)
    if (orchestrateMode) {
      setOrchestrateStep(2);
      orchestrateModal.onOpen();
    } else {
      // If no mode set, open from beginning
      openOrchestrateModal();
    }
  };

  const handleVoiceOrchestrationTrigger = (mode: OrchestrationAction, config?: any) => {
    console.log('Dashboard: Orchestration triggered', { mode, config });

    setOrchestrationContext('voice');
    
    // Keep the voice chat drawer OPEN during orchestration for Jarvis-like experience
    // User can interact with AI while configuring print/scan settings
    if (!isChatVisible) {
      setIsChatVisible(true);
    }

    setOrchestrateMode(mode);

    const resolvedVoiceOptions = resolveInitialVoiceConfigOptions(mode, config);
    if (Object.keys(resolvedVoiceOptions).length > 0) {
      setOrchestrateOptions(prev => ({
        ...prev,
        ...resolvedVoiceOptions,
      }));
    }

    setOrchestrateStep(2);

    if (!orchestrateModal.isOpen) {
      orchestrateModal.onOpen();
      toast({
        title: `${mode === 'print' ? '🖨️ Print' : '📸 Scan'} Mode Activated`,
        description: 'AI has configured your settings. Review and proceed.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  voiceOrchestrationTriggerRef.current = handleVoiceOrchestrationTrigger;

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

  const handleRefreshClick = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
    }
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

      const payload = {
        files: selectedFiles,
        format: targetFormat,
        merge_pdf: mergePdf && targetFormat === 'pdf',
        filename: customFilename.trim() || undefined,
      };
      console.log('Sending convert request', payload);
      const response = await apiClient.post('/convert', payload);

      if (response.data.success) {
        const { success_count, fail_count, results, merged } = response.data;

        if (merged) {
          setConversionProgress(
            `Merged into single PDF!\n${selectedFiles.length} files combined`
          );
        } else {
          setConversionProgress(
            `Conversion complete!\nSuccess: ${success_count}\nFailed: ${fail_count}`
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
        setConversionProgress(`Conversion failed: ${response.data.error}`);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      // Surface more detailed server error message if available
      const serverMessage =
        err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Unknown error';
      setConversionProgress(`Conversion error: ${serverMessage}`);
      // Also display a toast for user visibility
      toast({
        title: 'Conversion error',
        description: serverMessage,
        status: 'error',
        duration: 6000,
      });
    } finally {
      setConverting(false);
    }
  };

  // Load converted files
  const lastLoadConvertedRunRef = React.useRef<number>(0);
  const minLoadConvertedInterval = 1000; // ms

  const loadConvertedFiles = useCallback(async () => {
    const now = Date.now();
    if (now - lastLoadConvertedRunRef.current < minLoadConvertedInterval) {
      console.log('Skipping loadConvertedFiles due to rate limit');
      return;
    }
    lastLoadConvertedRunRef.current = now;
    if ((loadConvertedFiles as any)._isRunning) {
      console.log('loadConvertedFiles: already running - skipping');
      return;
    }
    (loadConvertedFiles as any)._isRunning = true;
    try {
      const response = await apiClient.get('/get-converted-files');
      if (response.data.files) {
        // Smart cache: only update if file count changed
        const newCount = response.data.files.length;
        if (newCount !== convertedFilesCacheRef.current.lastCount) {
          console.log(
            `Converted file count changed: ${convertedFilesCacheRef.current.lastCount} → ${newCount}, updating cache`    
          );
          setConvertedFiles(response.data.files);
          convertedFilesCacheRef.current = {
            data: response.data.files,
            lastCount: newCount,
            timestamp: Date.now(),
          };
        } else {
          console.log(`Converted file count unchanged (${newCount}), using cached data`);
          // Use cached data if available
          if (convertedFilesCacheRef.current.data) {
            setConvertedFiles(convertedFilesCacheRef.current.data);
          } else {
            setConvertedFiles(response.data.files);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load converted files:', err);
    }
    finally {
      (loadConvertedFiles as any)._isRunning = false;
    }
  }, []);

  const handleConvertedDrawerToggle = useCallback(() => {
    if (!convertedDrawer.isOpen) {
      loadConvertedFiles();
    }
    convertedDrawer.onToggle();
  }, [convertedDrawer, loadConvertedFiles]);
  // Prevent scrolling when chat visibility changes
  return (
    <Box position="relative" minH="100vh">
      
      <PageShell>
        <DashboardShell
          styleOverrides={{
            mr: isChatVisible ? { base: 0, lg: '35vw' } : 0,
            transition: 'margin-right 0.3s ease-out',
            minH: '100vh',
            pt: 2,
            pb: 2,
            px: 3,
            pr: isChatVisible ? { base: 3, lg: 0 } : 3,
          }}
        >
          {/* Main Content Area */}
          <VStack align="stretch" spacing={5} pb={6}>
          <DashboardHeroCard
            statusDotColor={statusDotColor}
            statusTextColor={statusTextColor}
            statusText={statusText}
            error={error}
            onRefresh={handleRefreshClick}
            onCheckConnectivity={connectivityModal.onOpen}
          >
            <DashboardActionPanel
              isChatVisible={isChatVisible}
              selectionMode={selectionMode}
              selectedFilesCount={selectedFiles.length}
              orchestrateMode={orchestrateMode}
              showReopenOrchestrate={showReopenOrchestrateButton}
              onTriggerPrint={triggerPrint}
              onToggleChat={handleChatVisibilityToggle}
              onToggleSelectionMode={toggleSelectionMode}
              onOpenConversionModal={openConversionModal}
              onCheckConnectivity={connectivityModal.onOpen}
              onToggleConvertedDrawer={handleConvertedDrawerToggle}
              isConvertedDrawerOpen={convertedDrawer.isOpen}
              onReopenOrchestrate={reopenOrchestrateModal}
              embedded={true}
            />
          </DashboardHeroCard>
        </VStack>

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
                  const documentIndex = index + 1;
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
                            <HStack spacing={2} align="center">
                              <Badge colorScheme="purple" borderRadius="full" px={2} py={0.5}>
                                #{documentIndex}
                              </Badge>
                              <Heading size="sm" noOfLines={1} title={file.filename}>
                                {file.filename}
                              </Heading>
                            </HStack>
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
                    {selectedFiles.map((filename: string, index: number) => (
                      <Text key={filename}>
                        #{index + 1} · {filename}
                      </Text>
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
                {convertedFiles.map((file: any, index: number) => {
                  const convertedIndex = index + 1;
                  return (
                    <Card
                      key={file.filename}
                      borderRadius="xl"
                      border="1px solid rgba(69,202,255,0.18)"
                    >
                      <CardBody>
                        <Stack spacing={3}>
                          <Stack spacing={1}>
                            <HStack spacing={2} align="center">
                              <Badge colorScheme="cyan" borderRadius="full" px={2} py={0.5}>
                                #{convertedIndex}
                              </Badge>
                              <Heading size="sm">{file.filename}</Heading>
                            </HStack>
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
                  );
                })}
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
        size={isVoiceOrchestration ? 'full' : '6xl'}
        isCentered={!isVoiceOrchestration}
        scrollBehavior={isVoiceOrchestration ? 'outside' : 'inside'}
        motionPreset={isVoiceOrchestration ? 'slideInBottom' : 'scale'}
      >
        <ModalOverlay
          backdropFilter={isVoiceOrchestration ? 'blur(8px)' : 'blur(16px)'}
          bg={isVoiceOrchestration ? 'blackAlpha.600' : 'blackAlpha.700'}
        />
        <MotionModalContent
          bg={surfaceCard}
          borderRadius={isVoiceOrchestration ? '2xl' : { base: 'xl', md: '2xl', lg: '3xl' }}
          border="1px solid"
          borderColor="brand.300"
          boxShadow="0 25px 60px rgba(121, 95, 238, 0.4)"
          maxH={isVoiceOrchestration ? '90vh' : MODAL_CONFIG.modal.maxHeight}
          maxW={isVoiceOrchestration ? '95vw' : MODAL_CONFIG.modal.maxWidth}
          w={isVoiceOrchestration ? '95vw' : 'auto'}
          h={isVoiceOrchestration ? '90vh' : 'auto'}
          mx={isVoiceOrchestration ? 'auto' : 'auto'}
          my={isVoiceOrchestration ? '5vh' : 'auto'}
          overflow="hidden"
          display="flex"
          flexDirection="column"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Flex
            h="100%"
            w="100%"
            direction={{ base: 'column', xl: isVoiceOrchestration ? 'row' : 'column' }}
            overflow="hidden"
          >
            <Box flex="1" display="flex" flexDirection="column" overflow="hidden">
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
                {renderVoiceAdjustmentPanel('scan')}
                {renderVoiceAdjustmentPanel('print')}
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
                              pages: doc.pages || [
                                {
                                  pageNumber: 1,
                                  thumbnailUrl:
                                    doc.thumbnailUrl ||
                                    `${API_BASE_URL}${API_ENDPOINTS.processed}/${doc.filename}`,
                                },
                              ]
                            }))
                          : []
                      }
                      previewSettings={{
                        layout: orchestrateOptions.scanLayout,
                        paperSize: orchestrateOptions.scanPaperSize,
                        colorMode: orchestrateOptions.scanColorMode,
                      }}
                      activeDocIndex={previewControl.docIndex}
                      activePage={previewControl.page}
                      focusToken={previewControl.token}
                      highlightSource={previewControl.source}
                      onRequestDocChange={nextIndex =>
                        bumpPreviewFocus({ docIndex: nextIndex, page: 1, source: 'manual' })
                      }
                      onRequestPageChange={nextPage =>
                        bumpPreviewFocus({ page: nextPage, source: 'manual' })
                      }
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
                              pages: doc.pages || [
                                {
                                  pageNumber: 1,
                                  thumbnailUrl:
                                    doc.thumbnailUrl ||
                                    `${API_BASE_URL}${API_ENDPOINTS.processed}/${doc.filename}`,
                                },
                              ]
                            }))
                          : []
                      }
                      previewSettings={{
                        layout: orchestrateOptions.printLayout,
                        scale: parseInt(orchestrateOptions.printScale),
                        paperSize: orchestrateOptions.printPaperSize,
                        colorMode: orchestrateOptions.printColorMode,
                      }}
                      activeDocIndex={previewControl.docIndex}
                      activePage={previewControl.page}
                      focusToken={previewControl.token}
                      highlightSource={previewControl.source}
                      onRequestDocChange={nextIndex =>
                        bumpPreviewFocus({ docIndex: nextIndex, page: 1, source: 'manual' })
                      }
                      onRequestPageChange={nextPage =>
                        bumpPreviewFocus({ page: nextPage, source: 'manual' })
                      }
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
                          {convertedFiles.map((file: any, index: number) => {
                            const convertedIndex = index + 1;
                            return (
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
                                    #{convertedIndex} · {file.filename} ({(file.size / 1024).toFixed(2)} KB)
                                  </Checkbox>
                                </Box>
                            );
                          })}
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
            </Box>
          </Flex>
        </MotionModalContent>
      </Modal>

      {/* Document Selector Modal */}
      <DocumentSelector
        ref={documentSelectorRef}
        isOpen={documentSelectorModal.isOpen}
        onClose={documentSelectorModal.onClose}
        onSelect={async (docs) => {
          // Enhance documents with page information before setting
          const enhancedDocs = await enhanceDocumentsWithPages(docs);
          setSelectedDocuments(enhancedDocs);
          if (enhancedDocs.length > 0) {
            bumpPreviewFocus({ docIndex: 0, page: 1, source: 'manual' });
          }
          documentSelectorModal.onClose();
        }}
        currentDocuments={currentDocumentOptions}
        convertedDocuments={convertedDocumentOptions}
        allowMultiple={true}
        mode={orchestrateMode || 'print'}
      />
        </DashboardShell>
      </PageShell>

      {/* Connectivity Status Modal */}
      <Modal
        isOpen={connectivityModal.isOpen}
        onClose={connectivityModal.onClose}
        size="lg"
        isCentered
      >
        <ModalOverlay backdropFilter="blur(4px)" />
        <MotionModalContent
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          bg={systemModalBgGradient}
          borderRadius="2xl"
          border="1px solid"
          borderColor="rgba(121,95,238,0.2)"
          boxShadow="0 20px 60px rgba(0,0,0,0.3)"
        >
          <ModalHeader
            fontSize="xl"
            fontWeight="bold"
            display="flex"
            alignItems="center"
            gap={2}
            pb={2}
          >
            <Iconify icon={FiActivity} boxSize={5} color="brand.400" />
            System Status
          </ModalHeader>
          <ModalCloseButton colorScheme="brand" size="md" top={3} right={3} />

          <ModalBody py={4}>
            <Box
              bg={validatorBoxBg}
              backdropFilter="blur(10px)"
              borderRadius="xl"
              p={4}
              border="1px solid"
              borderColor="rgba(121,95,238,0.15)"
            >
              <ConnectionValidator
                ref={connectionStatusRef}
                variant="minimal"
                autoRun={true}
                onStatusComplete={(allConnected) => {
                  if (allConnected) {
                    toast({
                      title: '✅ All Systems Connected',
                      description: 'PrintChakra is ready to go!',
                      status: 'success',
                      duration: 3000,
                      isClosable: true,
                    });
                  }
                }}
              />
            </Box>
          </ModalBody>

          <ModalFooter pt={2} pb={4}>
            <HStack spacing={3} w="100%">
              <Button
                variant="ghost"
                flex={1}
                onClick={connectivityModal.onClose}
                colorScheme="gray"
                size="sm"
              >
                Close
              </Button>
              <Button
                colorScheme="brand"
                flex={1}
                size="sm"
                leftIcon={<Iconify icon={FiRefreshCw} />}
                onClick={() => {
                  connectionStatusRef.current?.runCheck();
                }}
              >
                Re-check
              </Button>
            </HStack>
          </ModalFooter>
        </MotionModalContent>
      </Modal>

      {/* AI Chat Sidebar - Independent Fixed Position */}
      {isChatVisible && (
        <Box
          position="fixed"
          top="0"
          right="0"
          w={{ base: '100%', lg: '35vw' }}
          h="100vh"
          bg={chatSidebarBg}
          boxShadow="-4px 0 16px rgba(0,0,0,0.3)"
          display="flex"
          flexDirection="column"
          borderLeft="1px solid"
          borderColor={chatSidebarBorderColor}
          overflowY="auto"
          zIndex={2000}
          transition="transform 0.3s ease-out"
        >
          <VoiceAIChat
            isOpen={isChatVisible}
            onClose={handleDockedChatClose}
            onOrchestrationTrigger={handleVoiceOrchestrationTrigger}
            isMinimized={false}
            onToggleMinimize={handleDockedChatClose}
            onVoiceCommand={handleVoiceCommand}
          />
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
