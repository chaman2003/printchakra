import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../apiClient';
import { useSocket } from '../context/SocketContext';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Grid,
  Heading,
  Stack,
  Spinner,
  Switch,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  FiAlertTriangle,
  FiAperture,
  FiCamera,
  FiCheckCircle,
  FiCpu,
  FiEye,
  FiEyeOff,
  FiMaximize2,
  FiMinimize2,
  FiUpload,
  FiWifi,
} from 'react-icons/fi';
import {
  API_BASE_URL,
  API_ENDPOINTS,
  SOCKET_CONFIG,
  SOCKET_IO_ENABLED,
  getDefaultHeaders,
} from '../config';
import { Iconify, ConnectionValidator } from '../components/common';

interface QualityCheck {
  blur_score: number;
  is_blurry: boolean;
  focus_score: number;
  is_focused: boolean;
  quality: {
    overall_acceptable: boolean;
    issues: string[];
    recommendations: string[];
  };
}

const Phone: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [qualityCheck, setQualityCheck] = useState<QualityCheck | null>(null);
  const [validateQuality, setValidateQuality] = useState(true);
  const [processingOptions, setProcessingOptions] = useState({
    autoCrop: true,
    aiEnhance: true,
    strictQuality: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCaptureCount, setAutoCaptureCount] = useState(0);
  const autoCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [showConnectionValidator, setShowConnectionValidator] = useState(false);
  const [frameChangeStatus, setFrameChangeStatus] = useState<'waiting' | 'detecting' | 'ready' | 'captured'>('waiting');
  
  // Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    blob: Blob;
    filename: string;
    options: typeof processingOptions;
  }>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const toast = useToast();
  
  // Frame comparison based auto-capture (no API calls for detection)
  const lastCapturedImageDataRef = useRef<ImageData | null>(null);
  const lastFrameImageDataRef = useRef<ImageData | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const stableFrameCountRef = useRef<number>(0);
  const comparisonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Theme values with insane visual enhancements
  const panelBg = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  const muted = useColorModeValue('gray.600', 'whiteAlpha.700');

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  }, []);

  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      try {
        if (cameraContainerRef.current?.requestFullscreen) {
          await cameraContainerRef.current.requestFullscreen();
          setIsFullScreen(true);
          // Show connection validator after entering fullscreen
          setTimeout(() => {
            setShowConnectionValidator(true);
          }, 500);
        }
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Initialize comparison canvas on mount
  useEffect(() => {
    comparisonCanvasRef.current = document.createElement('canvas');
    return () => {
      comparisonCanvasRef.current = null;
    };
  }, []);

  // Compare two ImageData objects and return difference percentage (0-100)
  const compareFrames = (frame1: ImageData, frame2: ImageData): number => {
    if (frame1.width !== frame2.width || frame1.height !== frame2.height) {
      console.warn(`Frame size mismatch: ${frame1.width}x${frame1.height} vs ${frame2.width}x${frame2.height}`);
      return 100; // Different sizes = completely different
    }
    
    if (frame1.data.length === 0 || frame2.data.length === 0) {
      console.warn('Empty frame data detected');
      return 100; // Empty = treat as different
    }
    
    const data1 = frame1.data;
    const data2 = frame2.data;
    let diffCount = 0;
    const pixelCount = data1.length / 4;
    
    // Sample every 4th pixel for performance (still accurate enough)
    for (let i = 0; i < data1.length; i += 16) {
      const r1 = data1[i], g1 = data1[i + 1], b1 = data1[i + 2];
      const r2 = data2[i], g2 = data2[i + 1], b2 = data2[i + 2];
      
      // Calculate color distance
      const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
      
      // Threshold for considering a pixel as "different"
      if (diff > 60) {
        diffCount++;
      }
    }
    
    // Return percentage of different pixels
    return (diffCount / (pixelCount / 4)) * 100;
  };

  // Get current frame as ImageData (scaled down for comparison)
  const getCurrentFrameData = (): ImageData | null => {
    try {
      if (!videoRef.current || !comparisonCanvasRef.current) return null;
      
      const video = videoRef.current;
      const canvas = comparisonCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx || !video.videoWidth || video.paused || video.ended) {
        if (video.paused) {
          console.warn('Video paused - attempting resume...');
          video.play().catch(e => console.warn('Resume failed:', e));
        }
        return null;
      }
      
      // Use small size for fast comparison (160x120)
      canvas.width = 160;
      canvas.height = 120;
      
      try {
        ctx.drawImage(video, 0, 0, 160, 120);
      } catch (drawError) {
        console.warn('Frame draw error:', drawError);
        return null;
      }
      
      const imageData = ctx.getImageData(0, 0, 160, 120);
      
      // Validate frame data
      if (!imageData || !imageData.data || imageData.data.length === 0) {
        console.warn('Invalid frame data');
        return null;
      }
      
      return imageData;
    } catch (error) {
      console.error('getCurrentFrameData error:', error);
      return null;
    }
  };

  // Start continuous auto-capture mode with frame comparison
  const startAutoCapture = () => {
    setAutoCapture(true);
    setAutoCaptureCount(0);
    lastCapturedImageDataRef.current = null;
    lastFrameImageDataRef.current = null;
    stableFrameCountRef.current = 0;
    setFrameChangeStatus('waiting');
    
    // Start frame comparison loop
    startFrameComparisonLoop();
    
    toast({
      title: 'Auto-Capture Enabled',
      description: 'Place documents one by one. Each new document will be captured automatically.',
      status: 'info',
      duration: 3000,
    });
  };

  // Stop continuous auto-capture mode
  const stopAutoCapture = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    setAutoCapture(false);
    setFrameChangeStatus('waiting');
    lastCapturedImageDataRef.current = null;
    lastFrameImageDataRef.current = null;
    stableFrameCountRef.current = 0;
    
    if (autoCaptureCount > 0) {
      toast({
        title: 'Auto-Capture Stopped',
        description: `Captured ${autoCaptureCount} document(s)`,
        status: 'success',
        duration: 3000,
      });
    }
  }, [autoCaptureCount, toast]);

  // Process upload queue
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingQueue || uploadQueue.length === 0) return;
      
      setIsProcessingQueue(true);
      const item = uploadQueue[0];
      
      try {
        const formData = new FormData();
        formData.append('file', item.blob, item.filename);
        formData.append('auto_crop', item.options.autoCrop.toString());
        formData.append('ai_enhance', item.options.aiEnhance.toString());
        formData.append('strict_quality', item.options.strictQuality.toString());

        await apiClient.post(API_ENDPOINTS.upload, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        
        toast({
          title: 'Upload complete',
          description: `${item.filename} processed`,
          status: 'success',
          duration: 2000,
          isClosable: true,
          position: 'top-right',
        });
      } catch (err) {
        console.error('Queue upload failed:', err);
        toast({
          title: 'Upload failed',
          description: 'Failed to upload image',
          status: 'error',
          duration: 3000,
          position: 'top-right',
        });
      } finally {
        setUploadQueue(prev => prev.slice(1));
        setIsProcessingQueue(false);
      }
    };
    
    processQueue();
  }, [uploadQueue, isProcessingQueue, toast]);

  // Ref to hold latest captureInBackground function to avoid stale closures in interval
  const captureInBackgroundRef = useRef<(() => Promise<void>) | null>(null);
  
  const startAsyncUpload = useCallback((blob: Blob, filename: string, optionsSnapshot: typeof processingOptions) => {
    // Add to queue instead of immediate upload
    setUploadQueue(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      blob,
      filename,
      options: optionsSnapshot
    }]);

    setAutoCaptureCount(prev => prev + 1);

    toast({
      title: '📸 Added to Queue',
      description: 'Processing in background...',
      status: 'info',
      duration: 1000,
      position: 'top',
    });
  }, [toast]);

  // Background capture without freezing camera
  const captureInBackground = useCallback(async () => {
    if (isCapturingRef.current || !videoRef.current || !canvasRef.current) return;
    
    isCapturingRef.current = true;
    setFrameChangeStatus('captured');
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context || !video.videoWidth || video.videoWidth === 0) {
        console.warn('Video not ready for capture, skipping...');
        setFrameChangeStatus('waiting');
        return;
      }
      
      // Capture full resolution frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Store the captured frame for comparison
      const capturedFrame = getCurrentFrameData();
      if (capturedFrame) {
        lastCapturedImageDataRef.current = capturedFrame;
      }
      
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => resolve(b),
          'image/jpeg',
          0.9
        );
      });
      
      if (!blob) {
        console.warn('Failed to create blob from canvas');
        setFrameChangeStatus('waiting');
        return;
      }

      const filename = `auto_capture_${Date.now()}.jpg`;
      const optionsSnapshot = { ...processingOptions };

      // Kick off upload without blocking future captures
      startAsyncUpload(blob, filename, optionsSnapshot);
      
      // Reset frame tracking so next document can be detected immediately
      stableFrameCountRef.current = 0;
      lastFrameImageDataRef.current = null;
      setFrameChangeStatus('waiting');
      
    } catch (err) {
      console.error('Background capture error:', err);
      lastCapturedImageDataRef.current = null;
      setFrameChangeStatus('waiting');
    } finally {
      // Allow next capture immediately (uploads continue async)
      isCapturingRef.current = false;
    }
  }, [processingOptions, startAsyncUpload]);

  // Keep ref updated with latest captureInBackground
  useEffect(() => {
    captureInBackgroundRef.current = captureInBackground;
  }, [captureInBackground]);

  // Main frame comparison loop - runs every 500ms
  const startFrameComparisonLoop = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
    }
    
    autoCaptureIntervalRef.current = setInterval(() => {
      try {
        if (isCapturingRef.current || !videoRef.current) return;
        
        // Check if video stream is still active
        const video = videoRef.current;
        if (!video.videoWidth || video.videoWidth === 0 || video.paused || video.ended) {
          if (video.paused) {
            console.debug('Video paused - attempting resume...');
            video.play().catch(e => console.warn('Auto-resume failed:', e));
          }
          return;
        }
        
        const currentFrame = getCurrentFrameData();
        if (!currentFrame) return;
        
        // First capture: no previous frame to compare
        if (!lastCapturedImageDataRef.current) {
          // Wait for document to be stable for 3 consecutive frames
          if (lastFrameImageDataRef.current) {
            const frameDiff = compareFrames(currentFrame, lastFrameImageDataRef.current);
            
            if (frameDiff < 5) {
              // Frame is stable (< 5% change)
              stableFrameCountRef.current++;
              setFrameChangeStatus('detecting');
              
              if (stableFrameCountRef.current >= 3) {
                // Stable for 1.5 seconds - capture first document
                console.log('📷 First document stable - capturing...');
                captureInBackgroundRef.current?.();
                // Reset stability counter after capture to prevent double capture
                stableFrameCountRef.current = 0;
              }
            } else {
              // Frame changed, reset stability counter
              stableFrameCountRef.current = 0;
              setFrameChangeStatus('waiting');
            }
          }
          
          lastFrameImageDataRef.current = currentFrame;
          return;
        }
        
        // Compare current frame with last CAPTURED frame
        const diffFromCaptured = compareFrames(currentFrame, lastCapturedImageDataRef.current);
        
        // Also compare with previous frame to detect stability
        const diffFromLastFrame = lastFrameImageDataRef.current 
          ? compareFrames(currentFrame, lastFrameImageDataRef.current) 
          : 100;
        
        // Document changed significantly from captured (> 25% difference)
        // AND current frame is stable (< 5% change from previous frame)
        if (diffFromCaptured > 25) {
          // New document detected
          if (diffFromLastFrame < 5) {
            // And it's stable
            stableFrameCountRef.current++;
            setFrameChangeStatus('ready');
            
            if (stableFrameCountRef.current >= 3) {
              // New stable document - capture it!
              console.log(`📷 New document detected (${diffFromCaptured.toFixed(1)}% different) - capturing...`);
              captureInBackgroundRef.current?.();
              // Reset stability counter after capture
              stableFrameCountRef.current = 0;
            }
          } else {
            // Document still moving
            stableFrameCountRef.current = 0;
            setFrameChangeStatus('detecting');
          }
        } else {
          // Same document as before
          stableFrameCountRef.current = 0;
          setFrameChangeStatus('waiting');
        }
        
        lastFrameImageDataRef.current = currentFrame;
        
      } catch (error) {
        console.error('Frame comparison loop error:', error);
        // Continue loop even on error - don't stop the interval
      }
    }, 500); // Check every 500ms
  }, []);

  const startCamera = async () => {
    try {
      // Request 3:4 aspect ratio (portrait mode for documents)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1440 },  // 3:4 aspect ratio
          aspectRatio: { ideal: 3/4 },
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      alert('Failed to access camera: ' + (err as Error).message);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
    }
    // Stop auto-capture if running
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    setAutoCapture(false);
  }, [stream]);

  const handleCaptureMode = (mode: 'file' | 'camera') => {
    setCaptureMode(mode);
    setPreviewImage(null);
    setQualityCheck(null);
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const checkImageQuality = useCallback(
    async (file: Blob): Promise<QualityCheck | null> => {
      if (!validateQuality) return null;

      try {
        const formData = new FormData();
        formData.append('file', file, 'temp.jpg');

        const response = await apiClient.post(API_ENDPOINTS.validateQuality, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const quality: QualityCheck = response.data;
        setQualityCheck(quality);

        // Show warnings if quality issues detected
        if (!quality.quality.overall_acceptable) {
          const warnings = quality.quality.issues.join('\n');
          const confirm = window.confirm(
            `⚠️ Quality Issues Detected:\n\n${warnings}\n\nRecommendations:\n${quality.quality.recommendations.join('\n')}\n\nDo you want to upload anyway?`
          );
          if (!confirm) {
            return null;
          }
        } else {
          showMessage(
            `✓ Quality: Blur ${quality.blur_score.toFixed(1)}, Focus ${quality.focus_score.toFixed(1)}`
          );
        }

        return quality;
      } catch (err: any) {
        console.error('Quality check failed:', err);
        // Handle service unavailable error gracefully
        if (err.response?.status === 503) {
          showMessage('⚠️ Quality check service unavailable - uploading without validation');
          console.warn('Quality validation service is unavailable (503)');
        } else {
          showMessage('⚠️ Quality check failed - uploading without validation');
        }
        return null; // Continue without quality check on error
      }
    },
    [showMessage, validateQuality]
  );

  const uploadImage = useCallback(
    async (file: Blob, filename: string) => {
      // Add to queue instead of blocking upload
      setUploadQueue(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        blob: file,
        filename,
        options: { ...processingOptions }
      }]);

      showMessage(`✅ Added to processing queue`);
      toast({
        title: 'Queued for processing',
        description: 'You can continue capturing.',
        status: 'success',
        duration: 2000,
      });
      
      // Show additional message about checking dashboard
      if (uploadQueue.length === 0) {
        setTimeout(() => {
          showMessage(
            '📊 Processing in background... Check Dashboard for results.'
          );
        }, 1500);
      }

      // Clear quality check
      setQualityCheck(null);
    },
    [
      processingOptions,
      showMessage,
      toast,
      uploadQueue.length
    ]
  );

  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob: Blob | null) => {
        if (blob) {
          // NOTE: We do NOT set previewImage here to allow continuous capture
          // setPreviewImage(url);

          // Check quality before uploading (optional - could be skipped for speed)
          if (validateQuality) {
            const quality = await checkImageQuality(blob);
            if (
              quality === null &&
              qualityCheck &&
              !qualityCheck.quality.overall_acceptable
            ) {
              // If quality check failed and user cancelled, stop.
              return;
            }
          }

          uploadImage(blob, `capture_${Date.now()}.jpg`);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [checkImageQuality, qualityCheck, uploadImage, validateQuality]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewImage(url);

    // Check quality before uploading
    const quality = await checkImageQuality(file);
    if (
      quality === null &&
      validateQuality &&
      qualityCheck &&
      !qualityCheck.quality.overall_acceptable
    ) {
      setPreviewImage(null);
      return;
    }

    uploadImage(file, file.name);
  };

  // Use shared Socket from context instead of creating new connections
  const { socket, connected: socketConnected } = useSocket();

  useEffect(() => {
    // Sync local connected state with socket context
    setConnected(socketConnected);
  }, [socketConnected]);

  useEffect(() => {
    console.log('Setting up Socket.IO event listeners');

    if (!socket) {
      return;
    }

    socket.on('capture_now', (data: any) => {
      console.log('Received capture command:', data);
      showMessage('📸 Capture triggered from Dashboard!');
      setTimeout(() => {
        if (captureMode === 'camera' && stream) {
          captureFromCamera();
        } else {
          showMessage('💡 Switch to Camera mode to auto-capture');
        }
      }, 500);
    });

    return () => {
      socket.off('capture_now');
      // Do NOT stop camera here, as this effect re-runs when uploadQueue changes
      stopAutoCapture();
    };
  }, [
    socket,
    captureFromCamera,
    captureMode,
    showMessage,
    stopAutoCapture,
    stream,
  ]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <VStack align="stretch" spacing={10} pb={16}>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={6}>
        <Stack spacing={2}>
          <Heading size="lg" display="flex" alignItems="center" gap={3}>
            📱 Phone Interface
          </Heading>
          <Text color={muted} maxW="lg">
            Deploy the mobile capture cockpit to ingest pristine documents with AI guidance.
          </Text>
        </Stack>
        <Flex
          align="center"
          gap={3}
          bg="surface.blur"
          borderRadius="full"
          border="1px solid rgba(121,95,238,0.22)"
          px={5}
          py={2}
        >
          <Box
            w={3}
            h={3}
            borderRadius="full"
            bg={connected ? 'green.400' : 'red.400'}
            boxShadow={`0 0 12px ${connected ? 'rgba(72,187,120,0.6)' : 'rgba(245,101,101,0.6)'}`}
          />
          <Text fontWeight="600" color={muted} display="flex" alignItems="center" gap={2}>
            <Iconify icon={FiWifi} boxSize={5} />
            {connected ? 'Connected to processing hub' : 'Link offline'}
          </Text>
        </Flex>
        
        {/* Queue Indicator */}
        {(uploadQueue.length > 0 || isProcessingQueue) && (
          <Flex
            align="center"
            gap={2}
            bg="blue.500"
            color="white"
            borderRadius="full"
            px={4}
            py={2}
            boxShadow="0 0 12px rgba(66, 153, 225, 0.6)"
            animation="pulse 2s infinite"
          >
            <Spinner size="xs" />
            <Text fontWeight="bold" fontSize="sm">
              Processing: {uploadQueue.length + (isProcessingQueue ? 1 : 0)}
            </Text>
          </Flex>
        )}
      </Flex>

      {message && (
        <Alert
          status="info"
          borderRadius="xl"
          bg="rgba(69,202,255,0.1)"
          border="1px solid rgba(69,202,255,0.25)"
        >
          <AlertIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card bg={panelBg} border="1px solid rgba(121,95,238,0.18)" boxShadow="subtle">
        <CardHeader>
          <Heading size="sm">Capture Preferences</Heading>
        </CardHeader>
        <CardBody>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
            <Flex
              align="center"
              justify="space-between"
              bg="surface.blur"
              borderRadius="lg"
              px={4}
              py={3}
              border="1px solid rgba(69,202,255,0.18)"
            >
              <Stack spacing={1}>
                <Text fontWeight="600">Quality validation</Text>
                <Text fontSize="sm" color={muted}>
                  Detect blur and focus issues before upload.
                </Text>
              </Stack>
              <Switch
                colorScheme="brand"
                isChecked={validateQuality}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setValidateQuality(e.target.checked)
                }
              />
            </Flex>

            <Flex
              align="center"
              justify="space-between"
              bg="surface.blur"
              borderRadius="lg"
              px={4}
              py={3}
              border="1px solid rgba(69,202,255,0.18)"
            >
              <Stack spacing={1}>
                <Text fontWeight="600">Auto crop</Text>
                <Text fontSize="sm" color={muted}>
                  Automatically align document edges.
                </Text>
              </Stack>
              <Switch
                colorScheme="brand"
                isChecked={processingOptions.autoCrop}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProcessingOptions({ ...processingOptions, autoCrop: e.target.checked })
                }
              />
            </Flex>

            <Flex
              align="center"
              justify="space-between"
              bg="surface.blur"
              borderRadius="lg"
              px={4}
              py={3}
              border="1px solid rgba(69,202,255,0.18)"
            >
              <Stack spacing={1}>
                <Text fontWeight="600">AI enhancement</Text>
                <Text fontSize="sm" color={muted}>
                  Boost clarity with AI-driven retouching.
                </Text>
              </Stack>
              <Switch
                colorScheme="brand"
                isChecked={processingOptions.aiEnhance}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setProcessingOptions({ ...processingOptions, aiEnhance: e.target.checked })
                }
              />
            </Flex>
          </Grid>
        </CardBody>
      </Card>

      {qualityCheck && (
        <Card
          bg={panelBg}
          border={`1px solid ${qualityCheck.quality.overall_acceptable ? 'rgba(72,187,120,0.25)' : 'rgba(246,173,85,0.35)'}`}
          boxShadow="subtle"
        >
          <CardHeader display="flex" alignItems="center" justifyContent="space-between">
            <Heading size="sm" display="flex" alignItems="center" gap={2}>
              <Iconify
                icon={qualityCheck.quality.overall_acceptable ? FiCheckCircle : FiAlertTriangle}
                boxSize={5}
              />
              Quality Analysis
            </Heading>
            <Tag
              colorScheme={qualityCheck.quality.overall_acceptable ? 'green' : 'orange'}
              borderRadius="full"
            >
              {qualityCheck.quality.overall_acceptable ? 'Ready to upload' : 'Review suggested'}
            </Tag>
          </CardHeader>
          <CardBody>
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4} mb={4}>
              <Flex
                direction="column"
                bg="surface.blur"
                borderRadius="lg"
                p={3}
                border="1px solid rgba(69,202,255,0.22)"
              >
                <Text fontSize="xs" textTransform="uppercase" color={muted}>
                  Blur score
                </Text>
                <Text fontWeight="700">{qualityCheck.blur_score.toFixed(1)}</Text>
                <Text fontSize="sm" color={qualityCheck.is_blurry ? 'orange.300' : 'green.300'}>
                  {qualityCheck.is_blurry ? 'Requires attention' : 'Crystal clear'}
                </Text>
              </Flex>
              <Flex
                direction="column"
                bg="surface.blur"
                borderRadius="lg"
                p={3}
                border="1px solid rgba(69,202,255,0.22)"
              >
                <Text fontSize="xs" textTransform="uppercase" color={muted}>
                  Focus score
                </Text>
                <Text fontWeight="700">{qualityCheck.focus_score.toFixed(1)}</Text>
                <Text fontSize="sm" color={qualityCheck.is_focused ? 'green.300' : 'orange.300'}>
                  {qualityCheck.is_focused ? 'Focused' : 'Adjust focus'}
                </Text>
              </Flex>
            </Grid>

            {qualityCheck.quality.issues.length > 0 && (
              <Stack spacing={2}>
                <Text fontWeight="600">Detected issues</Text>
                {qualityCheck.quality.issues.map((issue: string, index: number) => (
                  <Flex
                    key={index}
                    align="center"
                    gap={2}
                    bg="rgba(246,173,85,0.1)"
                    borderRadius="md"
                    px={3}
                    py={2}
                  >
                    <Iconify icon={FiAlertTriangle} color="orange.300" />
                    <Text color={muted}>{issue}</Text>
                  </Flex>
                ))}
              </Stack>
            )}
          </CardBody>
        </Card>
      )}

      <Card bg={panelBg} border="1px solid rgba(121,95,238,0.18)">
        <CardBody>
          <Stack spacing={8}>
            <ButtonGroup isAttached variant="ghost" alignSelf="center">
              <Button
                leftIcon={<Iconify icon={FiUpload} boxSize={5} />}
                colorScheme={captureMode === 'file' ? 'brand' : undefined}
                onClick={() => handleCaptureMode('file')}
              >
                Choose File
              </Button>
              <Button
                leftIcon={<Iconify icon={FiCamera} boxSize={5} />}
                colorScheme={captureMode === 'camera' ? 'brand' : undefined}
                onClick={() => handleCaptureMode('camera')}
              >
                Live Camera
              </Button>
            </ButtonGroup>

            {captureMode === 'file' ? (
              <Stack spacing={4} align="center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,image/jpeg,image/jpg,image/png"
                  capture="environment"
                  style={{ display: 'none' }}
                />
                <Button
                  size="lg"
                  colorScheme="brand"
                  leftIcon={<Iconify icon={FiUpload} boxSize={5} />}
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={uploading}
                  loadingText="Uploading"
                >
                  Select Image
                </Button>
                <Text fontSize="sm" color={muted} textAlign="center">
                  Upload an existing document or snap a fresh capture from your device.
                </Text>
              </Stack>
            ) : (
              <Stack spacing={6}>
                <Box
                  ref={cameraContainerRef}
                  position="relative"
                  borderRadius="2xl"
                  overflow="hidden"
                  border="1px solid rgba(69,202,255,0.25)"
                  boxShadow="halo"
                  className="camera-container-normal"
                  sx={{
                    // Fixed stable size for camera preview
                    aspectRatio: '3 / 4',
                    height: isFullScreen ? '100vh' : '500px',
                    width: isFullScreen ? '100%' : 'auto',
                    maxWidth: isFullScreen ? '100%' : '375px',
                    minWidth: isFullScreen ? '100%' : '300px',
                    mx: 'auto',
                  }}
                >
                  <Box position="relative" bg="black" width="100%" height="100%">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    
                    {/* Center guide line */}
                    <Box
                      position="absolute"
                      left="50%"
                      top="10%"
                      transform="translateX(-50%)"
                      h="80%"
                      borderLeft="1px dashed rgba(255,255,255,0.35)"
                    />

                    {/* Eye Toggle Button - Top Right */}
                    <Tooltip
                      label={showControls ? 'Hide controls' : 'Show controls'}
                      hasArrow
                      placement="left"
                    >
                      <Button
                        position="absolute"
                        top={4}
                        right={4}
                        size="sm"
                        colorScheme="brand"
                        variant={showControls ? 'solid' : 'outline'}
                        onClick={() => setShowControls(!showControls)}
                        zIndex={10}
                        borderRadius="full"
                        p={2}
                        minWidth="auto"
                      >
                        <Iconify icon={showControls ? FiEye : FiEyeOff} boxSize={5} />
                      </Button>
                    </Tooltip>

                    {/* Auto-capture status indicator */}
                    {autoCapture && (
                      <Box
                        position="absolute"
                        top={4}
                        left={4}
                        bg={
                          frameChangeStatus === 'captured' ? 'rgba(34,197,94,0.8)' :
                          frameChangeStatus === 'ready' ? 'rgba(34,197,94,0.5)' :
                          frameChangeStatus === 'detecting' ? 'rgba(245,158,11,0.5)' :
                          'rgba(100,100,100,0.5)'
                        }
                        border={`2px solid ${
                          frameChangeStatus === 'captured' ? 'rgb(34,197,94)' :
                          frameChangeStatus === 'ready' ? 'rgb(34,197,94)' :
                          frameChangeStatus === 'detecting' ? 'rgb(245,158,11)' :
                          'rgb(150,150,150)'
                        }`}
                        borderRadius="lg"
                        px={3}
                        py={1}
                        color="white"
                        fontSize="sm"
                        fontWeight="bold"
                      >
                        {frameChangeStatus === 'captured' ? '✓ Captured!' :
                         frameChangeStatus === 'ready' ? '📸 Ready...' :
                         frameChangeStatus === 'detecting' ? '👀 Detecting...' :
                         `📷 ${autoCaptureCount} captured`}
                      </Box>
                    )}

                    {/* Full-screen controls */}
                    {isFullScreen && showControls && (
                      <VStack
                        position="absolute"
                        bottom={6}
                        left="50%"
                        transform="translateX(-50%)"
                        spacing={3}
                        zIndex={5}
                        animation="slideUp 0.3s ease-out"
                      >
                        <Tooltip
                          label={
                            autoCapture
                              ? `Captured ${autoCaptureCount} documents - Place next document`
                              : 'Enable continuous auto-capture for multiple documents'
                          }
                          hasArrow
                        >
                          <Button
                            colorScheme={autoCapture ? 'green' : 'brand'}
                            size="lg"
                            onClick={autoCapture ? stopAutoCapture : startAutoCapture}
                            isDisabled={!stream || uploading}
                            leftIcon={<Iconify icon={FiAperture} boxSize={5} />}
                            minW="160px"
                          >
                            {autoCapture ? `Stop (${autoCaptureCount})` : 'Auto Capture'}
                          </Button>
                        </Tooltip>
                        <Tooltip label="Capture instantly" hasArrow>
                          <Button
                            colorScheme="brand"
                            size="lg"
                            onClick={captureFromCamera}
                            isDisabled={!stream || uploading || autoCapture}
                            isLoading={uploading}
                            loadingText="Uploading"
                            leftIcon={<Iconify icon={FiCamera} boxSize={5} />}
                            minW="160px"
                          >
                            Capture
                          </Button>
                        </Tooltip>
                      </VStack>
                    )}
                  </Box>
                </Box>

                {/* Controls - Hidden in fullscreen, shown in normal mode */}
                {!isFullScreen && showControls && (
                  <Flex wrap="wrap" gap={3}>
                    <Tooltip label="Capture instantly" hasArrow>
                      <Button
                        colorScheme="brand"
                        leftIcon={<Iconify icon={FiCamera} boxSize={5} />}
                        onClick={captureFromCamera}
                        isDisabled={!stream || uploading || autoCapture}
                        isLoading={uploading}
                        loadingText="Uploading"
                      >
                        Capture
                      </Button>
                    </Tooltip>
                    <Tooltip label="Continuous auto-capture for stacked documents" hasArrow>
                      <Button
                        variant={autoCapture ? 'solid' : 'outline'}
                        colorScheme={autoCapture ? 'green' : 'orange'}
                        onClick={autoCapture ? stopAutoCapture : startAutoCapture}
                        isDisabled={!stream || uploading}
                        leftIcon={<Iconify icon={FiAperture} boxSize={5} />}
                      >
                        {autoCapture ? `Stop (${autoCaptureCount})` : 'Auto Capture'}
                      </Button>
                    </Tooltip>
                    <Tooltip
                      label={isFullScreen ? 'Exit fullscreen' : 'Fullscreen capture mode'}
                      hasArrow
                    >
                      <Button
                        variant="outline"
                        colorScheme="brand"
                        onClick={toggleFullScreen}
                        isDisabled={!stream}
                        leftIcon={
                          <Iconify icon={isFullScreen ? FiMinimize2 : FiMaximize2} boxSize={5} />
                        }
                      >
                        {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </Button>
                    </Tooltip>
                  </Flex>
                )}

                {/* Auto-Capture Status */}
                {autoCapture && showControls && (
                  <Flex
                    align="center"
                    gap={3}
                    bg="surface.blur"
                    borderRadius="lg"
                    border="1px solid rgba(69,202,255,0.2)"
                    px={4}
                    py={3}
                  >
                    <Iconify icon={FiCpu} color="brand.300" />
                    <Stack spacing={0}>
                      <Text fontWeight="600">
                        {frameChangeStatus === 'ready' ? '📸 New document detected - capturing...' :
                         frameChangeStatus === 'detecting' ? '👀 Waiting for stable document...' :
                         frameChangeStatus === 'captured' ? '✓ Just captured! Place next document.' :
                         `📷 Captured ${autoCaptureCount} documents`}
                      </Text>
                      <Text fontSize="sm" color={muted}>
                        Place each document in view • Auto-captures when stable
                      </Text>
                    </Stack>
                  </Flex>
                )}
              </Stack>
            )}

            {previewImage && (
              <Stack spacing={3}>
                <Heading size="sm">Preview</Heading>
                <Box
                  borderRadius="2xl"
                  overflow="hidden"
                  border="1px solid rgba(69,202,255,0.25)"
                  boxShadow="subtle"
                >
                  <img
                    src={previewImage}
                    alt="Preview"
                    style={{ width: '100%', display: 'block' }}
                  />
                </Box>
              </Stack>
            )}

            <Stack spacing={3}>
              <Heading size="sm">How it works</Heading>
              <Stack spacing={2} color={muted} fontSize="sm">
                <Text>1. Choose between live capture or file upload for your documents.</Text>
                <Text>2. Enable quality validation to enforce blur and focus standards.</Text>
                <Text>3. Leverage auto-detection to align documents before sending.</Text>
                <Text>4. Once captured, files upload automatically to the Dashboard pipeline.</Text>
                <Text>5. Monitor processing progress and results in the Dashboard experience.</Text>
              </Stack>
            </Stack>
          </Stack>
        </CardBody>
      </Card>
      {/* Connection Validator Modal */}
      <ConnectionValidator
        isOpen={showConnectionValidator}
        onClose={() => setShowConnectionValidator(false)}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
      />
    </VStack>
  );
};

export default Phone;
