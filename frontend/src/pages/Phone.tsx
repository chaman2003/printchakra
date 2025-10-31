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
import Iconify from '../components/Iconify';
import ConnectionValidator from '../components/ConnectionValidator';

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
  const [autoCaptureCountdown, setAutoCaptureCountdown] = useState(0);
  const autoCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [documentDetection, setDocumentDetection] = useState<any>(null);
  const [detectionActive, setDetectionActive] = useState(false);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [autoTriggerReady, setAutoTriggerReady] = useState(false);
  const autoTriggerCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [showConnectionValidator, setShowConnectionValidator] = useState(false);
  const toast = useToast();

  // Theme values with insane visual enhancements
  const panelBg = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  // const surfaceGlass = useColorModeValue('rgba(255,255,255,0.85)', 'rgba(20,24,45,0.75)');
  // const borderColor = useColorModeValue('brand.200', 'nebula.700');
  // const borderSubtle = useColorModeValue('brand.100', 'whiteAlpha.200');
  // const accentPrimary = useColorModeValue('brand.500', 'nebula.400');
  const muted = useColorModeValue('gray.600', 'whiteAlpha.700');
  // const textInverse = useColorModeValue('gray.800', 'whiteAlpha.900');
  // const hoverBg = useColorModeValue('brand.50', 'whiteAlpha.100');

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

  const startAutoCapture = () => {
    setAutoCapture(true);
    setAutoCaptureCountdown(3);
    setAutoTriggerReady(false);

    autoCaptureIntervalRef.current = setInterval(() => {
      setAutoCaptureCountdown((prev: number) => {
        if (prev <= 1) {
          if (autoCaptureIntervalRef.current) {
            clearInterval(autoCaptureIntervalRef.current);
            autoCaptureIntervalRef.current = null;
          }
          // Trigger capture when countdown reaches 0
          setTimeout(() => {
            captureFromCamera();
            setAutoCapture(false);
            setAutoTriggerReady(false);
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start real-time detection for smart auto-capture
    if (!detectionActive) {
      startRealTimeDetection();
    }
  };

  const stopAutoCapture = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    if (autoTriggerCountdownRef.current) {
      clearInterval(autoTriggerCountdownRef.current);
      autoTriggerCountdownRef.current = null;
    }
    setAutoCapture(false);
    setAutoCaptureCountdown(0);
    setAutoTriggerReady(false);
  }, []);

  const startRealTimeDetection = () => {
    if (!videoRef.current || !canvasOverlayRef.current) return;

    setDetectionActive(true);

    detectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasOverlayRef.current) return;

      const video = videoRef.current;
      const canvas = canvasOverlayRef.current;
      const context = canvas.getContext('2d');

      if (!context || !video.videoWidth) return;

      // Resize canvas to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame
      context.drawImage(video, 0, 0);

      // Get frame as blob
      canvas.toBlob(
        async (blob: Blob | null) => {
          if (!blob) return;

          try {
            // Send for detection
            const formData = new FormData();
            formData.append('file', blob, 'frame.jpg');

            const response = await apiClient.post('/detect/document', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (
              response.data.success &&
              response.data.corners &&
              response.data.corners.length > 0
            ) {
              setDocumentDetection(response.data);
              // Draw detection overlay
              drawDetectionOverlay(response.data);

              // Smart auto-trigger: if document is fully detected and autoCapture is enabled
              if (autoCapture && response.data.coverage && response.data.coverage >= 75) {
                // Document is well-positioned (at least 75% of screen)
                if (!autoTriggerReady) {
                  console.log('📸 Document detected! Ready to auto-capture...');
                  setAutoTriggerReady(true);

                  // Auto-trigger capture after 1 second if still aligned
                  autoTriggerCountdownRef.current = setTimeout(() => {
                    if (autoCapture && documentDetection && documentDetection.coverage >= 75) {
                      console.log('📷 Auto-capturing document...');
                      captureFromCamera();
                      setAutoCapture(false);
                      setAutoTriggerReady(false);
                    }
                  }, 1000);
                }
              } else if (
                autoTriggerReady &&
                (!response.data.coverage || response.data.coverage < 75)
              ) {
                // Document moved out of position
                setAutoTriggerReady(false);
                if (autoTriggerCountdownRef.current) {
                  clearInterval(autoTriggerCountdownRef.current);
                }
              }
            } else {
              // No document detected
              setAutoTriggerReady(false);
              if (autoTriggerCountdownRef.current) {
                clearInterval(autoTriggerCountdownRef.current);
              }
            }
          } catch (err) {
            // Silently fail for real-time detection
            console.error('Detection error:', err);
          }
        },
        'image/jpeg',
        0.7
      );
    }, 500); // Run detection every 500ms
  };

  const stopRealTimeDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setDetectionActive(false);
    setDocumentDetection(null);
  }, []);

  const drawDetectionOverlay = (detection: any) => {
    if (!canvasOverlayRef.current) return;

    const canvas = canvasOverlayRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear and redraw frame
    context.clearRect(0, 0, width, height);

    if (videoRef.current && videoRef.current.videoWidth) {
      context.drawImage(videoRef.current, 0, 0);
    }

    // Draw border (green)
    if (detection.corners && detection.corners.length === 4) {
      context.strokeStyle = '#00FF00';
      context.lineWidth = 3;
      context.beginPath();

      for (let i = 0; i < detection.corners.length; i++) {
        const corner = detection.corners[i];
        const x = (corner.x / 100) * width;
        const y = (corner.y / 100) * height;

        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }

      // Close the path
      const firstCorner = detection.corners[0];
      const firstX = (firstCorner.x / 100) * width;
      const firstY = (firstCorner.y / 100) * height;
      context.lineTo(firstX, firstY);
      context.stroke();

      // Draw corner points
      context.fillStyle = '#00FF00';
      context.strokeStyle = '#FFFFFF';
      context.lineWidth = 2;

      for (const corner of detection.corners) {
        const x = (corner.x / 100) * width;
        const y = (corner.y / 100) * height;

        // Draw circle
        context.beginPath();
        context.arc(x, y, 8, 0, 2 * Math.PI);
        context.fill();
        context.stroke();

        // Draw label
        context.fillStyle = '#00FF00';
        context.font = 'bold 12px Arial';
        context.fillText(corner.name, x + 15, y - 15);
      }

      // Draw coverage info
      if (detection.coverage !== undefined) {
        context.fillStyle = '#00FF00';
        context.font = 'bold 16px Arial';
        context.fillText(`Coverage: ${detection.coverage.toFixed(1)}%`, 20, 30);
      }
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
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
    stopRealTimeDetection();
  }, [stream, stopRealTimeDetection]);

  const handleCaptureMode = (mode: 'file' | 'camera') => {
    setCaptureMode(mode);
    setPreviewImage(null);
    setQualityCheck(null);
    if (mode === 'camera') {
      startCamera();
      // Start detection after camera starts
      setTimeout(() => startRealTimeDetection(), 500);
    } else {
      stopCamera();
      stopRealTimeDetection();
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
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file, filename);

        // Add processing options
        formData.append('auto_crop', processingOptions.autoCrop.toString());
        formData.append('ai_enhance', processingOptions.aiEnhance.toString());
        formData.append('strict_quality', processingOptions.strictQuality.toString());

        const response = await apiClient.post(API_ENDPOINTS.upload, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        showMessage(`✅ ${response.data.message || 'Upload successful'}`);
        toast({
          title: 'Upload successful',
          description: 'Document dispatched to the processing pipeline.',
          status: 'success',
          duration: 4000,
        });
        console.log('Upload response:', response.data);

        // Show additional message about checking dashboard
        setTimeout(() => {
          showMessage(
            '📊 Image is processing... Check the Dashboard in ~5-10 seconds to see the result!'
          );
        }, 1500);

        // Clear quality check after successful upload
        setQualityCheck(null);
      } catch (err: any) {
        console.error('Upload error:', err);
        const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
        showMessage(`❌ ${errorMsg}`);
        toast({
          title: 'Upload failed',
          description: errorMsg,
          status: 'error',
          duration: 4000,
        });
      } finally {
        setUploading(false);
      }
    },
    [
      processingOptions.aiEnhance,
      processingOptions.autoCrop,
      processingOptions.strictQuality,
      showMessage,
      toast,
    ]
  );

  const captureFromCamera = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(
      async (blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreviewImage(url);

          // Check quality before uploading
          const quality = await checkImageQuality(blob);
          if (
            quality === null &&
            validateQuality &&
            qualityCheck &&
            !qualityCheck.quality.overall_acceptable
          ) {
            setPreviewImage(null);
            return;
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
    console.log('🔌 Phone: Setting up Socket.IO event listeners');

    if (!socket) {
      console.log('⚠️ Socket not available yet');
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
      stopCamera();
      stopAutoCapture();
      stopRealTimeDetection();
    };
  }, [
    socket,
    captureFromCamera,
    captureMode,
    showMessage,
    stopAutoCapture,
    stopCamera,
    stopRealTimeDetection,
    stream,
  ]);

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
                >
                  <Box position="relative" bg="black" aspectRatio={3 / 4}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <canvas
                      ref={canvasOverlayRef}
                      style={{
                        display: detectionActive ? 'block' : 'none',
                        position: 'absolute',
                        inset: 0,
                      }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
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

                    {/* Auto-capture ready indicator */}
                    {autoTriggerReady && (
                      <Box
                        position="absolute"
                        top={4}
                        left={4}
                        bg="rgba(34,197,94,0.3)"
                        border="2px solid rgb(34,197,94)"
                        borderRadius="full"
                        p={2}
                        animation="pulse 0.5s infinite"
                        _before={{
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 'full',
                          border: '2px solid rgb(34,197,94)',
                          animation: 'pulse 1.5s infinite',
                        }}
                      >
                        <Box w={2} h={2} bg="green.400" borderRadius="full" />
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
                              ? `Auto capture in ${autoCaptureCountdown}s`
                              : 'Auto capture on document detection'
                          }
                          hasArrow
                        >
                          <Button
                            colorScheme={autoCapture ? 'orange' : 'brand'}
                            size="lg"
                            onClick={autoCapture ? stopAutoCapture : startAutoCapture}
                            isDisabled={!stream || uploading}
                            leftIcon={<Iconify icon={FiAperture} boxSize={5} />}
                            minW="160px"
                          >
                            {autoCapture ? `Auto (${autoCaptureCountdown}s)` : 'Auto Capture'}
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

                    {/* Non-fullscreen controls info */}
                    {!isFullScreen && autoCapture && (
                      <Tag
                        position="absolute"
                        top={4}
                        left={4}
                        colorScheme="brand"
                        borderRadius="full"
                      >
                        Auto capture in {autoCaptureCountdown}s
                      </Tag>
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
                    <Tooltip label="Auto capture with countdown" hasArrow>
                      <Button
                        variant={autoCapture ? 'solid' : 'outline'}
                        colorScheme="orange"
                        onClick={autoCapture ? stopAutoCapture : startAutoCapture}
                        isDisabled={!stream || uploading}
                        leftIcon={<Iconify icon={FiAperture} boxSize={5} />}
                      >
                        {autoCapture ? `Cancel (${autoCaptureCountdown}s)` : 'Auto Capture'}
                      </Button>
                    </Tooltip>
                    <Tooltip label="Real-time document detection" hasArrow>
                      <Button
                        variant={detectionActive ? 'solid' : 'outline'}
                        colorScheme="purple"
                        onClick={() => {
                          if (detectionActive) {
                            stopRealTimeDetection();
                          } else {
                            startRealTimeDetection();
                          }
                        }}
                        isDisabled={!stream}
                        leftIcon={<Iconify icon={FiCpu} boxSize={5} />}
                      >
                        {detectionActive ? 'Detection ON' : 'Detection OFF'}
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

                {/* Detection Status - Always visible when detection is active */}
                {detectionActive && documentDetection && showControls && (
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
                      <Text fontWeight="600">Document geometry locked</Text>
                      <Text fontSize="sm" color={muted}>
                        Coverage {documentDetection.coverage?.toFixed(1) ?? 0}% • Corners detected{' '}
                        {documentDetection.corners?.length ?? 0}
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
        videoRef={videoRef}
      />
    </VStack>
  );
};

export default Phone;
