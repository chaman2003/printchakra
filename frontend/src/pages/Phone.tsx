import React, { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '../apiClient';
import { useSocket } from '../context/SocketContext';
import { useCalibration } from '../context/CalibrationContext';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Flex,
  Heading,
  Stack,
  Spinner,
  Tag,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
  VStack,
} from '@chakra-ui/react';
import {
  FiAperture,
  FiCamera,
  FiEye,
  FiEyeOff,
  FiMaximize2,
  FiMinimize2,
  FiUpload,
  FiWifi,
} from 'react-icons/fi';
import { API_ENDPOINTS } from '../config';
import { Iconify, ConnectionValidator } from '../components/common';

const Phone: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const [autoCapture, setAutoCapture] = useState(false);
  const [autoCaptureCount, setAutoCaptureCount] = useState(0);
  const autoCaptureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showConnectionValidator, setShowConnectionValidator] = useState(false);
  const [frameChangeStatus, setFrameChangeStatus] = useState<'waiting' | 'detecting' | 'ready' | 'captured'>('waiting');
  const [cameraOrientation, setCameraOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [autoCaptureMode, setAutoCaptureMode] = useState<'stability' | 'motion'>('motion');

  // Countdown state for auto-capture from dashboard
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state
  const [autoCaptureSource, setAutoCaptureSource] = useState<'local' | 'dashboard' | null>(null);
  const [pendingDocumentCount, setPendingDocumentCount] = useState<number>(0);

  // Auto-capture delays from calibration
  const { initialDelay, interCaptureDelay, startDelayCountdown, countdownValue, isCountingDown, cancelCountdown, setInitialDelay, setInterCaptureDelay } = useCalibration();
  const [isWaitingForInitialDelay, setIsWaitingForInitialDelay] = useState(false);
  const hasAppliedInitialDelayRef = useRef(false);
  const lastCaptureTimeRef = useRef<number>(0);
  const interCaptureDelayRef = useRef<number>(interCaptureDelay);

  useEffect(() => {
    interCaptureDelayRef.current = interCaptureDelay;
  }, [interCaptureDelay]);

  // Test capture mode (for calibration testing from Dashboard)
  const [isTestCaptureMode, setIsTestCaptureMode] = useState(false);

  // Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    blob: Blob;
    filename: string;
    isTestCapture?: boolean;
  }>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const autoCaptureCountRef = useRef(0);

  const toast = useToast();
  const { socket, connected: socketConnected } = useSocket();

  // Frame comparison refs
  const lastCapturedImageDataRef = useRef<ImageData | null>(null);
  const lastFrameImageDataRef = useRef<ImageData | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const stableFrameCountRef = useRef<number>(0);
  const motionSeenRef = useRef<boolean>(false);
  const motionStillCountRef = useRef<number>(0);
  const comparisonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCooldownRef = useRef<boolean>(false);

  const panelBg = useColorModeValue('whiteAlpha.900', 'rgba(12, 16, 35, 0.95)');
  const muted = useColorModeValue('gray.600', 'whiteAlpha.700');

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  }, []);

  // Fullscreen toggle
  const toggleFullScreen = useCallback(() => {
    if (!cameraContainerRef.current) return;
    if (!document.fullscreenElement) {
      cameraContainerRef.current.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Init comparison canvas
  useEffect(() => {
    if (!comparisonCanvasRef.current) {
      comparisonCanvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Frame comparison helpers
  const compareFrames = useCallback((frame1: ImageData, frame2: ImageData): number => {
    const d1 = frame1.data;
    const d2 = frame2.data;
    let diff = 0;
    const step = 16;
    let count = 0;
    for (let i = 0; i < d1.length; i += step * 4) {
      diff += Math.abs(d1[i] - d2[i]);
      diff += Math.abs(d1[i + 1] - d2[i + 1]);
      diff += Math.abs(d1[i + 2] - d2[i + 2]);
      count += 3;
    }
    return count > 0 ? diff / count : 0;
  }, []);

  const isBlankImage = useCallback((imageData: ImageData): boolean => {
    const { data, width, height } = imageData;
    const sampleSize = 100;
    let totalVariance = 0;
    let prevGray = -1;
    let uniformCount = 0;
    let edgeCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const idx = (y * width + x) * 4;
      const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

      if (prevGray >= 0) {
        const diff = Math.abs(gray - prevGray);
        totalVariance += diff;
        if (diff < 5) uniformCount++;
        if (diff > 30) edgeCount++;
      }
      prevGray = gray;
    }

    const avgVariance = totalVariance / sampleSize;
    const uniformRatio = uniformCount / sampleSize;
    return avgVariance < 8 && uniformRatio > 0.7 && edgeCount < 5;
  }, []);

  const getCurrentFrameData = useCallback((): ImageData | null => {
    const video = videoRef.current;
    const canvas = comparisonCanvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return null;

    const scale = 160 / video.videoWidth;
    canvas.width = 160;
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Frame comparison loop for auto-capture
  const startFrameComparisonLoop = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
    }

    stableFrameCountRef.current = 0;
    motionSeenRef.current = false;
    motionStillCountRef.current = 0;
    lastFrameImageDataRef.current = null;
    captureCooldownRef.current = false;

    const STABLE_THRESHOLD = 6;
    const CHANGE_THRESHOLD = 15;
    const STABILITY_THRESHOLD = 4;
    const MOTION_START_THRESHOLD = 12;
    const MOTION_SETTLE_THRESHOLD = 4;
    const MOTION_SETTLE_FRAMES = 3;

    autoCaptureIntervalRef.current = setInterval(async () => {
      if (isCapturingRef.current || captureCooldownRef.current) return;

      const currentFrame = getCurrentFrameData();
      if (!currentFrame) return;

      // Check inter-capture delay
      const now = Date.now();
      const timeSinceLastCapture = now - lastCaptureTimeRef.current;
      const requiredDelay = interCaptureDelayRef.current * 1000;

      if (lastCaptureTimeRef.current > 0 && timeSinceLastCapture < requiredDelay) {
        setFrameChangeStatus('waiting');
        return;
      }

      if (lastCapturedImageDataRef.current) {
        const diffFromCaptured = compareFrames(currentFrame, lastCapturedImageDataRef.current);
        if (diffFromCaptured < CHANGE_THRESHOLD) {
          setFrameChangeStatus('waiting');
          lastFrameImageDataRef.current = currentFrame;
          return;
        }
      }

      if (lastFrameImageDataRef.current) {
        const frameDiff = compareFrames(currentFrame, lastFrameImageDataRef.current);

        if (autoCaptureMode === 'motion') {
          if (frameDiff >= MOTION_START_THRESHOLD) {
            motionSeenRef.current = true;
            motionStillCountRef.current = 0;
            setFrameChangeStatus('detecting');
          } else if (motionSeenRef.current && frameDiff < MOTION_SETTLE_THRESHOLD) {
            motionStillCountRef.current++;
            setFrameChangeStatus('detecting');
          } else {
            motionStillCountRef.current = 0;
            setFrameChangeStatus(motionSeenRef.current ? 'detecting' : 'waiting');
          }

          if (motionSeenRef.current && motionStillCountRef.current >= MOTION_SETTLE_FRAMES) {
            setFrameChangeStatus('ready');
            captureCooldownRef.current = true;
            lastCaptureTimeRef.current = Date.now();

            if (!hasAppliedInitialDelayRef.current && initialDelay > 0) {
              hasAppliedInitialDelayRef.current = true;
              setIsWaitingForInitialDelay(true);
              try {
                await startDelayCountdown();
              } catch {
                captureCooldownRef.current = false;
                setIsWaitingForInitialDelay(false);
                motionSeenRef.current = false;
                motionStillCountRef.current = 0;
                setFrameChangeStatus('waiting');
                return;
              }
              setIsWaitingForInitialDelay(false);
            }

            if (captureInBackgroundRef.current) {
              await captureInBackgroundRef.current();
            }

            motionSeenRef.current = false;
            motionStillCountRef.current = 0;
            stableFrameCountRef.current = 0;
            lastFrameImageDataRef.current = null;

            setTimeout(() => {
              captureCooldownRef.current = false;
            }, 1000);
          }
        } else {
          if (frameDiff < STABLE_THRESHOLD) {
            stableFrameCountRef.current++;
            setFrameChangeStatus('detecting');

            if (stableFrameCountRef.current >= STABILITY_THRESHOLD) {
              setFrameChangeStatus('ready');
              captureCooldownRef.current = true;
              lastCaptureTimeRef.current = Date.now();

              // Apply initial delay on first capture
              if (!hasAppliedInitialDelayRef.current && initialDelay > 0) {
                hasAppliedInitialDelayRef.current = true;
                setIsWaitingForInitialDelay(true);
                try {
                  await startDelayCountdown();
                } catch {
                  captureCooldownRef.current = false;
                  setIsWaitingForInitialDelay(false);
                  stableFrameCountRef.current = 0;
                  setFrameChangeStatus('waiting');
                  return;
                }
                setIsWaitingForInitialDelay(false);
              }

              // Trigger capture
              if (captureInBackgroundRef.current) {
                await captureInBackgroundRef.current();
              }

              stableFrameCountRef.current = 0;
              lastFrameImageDataRef.current = null;

              setTimeout(() => {
                captureCooldownRef.current = false;
              }, 1000);
            }
          } else {
            stableFrameCountRef.current = 0;
            setFrameChangeStatus('detecting');
          }
        }
      }

      lastFrameImageDataRef.current = currentFrame;
    }, 500);
  }, [compareFrames, getCurrentFrameData, initialDelay, startDelayCountdown, autoCaptureMode]);

  // Start continuous auto-capture
  const startAutoCapture = useCallback(async (source: 'local' | 'dashboard' = 'local', documentCount?: number) => {
    hasAppliedInitialDelayRef.current = false;
    setAutoCapture(true);
    setAutoCaptureCount(0);
    autoCaptureCountRef.current = 0;
    lastCapturedImageDataRef.current = null;
    lastFrameImageDataRef.current = null;
    stableFrameCountRef.current = 0;
    motionSeenRef.current = false;
    motionStillCountRef.current = 0;
    setFrameChangeStatus('waiting');
    setAutoCaptureSource(source);
    if (documentCount) setPendingDocumentCount(documentCount);

    startFrameComparisonLoop();

    if (source === 'local' && socket) {
      socket.emit('auto_capture_state_changed', { enabled: true, source: 'phone', mode: autoCaptureMode });
    }

    toast({
      title: source === 'dashboard' ? '📱 Auto-Capture Started!' : 'Auto-Capture Enabled',
      description: source === 'dashboard'
        ? `Ready to capture ${documentCount || 'multiple'} document(s). Place documents one by one.`
        : 'Place documents one by one. Each new document will be captured automatically.',
      status: 'success',
      duration: 3000,
    });
  }, [socket, toast, startFrameComparisonLoop, autoCaptureMode]);

  // Stop auto-capture
  const stopAutoCapture = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    cancelCountdown();
    setIsWaitingForInitialDelay(false);
    hasAppliedInitialDelayRef.current = false;
    setCountdown(null);
    setAutoCapture(false);
    setFrameChangeStatus('waiting');
    lastCapturedImageDataRef.current = null;
    lastFrameImageDataRef.current = null;
    stableFrameCountRef.current = 0;
    motionSeenRef.current = false;
    motionStillCountRef.current = 0;

    if (socket) {
      socket.emit('auto_capture_state_changed', {
        enabled: false,
        source: 'phone',
        capturedCount: autoCaptureCountRef.current,
        mode: autoCaptureMode,
      });
    }

    const wasRemote = autoCaptureSource === 'dashboard';
    setAutoCaptureSource(null);
    setPendingDocumentCount(0);

    if (autoCaptureCountRef.current > 0) {
      toast({
        title: 'Auto-Capture Stopped',
        description: `Captured ${autoCaptureCountRef.current} document(s)${wasRemote ? ' - Dashboard notified' : ''}`,
        status: 'success',
        duration: 3000,
      });
    }
  }, [toast, socket, autoCaptureSource, cancelCountdown, autoCaptureMode]);

  // Process upload queue
  useEffect(() => {
    const processQueue = async () => {
      if (isProcessingQueue || uploadQueue.length === 0) return;

      setIsProcessingQueue(true);
      const item = uploadQueue[0];

      try {
        const formData = new FormData();
        formData.append('file', item.blob, item.filename);

        if (item.isTestCapture) {
          await apiClient.post('/phone/test-capture', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast({ title: '🧪 Test Capture Uploaded', status: 'info', duration: 2000, position: 'top-right' });
        } else {
          await apiClient.post(API_ENDPOINTS.upload, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast({ title: 'Upload complete', description: `${item.filename} sent`, status: 'success', duration: 2000, position: 'top-right' });
        }
      } catch (err) {
        console.error('Queue upload failed:', err);
        toast({ title: 'Upload failed', status: 'error', duration: 3000, position: 'top-right' });
      } finally {
        setUploadQueue(prev => prev.slice(1));
        setIsProcessingQueue(false);
      }
    };

    processQueue();
  }, [uploadQueue, isProcessingQueue, toast]);

  const captureInBackgroundRef = useRef<(() => Promise<void>) | null>(null);

  const startAsyncUpload = useCallback((blob: Blob, filename: string, isTestCapture: boolean = false) => {
    setUploadQueue(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      blob,
      filename,
      isTestCapture,
    }]);

    if (!isTestCapture) {
      setAutoCaptureCount(prev => {
        const newCount = prev + 1;
        autoCaptureCountRef.current = newCount;
        return newCount;
      });
    }
    console.log(`📸 Queued: ${filename}${isTestCapture ? ' (TEST)' : ''}`);
  }, []);

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
        setFrameChangeStatus('waiting');
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      const capturedFrame = getCurrentFrameData();
      if (capturedFrame) {
        lastCapturedImageDataRef.current = capturedFrame;
        if (isBlankImage(capturedFrame)) {
          console.log('⚠️ Blank image detected - skipping upload');
          toast({ title: 'Blank Image', description: 'No document content - skipped', status: 'warning', duration: 2000, position: 'top' });
          stableFrameCountRef.current = 0;
          lastFrameImageDataRef.current = null;
          setFrameChangeStatus('waiting');
          return;
        }
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
      });

      if (!blob) { setFrameChangeStatus('waiting'); return; }

      const filename = `auto_capture_${Date.now()}.jpg`;
      startAsyncUpload(blob, filename, isTestCaptureMode);

      stableFrameCountRef.current = 0;
      lastFrameImageDataRef.current = null;
      setFrameChangeStatus('waiting');
    } catch (err) {
      console.error('Background capture error:', err);
      lastCapturedImageDataRef.current = null;
      setFrameChangeStatus('waiting');
    } finally {
      isCapturingRef.current = false;
    }
  }, [startAsyncUpload, isTestCaptureMode, toast, getCurrentFrameData, isBlankImage]);

  useEffect(() => {
    captureInBackgroundRef.current = captureInBackground;
  }, [captureInBackground]);

  // Camera management
  const startCamera = async (orientation?: 'portrait' | 'landscape') => {
    const targetOrientation = orientation || cameraOrientation;
    try {
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
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
        videoRef.current.onloadedmetadata = () => {
          const v = videoRef.current;
          if (!v) return;
          v.play().catch(e => console.error("Video play failed:", e));
          if (v.videoWidth && v.videoHeight) {
            setCameraOrientation(v.videoHeight > v.videoWidth ? 'portrait' : 'landscape');
          }
        };
      }
    } catch (err) {
      console.error('Camera start error:', err);
      toast({ title: 'Camera Error', description: (err as Error).message, status: 'error', duration: 3000 });
    }
  };

  const toggleCameraOrientation = async () => {
    const newOrientation = cameraOrientation === 'portrait' ? 'landscape' : 'portrait';
    setCameraOrientation(newOrientation);
    if (stream) await startCamera(newOrientation);
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
    }
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    setAutoCapture(false);
  }, [stream]);

  const handleCaptureMode = (mode: 'file' | 'camera') => {
    setCaptureMode(mode);
    setPreviewImage(null);
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const uploadImage = useCallback(
    async (file: Blob, filename: string) => {
      setUploadQueue(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        blob: file,
        filename,
        isTestCapture: isTestCaptureMode,
      }]);

      if (isTestCaptureMode) {
        showMessage('🧪 Test capture added');
      } else {
        showMessage('✅ Added to processing queue');
        toast({ title: 'Queued for processing', description: 'You can continue capturing.', status: 'success', duration: 2000 });
      }
    },
    [isTestCaptureMode, showMessage, toast]
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

    // Check if blank
    const frameData = getCurrentFrameData();
    if (frameData && isBlankImage(frameData)) {
      toast({ title: 'Blank Image', description: 'No document content found', status: 'warning', duration: 3000 });
      return;
    }

    canvas.toBlob(
      async (blob: Blob | null) => {
        if (blob) {
          uploadImage(blob, `capture_${Date.now()}.jpg`);
        }
      },
      'image/jpeg',
      0.9
    );
  }, [uploadImage, toast, getCurrentFrameData, isBlankImage]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    uploadImage(file, file.name);
  };

  // Socket sync
  useEffect(() => {
    setConnected(socketConnected);
  }, [socketConnected]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('capture_now', (data: any) => {
      console.log('Received capture command:', data);
      showMessage('📸 Capture triggered from Dashboard!');
      setTimeout(() => {
        if (captureMode === 'camera' && stream) {
          captureFromCamera();
        } else {
          showMessage('Switch to Camera mode to auto-capture');
        }
      }, 500);
    });

    socket.on('start_auto_capture', (data: any) => {
      console.log('Received auto-capture command from Dashboard:', data);
      const documentCount = data?.documentCount || 1;
      const delaySeconds = data?.delaySeconds ?? initialDelay ?? 10;
      const requestedMode =
        data?.mode === 'stability' ? 'stability' : data?.mode === 'motion' ? 'motion' : null;
      const delayMs = delaySeconds * 1000;
      if (requestedMode) {
        setAutoCaptureMode(requestedMode);
      }

      if (captureMode !== 'camera' || !stream) {
        showMessage('💡 Switching to Camera mode...');
        handleCaptureMode('camera');
      }

      if (delaySeconds <= 0) {
        toast({ title: '📱 Auto-Capture Enabled!', status: 'success', duration: 3000, position: 'top' });
        setTimeout(() => startAutoCapture('dashboard', documentCount), 100);
        return;
      }

      toast({ title: '📱 Auto-Capture Starting...', description: `Will enable in ${delaySeconds}s`, status: 'info', duration: delaySeconds * 1000, position: 'top' });

      setCountdown(delaySeconds);
      setPendingDocumentCount(documentCount);

      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            countdownIntervalRef.current = null;
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeout(() => {
        setCountdown(null);
        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        toast({ title: '📱 Auto-Capture Enabled!', status: 'success', duration: 3000, position: 'top' });
        startAutoCapture('dashboard', documentCount);
      }, delayMs);
    });

    socket.on('stop_auto_capture', () => {
      stopAutoCapture();
      toast({ title: '⏹️ Auto-Capture Stopped', description: 'Dashboard disabled auto-capture', status: 'info', duration: 2000 });
    });

    socket.on('request_auto_capture_state', () => {
      socket.emit('auto_capture_state_changed', { enabled: autoCapture, source: 'phone', capturedCount: autoCaptureCountRef.current });
    });

    socket.on('calibration_test_mode', (data: { enabled: boolean }) => {
      setIsTestCaptureMode(data.enabled);
      if (data.enabled) toast({ title: '🧪 Test Mode Active', status: 'info', duration: 3000 });
    });

    socket.on('start_test_capture', async (data: { delay: number; autoCapture?: boolean }) => {
      setIsTestCaptureMode(true);
      if (data.autoCapture) {
        if (captureMode !== 'camera' || !stream) {
          handleCaptureMode('camera');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        toast({ title: '📸 Test Capture Starting', description: `Auto-capturing in ${data.delay}s`, status: 'info', duration: data.delay * 1000 });
        setIsWaitingForInitialDelay(true);
        try {
          await startDelayCountdown();
          await captureFromCamera();
          toast({ title: '✅ Test Capture Complete', status: 'success', duration: 3000 });
          setTimeout(() => setIsTestCaptureMode(false), 1000);
        } catch { setIsTestCaptureMode(false); }
        finally { setIsWaitingForInitialDelay(false); }
      }
    });

    socket.on('cancel_test_capture', () => {
      cancelCountdown();
      setIsWaitingForInitialDelay(false);
      setIsTestCaptureMode(false);
    });

    socket.on('delay_settings_updated', (data: { initialDelay: number; interCaptureDelay: number }) => {
      setInitialDelay(data.initialDelay);
      setInterCaptureDelay(data.interCaptureDelay);
      toast({ title: '⚙️ Settings Updated', description: `Delays: ${data.initialDelay}s startup, ${data.interCaptureDelay}s between`, status: 'info', duration: 3000 });
    });

    return () => {
      socket.off('capture_now');
      socket.off('start_auto_capture');
      socket.off('stop_auto_capture');
      socket.off('request_auto_capture_state');
      socket.off('calibration_test_mode');
      socket.off('start_test_capture');
      socket.off('cancel_test_capture');
      socket.off('delay_settings_updated');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, captureFromCamera, captureMode, showMessage, startAutoCapture, stopAutoCapture, stream, toast, autoCapture, initialDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (autoCaptureIntervalRef.current) clearInterval(autoCaptureIntervalRef.current);
    };
  }, [stream]);

  return (
    <VStack align="stretch" spacing={{ base: 8, md: 10 }} pb={16}>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" gap={6}>
        <Stack spacing={2}>
          <Heading size="lg" display="flex" alignItems="center" gap={3}>
            📱 Phone Capture
          </Heading>
          <Text color={muted} maxW="lg">
            Capture documents and send them to the Dashboard for processing.
          </Text>
        </Stack>
        <Flex align="center" gap={3} bg="surface.blur" borderRadius="full" border="1px solid rgba(121,95,238,0.22)" px={5} py={2}>
          <Box w={3} h={3} borderRadius="full" bg={connected ? 'green.400' : 'red.400'} boxShadow={`0 0 12px ${connected ? 'rgba(72,187,120,0.6)' : 'rgba(245,101,101,0.6)'}`} />
          <Text fontWeight="600" color={muted} display="flex" alignItems="center" gap={2}>
            <Iconify icon={FiWifi} boxSize={5} />
            {connected ? 'Connected' : 'Offline'}
          </Text>
        </Flex>

        {(uploadQueue.length > 0 || isProcessingQueue) && (
          <Flex align="center" gap={2} bg="blue.500" color="white" borderRadius="full" px={4} py={2} boxShadow="0 0 12px rgba(66, 153, 225, 0.6)">
            <Spinner size="xs" />
            <Text fontWeight="bold" fontSize="sm">Queue: {uploadQueue.length + (isProcessingQueue ? 1 : 0)}</Text>
          </Flex>
        )}
      </Flex>

      {message && (
        <Alert status="info" borderRadius="xl" bg="rgba(69,202,255,0.1)" border="1px solid rgba(69,202,255,0.25)">
          <AlertIcon />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card bg={panelBg} border="1px solid rgba(121,95,238,0.18)" boxShadow="subtle">
        <CardBody>
          <Stack spacing={6}>
            {/* Delay Settings Display */}
            <Flex
              bg={useColorModeValue('rgba(121, 95, 238, 0.08)', 'rgba(121, 95, 238, 0.15)')}
              borderRadius="lg" px={4} py={3}
              border="1px solid" borderColor={useColorModeValue('rgba(121, 95, 238, 0.2)', 'rgba(121, 95, 238, 0.3)')}
              alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={3}
            >
              <Flex alignItems="center" gap={2}>
                <Iconify icon="solar:clock-circle-bold" boxSize={5} color="brand.400" />
                <Text fontSize="sm" fontWeight="600">Auto-Capture Delays</Text>
              </Flex>
              <Flex gap={3} flexWrap="wrap">
                <Badge colorScheme="purple" fontSize="xs" px={3} py={1} borderRadius="full" display="flex" alignItems="center" gap={1}>
                  <Text>Startup:</Text><Text fontWeight="bold">{initialDelay}s</Text>
                </Badge>
                <Badge colorScheme="orange" fontSize="xs" px={3} py={1} borderRadius="full" display="flex" alignItems="center" gap={1}>
                  <Text>Between:</Text><Text fontWeight="bold">{interCaptureDelay}s</Text>
                </Badge>
              </Flex>
            </Flex>

            {captureMode === 'camera' && (
              <Flex
                bg={useColorModeValue('rgba(16, 185, 129, 0.08)', 'rgba(16, 185, 129, 0.12)')}
                borderRadius="lg"
                px={4}
                py={3}
                border="1px solid"
                borderColor={useColorModeValue('rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.3)')}
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                gap={3}
              >
                <Text fontSize="sm" fontWeight="600">Capture Trigger Mode</Text>
                <ButtonGroup isAttached size="sm" variant="outline">
                  <Button
                    colorScheme={autoCaptureMode === 'motion' ? 'green' : undefined}
                    variant={autoCaptureMode === 'motion' ? 'solid' : 'outline'}
                    onClick={() => setAutoCaptureMode('motion')}
                    isDisabled={autoCapture}
                  >
                    Motion-based
                  </Button>
                  <Button
                    colorScheme={autoCaptureMode === 'stability' ? 'purple' : undefined}
                    variant={autoCaptureMode === 'stability' ? 'solid' : 'outline'}
                    onClick={() => setAutoCaptureMode('stability')}
                    isDisabled={autoCapture}
                  >
                    Stability-based
                  </Button>
                </ButtonGroup>
              </Flex>
            )}

            {/* Mode Selector */}
            <ButtonGroup isAttached variant="ghost" alignSelf="center">
              <Button leftIcon={<Iconify icon={FiUpload} boxSize={5} />} colorScheme={captureMode === 'file' ? 'brand' : undefined} onClick={() => handleCaptureMode('file')}>
                Choose File
              </Button>
              <Button leftIcon={<Iconify icon={FiCamera} boxSize={5} />} colorScheme={captureMode === 'camera' ? 'brand' : undefined} onClick={() => handleCaptureMode('camera')}>
                Live Camera
              </Button>
            </ButtonGroup>

            {captureMode === 'file' ? (
              <Stack spacing={4} align="center">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,image/jpeg,image/jpg,image/png" capture="environment" style={{ display: 'none' }} />
                <Button size="lg" colorScheme="brand" leftIcon={<Iconify icon={FiUpload} boxSize={5} />} onClick={() => fileInputRef.current?.click()} isLoading={uploading} loadingText="Uploading">
                  Select Image
                </Button>
                <Text fontSize="sm" color={muted} textAlign="center">
                  Upload a document photo from your device.
                </Text>
              </Stack>
            ) : (
              <Stack spacing={4}>
                {/* Camera Feed */}
                <Box
                  ref={cameraContainerRef}
                  position="relative"
                  borderRadius="xl"
                  overflow="hidden"
                  bg="black"
                  border="2px solid"
                  borderColor="gray.600"
                  sx={{ width: '100%', maxWidth: isFullScreen ? '100vw' : '100%', height: isFullScreen ? '100vh' : 'auto', mx: 'auto' }}
                >
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: isFullScreen ? '100vh' : 'auto', maxHeight: isFullScreen ? '100vh' : '70vh', display: 'block', backgroundColor: 'black', objectFit: 'contain' }} />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Test Mode Banner */}
                  {isTestCaptureMode && !autoCapture && (
                    <Flex position="absolute" top={0} left={0} right={0} bg="linear-gradient(90deg, rgba(139, 92, 246, 0.95) 0%, rgba(109, 40, 217, 0.95) 100%)" color="white" px={4} py={3} alignItems="center" justifyContent="center" zIndex={30}>
                      <Text fontSize="sm" fontWeight="bold">🧪 TEST CAPTURE MODE</Text>
                    </Flex>
                  )}

                  {/* Auto-Capture Banner */}
                  {autoCapture && (
                    <Flex position="absolute" top={0} left={0} right={0} bg="linear-gradient(90deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)" color="white" px={4} py={3} alignItems="center" justifyContent="space-between" zIndex={30}>
                      <Flex alignItems="center" gap={3}>
                        <Box w={4} h={4} borderRadius="full" bg="white" animation="pulse 1s infinite" />
                        <Box>
                          <Text fontSize="sm" fontWeight="bold">🎯 AUTO-CAPTURE ACTIVE</Text>
                          <Text fontSize="xs" opacity={0.9}>
                            {autoCaptureSource === 'dashboard' ? '📡 From Dashboard • ' : ''}
                            {autoCaptureMode === 'motion'
                              ? 'Move next document into frame, capture happens when motion settles'
                              : 'Place documents one by one - captures when frame is stable'}
                          </Text>
                        </Box>
                      </Flex>
                      <Flex alignItems="center" gap={2}>
                        <Box bg="whiteAlpha.300" px={3} py={1} borderRadius="full" fontSize="sm" fontWeight="bold">📷 {autoCaptureCount}</Box>
                        <Button size="sm" colorScheme="red" variant="solid" onClick={stopAutoCapture}>⏹ Stop</Button>
                      </Flex>
                    </Flex>
                  )}

                  {/* Fullscreen delay display */}
                  {isFullScreen && (
                    <Flex position="absolute" bottom={3} left={3} bg="rgba(0,0,0,0.7)" color="white" px={3} py={2} borderRadius="lg" fontSize="xs" gap={2} alignItems="center" zIndex={20}>
                      <Iconify icon="solar:clock-circle-bold" boxSize={3} />
                      <Text fontWeight="600">{initialDelay}s</Text>
                      <Text opacity={0.7}>•</Text>
                      <Text fontWeight="600">{interCaptureDelay}s</Text>
                    </Flex>
                  )}

                  {/* Eye Toggle */}
                  <Tooltip label={showControls ? 'Hide controls' : 'Show controls'} hasArrow placement="left">
                    <Button position="absolute" top={autoCapture ? 16 : 3} right={3} size="sm" colorScheme="brand" variant={showControls ? 'solid' : 'ghost'} onClick={() => setShowControls(!showControls)} zIndex={10} borderRadius="full" p={2} minWidth="auto">
                      <Iconify icon={showControls ? FiEye : FiEyeOff} boxSize={4} />
                    </Button>
                  </Tooltip>

                  {/* Countdown Overlay */}
                  {countdown !== null && (
                    <Flex position="absolute" top={0} left={0} right={0} bottom={0} align="center" justify="center" bg="rgba(0,0,0,0.8)" zIndex={20} flexDirection="column">
                      <Text fontSize="8xl" fontWeight="bold" color="white" textShadow="0 0 40px rgba(66, 153, 225, 1)">{countdown}</Text>
                      <Text fontSize="lg" color="white" mt={4}>📱 Auto-Capture Starting...</Text>
                      <Text fontSize="sm" color="whiteAlpha.700" mt={2}>{pendingDocumentCount} document{pendingDocumentCount !== 1 ? 's' : ''} queued</Text>
                      <Button mt={4} colorScheme="red" variant="outline" size="sm" onClick={() => {
                        if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
                        setCountdown(null); setPendingDocumentCount(0);
                        toast({ title: 'Cancelled', status: 'warning', duration: 2000 });
                      }}>Cancel</Button>
                    </Flex>
                  )}

                  {/* Initial Delay Overlay */}
                  {isWaitingForInitialDelay && isCountingDown && (
                    <Flex position="absolute" top={0} left={0} right={0} bottom={0} align="center" justify="center" bg="rgba(121, 95, 238, 0.9)" zIndex={25} flexDirection="column">
                      <Box w={32} h={32} borderRadius="full" border="4px solid" borderColor="white" display="flex" alignItems="center" justifyContent="center" mb={4}>
                        <Text fontSize="6xl" fontWeight="bold" color="white">{countdownValue}</Text>
                      </Box>
                      <Text fontSize="xl" color="white" fontWeight="bold">⏳ Auto-Capture Starting...</Text>
                      <Button mt={6} colorScheme="red" variant="solid" size="md" onClick={() => { cancelCountdown(); setIsWaitingForInitialDelay(false); }}>Cancel</Button>
                    </Flex>
                  )}

                  {/* Auto-capture frame status */}
                  {autoCapture && (
                    <Box position="absolute" bottom={3} left={3} bg={frameChangeStatus === 'captured' ? 'green.500' : frameChangeStatus === 'ready' ? 'green.400' : frameChangeStatus === 'detecting' ? 'orange.400' : 'blue.500'} color="white" px={3} py={1} borderRadius="full" fontSize="xs" fontWeight="bold" display="flex" alignItems="center" gap={2}>
                      <Box w={2} h={2} borderRadius="full" bg="white" animation="pulse 1s infinite" />
                      {frameChangeStatus === 'captured' ? '✓ Captured!' : frameChangeStatus === 'ready' ? '📸 Ready...' : frameChangeStatus === 'detecting' ? '👀 Detecting...' : `📷 ${autoCaptureCount} captured`}
                      {autoCaptureSource === 'dashboard' && <Tag size="sm" colorScheme="blue" ml={1}>Dashboard</Tag>}
                    </Box>
                  )}

                  {/* Fullscreen Controls */}
                  {isFullScreen && showControls && (
                    <VStack position="absolute" bottom={6} left="50%" transform="translateX(-50%)" spacing={2} zIndex={5}>
                      <Flex gap={2}>
                        <Button colorScheme={autoCapture ? 'red' : 'brand'} size="lg" onClick={() => autoCapture ? stopAutoCapture() : startAutoCapture('local')} isDisabled={!stream || uploading} leftIcon={<Iconify icon={FiAperture} boxSize={5} />}>
                          {autoCapture ? `Stop (${autoCaptureCount})` : 'Auto'}
                        </Button>
                        <Button colorScheme="brand" size="lg" onClick={captureFromCamera} isDisabled={!stream || uploading || autoCapture} isLoading={uploading} leftIcon={<Iconify icon={FiCamera} boxSize={5} />}>
                          Capture
                        </Button>
                      </Flex>
                    </VStack>
                  )}
                </Box>

                {/* Control Buttons - Normal Mode */}
                {!isFullScreen && showControls && (
                  <Flex wrap="wrap" gap={2} justify="center">
                    <Button colorScheme="brand" leftIcon={<Iconify icon={FiCamera} boxSize={5} />} onClick={captureFromCamera} isDisabled={!stream || uploading || autoCapture} isLoading={uploading} loadingText="Uploading">
                      Capture
                    </Button>
                    <Button variant={autoCapture ? 'solid' : 'outline'} colorScheme={autoCapture ? 'red' : 'orange'} onClick={() => autoCapture ? stopAutoCapture() : startAutoCapture('local')} isDisabled={!stream || uploading} leftIcon={<Iconify icon={FiAperture} boxSize={5} />}>
                      {autoCapture ? `Stop (${autoCaptureCount})` : 'Auto Capture'}
                    </Button>
                    <Button variant="outline" colorScheme="brand" onClick={toggleFullScreen} isDisabled={!stream} leftIcon={<Iconify icon={isFullScreen ? FiMinimize2 : FiMaximize2} boxSize={5} />}>
                      Fullscreen
                    </Button>
                  </Flex>
                )}

                {/* Auto-Capture Status Panel */}
                {autoCapture && showControls && !isFullScreen && (
                  <Flex align="center" gap={3} bg="surface.blur" borderRadius="lg" border="1px solid rgba(69,202,255,0.2)" px={4} py={3}>
                    <Iconify icon={FiAperture} color="brand.300" />
                    <Stack spacing={0}>
                      <Text fontWeight="600" fontSize="sm">
                        {frameChangeStatus === 'ready' ? '📸 New document detected - capturing...' :
                          frameChangeStatus === 'detecting'
                            ? (autoCaptureMode === 'motion' ? '👀 Motion detected, waiting to settle...' : '👀 Waiting for stable document...')
                            :
                            frameChangeStatus === 'captured' ? '✓ Captured! Place next document.' :
                              `📷 Captured ${autoCaptureCount} documents`}
                      </Text>
                      <Text fontSize="xs" color={muted}>
                        {autoCaptureMode === 'motion'
                          ? 'Move a new document into view • Captures after movement settles'
                          : 'Place each document in view • Auto-captures when stable'}
                      </Text>
                    </Stack>
                  </Flex>
                )}
              </Stack>
            )}

            {previewImage && (
              <Stack spacing={3}>
                <Heading size="sm">Preview</Heading>
                <Box borderRadius="2xl" overflow="hidden" border="1px solid rgba(69,202,255,0.25)" boxShadow="subtle">
                  <img src={previewImage} alt="Preview" style={{ width: '100%', display: 'block' }} />
                </Box>
              </Stack>
            )}

            <Stack spacing={3}>
              <Heading size="sm">How it works</Heading>
              <Stack spacing={2} color={muted} fontSize="sm">
                <Text>1. Choose between live capture or file upload.</Text>
                <Text>2. Capture documents — they're sent to the Dashboard automatically.</Text>
                <Text>3. Use Auto Capture with the document feeder for batch scanning.</Text>
                <Text>4. All processing and editing happens in the Dashboard.</Text>
              </Stack>
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      <ConnectionValidator
        isOpen={showConnectionValidator}
        onClose={() => setShowConnectionValidator(false)}
        videoRef={videoRef as React.RefObject<HTMLVideoElement>}
      />
    </VStack>
  );
};

export default Phone;
