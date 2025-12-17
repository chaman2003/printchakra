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

type DetectedQuad = {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
  const docDetectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionRafRef = useRef<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [showConnectionValidator, setShowConnectionValidator] = useState(false);
  const [frameChangeStatus, setFrameChangeStatus] = useState<'waiting' | 'detecting' | 'ready' | 'captured'>('waiting');
  const [cameraOrientation, setCameraOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [detectedQuad, setDetectedQuad] = useState<DetectedQuad | null>(null);
  
  // Countdown state for auto-capture from dashboard
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sync state - tracks if auto-capture was triggered remotely (from dashboard)
  const [autoCaptureSource, setAutoCaptureSource] = useState<'local' | 'dashboard' | null>(null);
  const [pendingDocumentCount, setPendingDocumentCount] = useState<number>(0);
  
  // Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<Array<{
    id: string;
    blob: Blob;
    filename: string;
    options: typeof processingOptions;
  }>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const toast = useToast();
  
  // Use shared Socket from context instead of creating new connections
  const { socket, connected: socketConnected } = useSocket();
  
  // Frame comparison based auto-capture (no API calls for detection)
  const lastCapturedImageDataRef = useRef<ImageData | null>(null);
  const lastFrameImageDataRef = useRef<ImageData | null>(null);
  const isCapturingRef = useRef<boolean>(false);
  const stableFrameCountRef = useRef<number>(0);
  const comparisonCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCooldownRef = useRef<boolean>(false);

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

  // Check if an image is blank/uniform (like gray captures with no document)
  // Returns true if image appears to be blank/invalid
  const isBlankImage = (imageData: ImageData): boolean => {
    const data = imageData.data;
    const pixelCount = data.length / 4;
    
    if (pixelCount === 0) return true;
    
    // Calculate mean and variance of grayscale values
    let sum = 0;
    let sumSq = 0;
    let minVal = 255;
    let maxVal = 0;
    
    // Sample pixels for performance
    const step = 16;
    let sampledCount = 0;
    
    for (let i = 0; i < data.length; i += step * 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale
      const gray = (r + g + b) / 3;
      
      sum += gray;
      sumSq += gray * gray;
      sampledCount++;
      
      if (gray < minVal) minVal = gray;
      if (gray > maxVal) maxVal = gray;
    }
    
    const mean = sum / sampledCount;
    const variance = (sumSq / sampledCount) - (mean * mean);
    const stdDev = Math.sqrt(variance);
    const range = maxVal - minVal;
    
    // Log for debugging
    console.log(`Image analysis: mean=${mean.toFixed(1)}, stdDev=${stdDev.toFixed(1)}, range=${range}`);
    
    // Image is considered blank if:
    // 1. Very low variance (uniform color) - stdDev < 15
    // 2. Narrow color range - range < 50
    // 3. OR if it's mostly gray (mean between 80-180) with low contrast
    const isLowContrast = stdDev < 15 && range < 50;
    const isUniformGray = mean > 80 && mean < 180 && stdDev < 20 && range < 60;
    
    if (isLowContrast || isUniformGray) {
      console.log('⚠️ Blank/uniform image detected - will be rejected');
      return true;
    }
    
    return false;
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

  // Ref to track auto capture count without triggering re-renders/dependency changes
  const autoCaptureCountRef = useRef(0);

  // Main frame comparison loop - runs every 500ms (MUST be defined BEFORE startAutoCapture)
  const startFrameComparisonLoop = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
    }
    
    autoCaptureIntervalRef.current = setInterval(() => {
      try {
        if (isCapturingRef.current || captureCooldownRef.current || !videoRef.current) return;
        
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
              
              if (stableFrameCountRef.current >= 2) {
                // Stable for 1 second - capture first document
                console.log('📷 First document stable - capturing...');
                captureInBackgroundRef.current?.();
                // Reset stability counter and start cooldown
                stableFrameCountRef.current = 0;
                captureCooldownRef.current = true;
                setTimeout(() => { captureCooldownRef.current = false; }, 1500);
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
            
            if (stableFrameCountRef.current >= 2) {
              // New stable document - capture it!
              console.log(`📷 New document detected (${diffFromCaptured.toFixed(1)}% different) - capturing...`);
              captureInBackgroundRef.current?.();
              // Reset stability counter and start cooldown
              stableFrameCountRef.current = 0;
              captureCooldownRef.current = true;
              setTimeout(() => { captureCooldownRef.current = false; }, 1500);
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

  // Start continuous auto-capture mode with frame comparison
  const startAutoCapture = useCallback((source: 'local' | 'dashboard' = 'local', documentCount?: number) => {
    setAutoCapture(true);
    setAutoCaptureCount(0);
    autoCaptureCountRef.current = 0;
    lastCapturedImageDataRef.current = null;
    lastFrameImageDataRef.current = null;
    stableFrameCountRef.current = 0;
    setFrameChangeStatus('waiting');
    setAutoCaptureSource(source);
    if (documentCount) setPendingDocumentCount(documentCount);
    
    // Start frame comparison loop
    startFrameComparisonLoop();
    
    // Notify dashboard if started locally
    if (source === 'local' && socket) {
      socket.emit('auto_capture_state_changed', { enabled: true, source: 'phone' });
    }
    
    toast({
      title: source === 'dashboard' ? '📱 Auto-Capture Started!' : 'Auto-Capture Enabled',
      description: source === 'dashboard' 
        ? `Ready to capture ${documentCount || 'multiple'} document(s). Place documents one by one.`
        : 'Place documents one by one. Each new document will be captured automatically.',
      status: 'success',
      duration: 3000,
    });
  }, [socket, toast, startFrameComparisonLoop]);

  // Stop continuous auto-capture mode
  const stopAutoCapture = useCallback(() => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    // Clear countdown if running
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    setAutoCapture(false);
    setFrameChangeStatus('waiting');
    lastCapturedImageDataRef.current = null;
    lastFrameImageDataRef.current = null;
    stableFrameCountRef.current = 0;
    
    // Notify dashboard that auto-capture stopped
    if (socket) {
      socket.emit('auto_capture_state_changed', { enabled: false, source: 'phone', capturedCount: autoCaptureCountRef.current });
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
  }, [toast, socket, autoCaptureSource]);

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

    setAutoCaptureCount(prev => {
      const newCount = prev + 1;
      autoCaptureCountRef.current = newCount;
      return newCount;
    });

    // Toast removed to prevent re-renders during rapid capture
    console.log(`📸 Queued: ${filename}`);
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
        
        // Check if the image is blank/uniform (gray, no document content)
        if (isBlankImage(capturedFrame)) {
          console.log('⚠️ Blank image detected - skipping upload');
          toast({
            title: 'Blank Image Detected',
            description: 'No document content found - capture skipped',
            status: 'warning',
            duration: 2000,
            position: 'top',
          });
          // Reset and wait for next document
          stableFrameCountRef.current = 0;
          lastFrameImageDataRef.current = null;
          setFrameChangeStatus('waiting');
          return;
        }
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
  }, [processingOptions, startAsyncUpload, toast]);

  // Keep ref updated with latest captureInBackground
  useEffect(() => {
    captureInBackgroundRef.current = captureInBackground;
  }, [captureInBackground]);

  const detectDocumentQuad = useCallback((): DetectedQuad | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    // Use offscreen canvas for edge detection
    const targetWidth = 320;
    const aspectRatio = video.videoHeight / video.videoWidth;
    const targetHeight = Math.round(targetWidth * aspectRatio);

    const canvas = docDetectionCanvasRef.current ?? document.createElement('canvas');
    docDetectionCanvasRef.current = canvas;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const { data, width, height } = imageData;

    // Apply Sobel edge detection
    const edgeStrength: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
    
    const getGray = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return 0;
      const idx = (y * width + x) * 4;
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };

    // Sobel kernels
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const gx = 
          -1 * getGray(x - 1, y - 1) + 1 * getGray(x + 1, y - 1) +
          -2 * getGray(x - 1, y) + 2 * getGray(x + 1, y) +
          -1 * getGray(x - 1, y + 1) + 1 * getGray(x + 1, y + 1);
        const gy = 
          -1 * getGray(x - 1, y - 1) - 2 * getGray(x, y - 1) - 1 * getGray(x + 1, y - 1) +
          1 * getGray(x - 1, y + 1) + 2 * getGray(x, y + 1) + 1 * getGray(x + 1, y + 1);
        edgeStrength[y][x] = Math.sqrt(gx * gx + gy * gy);
      }
    }

    // Find edge threshold (top 10% of edge values)
    const allEdges = edgeStrength.flat().filter(v => v > 0);
    allEdges.sort((a, b) => b - a);
    const threshold = allEdges[Math.floor(allEdges.length * 0.1)] || 50;

    // Collect strong edge points
    const edgePoints: { x: number; y: number }[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (edgeStrength[y][x] > threshold) {
          edgePoints.push({ x, y });
        }
      }
    }

    if (edgePoints.length < 100) return null;

    // Find convex hull-like bounding by scanning from each direction
    const margin = 0.05;
    const marginX = width * margin;
    const marginY = height * margin;

    // Find corners by scanning edge points
    let topLeft = { x: width, y: height };
    let topRight = { x: 0, y: height };
    let bottomLeft = { x: width, y: 0 };
    let bottomRight = { x: 0, y: 0 };

    for (const p of edgePoints) {
      // Top-left: minimize x + y
      if (p.x + p.y < topLeft.x + topLeft.y) topLeft = { ...p };
      // Top-right: maximize x - y
      if (p.x - p.y > topRight.x - topRight.y) topRight = { ...p };
      // Bottom-left: minimize x - y
      if (p.x - p.y < bottomLeft.x - bottomLeft.y) bottomLeft = { ...p };
      // Bottom-right: maximize x + y
      if (p.x + p.y > bottomRight.x + bottomRight.y) bottomRight = { ...p };
    }

    // Validate quad - corners should form a reasonable quadrilateral
    const minArea = width * height * 0.05;
    const area = Math.abs(
      (topRight.x - topLeft.x) * (bottomLeft.y - topLeft.y) -
      (bottomLeft.x - topLeft.x) * (topRight.y - topLeft.y)
    ) / 2 + Math.abs(
      (bottomRight.x - topRight.x) * (bottomLeft.y - topRight.y) -
      (bottomLeft.x - topRight.x) * (bottomRight.y - topRight.y)
    ) / 2;

    if (area < minArea) return null;

    // Apply small padding and clamp
    const pad = 2;
    const norm = (val: number, max: number) => clamp((val + pad) / max, 0, 1);

    return {
      topLeft: { x: norm(topLeft.x - pad, width), y: norm(topLeft.y - pad, height) },
      topRight: { x: norm(topRight.x + pad, width), y: norm(topRight.y - pad, height) },
      bottomRight: { x: norm(bottomRight.x + pad, width), y: norm(bottomRight.y + pad, height) },
      bottomLeft: { x: norm(bottomLeft.x - pad, width), y: norm(bottomLeft.y + pad, height) },
    };
  }, []);

  useEffect(() => {
    if (!stream) {
      setDetectedQuad(null);
      return;
    }

    let lastQuad: DetectedQuad | null = null;
    const smoothingFactor = 0.3; // Lower = smoother transitions

    const tick = () => {
      const quad = detectDocumentQuad();
      if (quad) {
        // Smooth the quad transitions to reduce jitter
        if (lastQuad) {
          const smoothed: DetectedQuad = {
            topLeft: {
              x: lastQuad.topLeft.x + (quad.topLeft.x - lastQuad.topLeft.x) * smoothingFactor,
              y: lastQuad.topLeft.y + (quad.topLeft.y - lastQuad.topLeft.y) * smoothingFactor,
            },
            topRight: {
              x: lastQuad.topRight.x + (quad.topRight.x - lastQuad.topRight.x) * smoothingFactor,
              y: lastQuad.topRight.y + (quad.topRight.y - lastQuad.topRight.y) * smoothingFactor,
            },
            bottomRight: {
              x: lastQuad.bottomRight.x + (quad.bottomRight.x - lastQuad.bottomRight.x) * smoothingFactor,
              y: lastQuad.bottomRight.y + (quad.bottomRight.y - lastQuad.bottomRight.y) * smoothingFactor,
            },
            bottomLeft: {
              x: lastQuad.bottomLeft.x + (quad.bottomLeft.x - lastQuad.bottomLeft.x) * smoothingFactor,
              y: lastQuad.bottomLeft.y + (quad.bottomLeft.y - lastQuad.bottomLeft.y) * smoothingFactor,
            },
          };
          lastQuad = smoothed;
          setDetectedQuad(smoothed);
        } else {
          lastQuad = quad;
          setDetectedQuad(quad);
        }
      }
      detectionRafRef.current = requestAnimationFrame(tick);
    };

    detectionRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (detectionRafRef.current) {
        cancelAnimationFrame(detectionRafRef.current);
        detectionRafRef.current = null;
      }
    };
  }, [stream, detectDocumentQuad]);

  const startCamera = async (orientation?: 'portrait' | 'landscape') => {
    const targetOrientation = orientation || cameraOrientation;
    try {
      // Stop existing stream first
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }

      // Get best available camera resolution
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
          
          // Sync orientation based on actual stream dimensions
          if (v.videoWidth && v.videoHeight) {
            const isActualPortrait = v.videoHeight > v.videoWidth;
            setCameraOrientation(isActualPortrait ? 'portrait' : 'landscape');
          }
        };
      }
    } catch (err) {
      console.error('Camera start error:', err);
      toast({
        title: 'Camera Error',
        description: (err as Error).message,
        status: 'error',
        duration: 3000,
      });
    }
  };

  const toggleCameraOrientation = async () => {
    const newOrientation = cameraOrientation === 'portrait' ? 'landscape' : 'portrait';
    setCameraOrientation(newOrientation);
    // Restart camera with new constraints
    if (stream) {
      await startCamera(newOrientation);
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStream(null);
    }
    if (detectionRafRef.current) {
      cancelAnimationFrame(detectionRafRef.current);
      detectionRafRef.current = null;
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
      // Removed queue length check to avoid dependency on uploadQueue.length
      setTimeout(() => {
        showMessage(
          '📊 Processing in background... Check Dashboard for results.'
        );
      }, 1500);

      // Clear quality check
      setQualityCheck(null);
    },
    [
      processingOptions,
      showMessage,
      toast
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

    // Check if the image is blank before processing
    const frameData = getCurrentFrameData();
    if (frameData && isBlankImage(frameData)) {
      toast({
        title: 'Blank Image Detected',
        description: 'No document content found - capture skipped',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

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
  }, [checkImageQuality, qualityCheck, uploadImage, validateQuality, toast]);

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

    // Handle auto-capture start with 5-second countdown
    socket.on('start_auto_capture', (data: any) => {
      console.log('Received auto-capture command from Dashboard:', data);
      const documentCount = data?.documentCount || 1;
      
      // Show immediate visual feedback toast
      toast({
        title: '📱 Auto-Capture Incoming!',
        description: `Starting 5-second countdown for ${documentCount} document${documentCount !== 1 ? 's' : ''}...`,
        status: 'info',
        duration: 2000,
        isClosable: true,
        position: 'top',
      });
      
      // Ensure camera mode is active
      if (captureMode !== 'camera' || !stream) {
        showMessage('💡 Switching to Camera mode...');
        handleCaptureMode('camera');
      }
      
      // Start 5-second countdown
      setCountdown(5);
      setPendingDocumentCount(documentCount);
      
      // Clear any existing countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev === null || prev <= 1) {
            // Countdown finished - start auto-capture
            clearInterval(countdownIntervalRef.current!);
            countdownIntervalRef.current = null;
            
            // Start auto-capture after short delay to ensure camera is ready
            setTimeout(() => {
              startAutoCapture('dashboard', documentCount);
            }, 100);
            
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });
    
    // Handle stop auto-capture from dashboard
    socket.on('stop_auto_capture', () => {
      console.log('Received stop auto-capture from Dashboard');
      stopAutoCapture();
      toast({
        title: '⏹️ Auto-Capture Stopped',
        description: 'Dashboard disabled auto-capture',
        status: 'info',
        duration: 2000,
      });
    });
    
    // Handle sync request from dashboard
    socket.on('request_auto_capture_state', () => {
      socket.emit('auto_capture_state_changed', { 
        enabled: autoCapture, 
        source: 'phone',
        capturedCount: autoCaptureCountRef.current 
      });
    });

    return () => {
      socket.off('capture_now');
      socket.off('start_auto_capture');
      socket.off('stop_auto_capture');
      socket.off('request_auto_capture_state');
    };
  }, [
    socket,
    captureFromCamera,
    captureMode,
    showMessage,
    startAutoCapture,
    stopAutoCapture,
    handleCaptureMode,
    stream,
    toast,
    autoCapture,
  ]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Ensure auto-capture stops when component unmounts
      if (autoCaptureIntervalRef.current) {
        clearInterval(autoCaptureIntervalRef.current);
      }
      if (detectionRafRef.current) {
        cancelAnimationFrame(detectionRafRef.current);
        detectionRafRef.current = null;
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
              <Stack spacing={4}>
                {/* Camera Feed Container */}
                <Box
                  ref={cameraContainerRef}
                  position="relative"
                  borderRadius="xl"
                  overflow="hidden"
                  bg="black"
                  border="2px solid"
                  borderColor={detectedQuad ? "green.400" : "gray.600"}
                  transition="border-color 0.3s"
                  sx={{
                    width: '100%',
                    maxWidth: isFullScreen ? '100vw' : '100%',
                    height: isFullScreen ? '100vh' : 'auto',
                    aspectRatio: 'auto',
                    mx: 'auto',
                  }}
                >
                  {/* Video Element */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: isFullScreen ? '100vh' : 'auto',
                      maxHeight: isFullScreen ? '100vh' : '70vh',
                      display: 'block',
                      backgroundColor: 'black',
                      objectFit: 'contain',
                    }}
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Document Detection Overlay - SVG with 4-point polygon */}
                  {stream && (
                    <svg
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                      }}
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      {/* Semi-transparent overlay outside detected area */}
                      <defs>
                        <mask id="docMask">
                          <rect x="0" y="0" width="100" height="100" fill="white" />
                          {detectedQuad && (
                            <polygon
                              points={`
                                ${detectedQuad.topLeft.x * 100},${detectedQuad.topLeft.y * 100}
                                ${detectedQuad.topRight.x * 100},${detectedQuad.topRight.y * 100}
                                ${detectedQuad.bottomRight.x * 100},${detectedQuad.bottomRight.y * 100}
                                ${detectedQuad.bottomLeft.x * 100},${detectedQuad.bottomLeft.y * 100}
                              `}
                              fill="black"
                            />
                          )}
                        </mask>
                      </defs>
                      
                      {/* Darkened area outside document */}
                      <rect
                        x="0" y="0" width="100" height="100"
                        fill="rgba(0,0,0,0.5)"
                        mask="url(#docMask)"
                      />

                      {/* Detected document outline */}
                      {detectedQuad && (
                        <>
                          {/* Main polygon outline */}
                          <polygon
                            points={`
                              ${detectedQuad.topLeft.x * 100},${detectedQuad.topLeft.y * 100}
                              ${detectedQuad.topRight.x * 100},${detectedQuad.topRight.y * 100}
                              ${detectedQuad.bottomRight.x * 100},${detectedQuad.bottomRight.y * 100}
                              ${detectedQuad.bottomLeft.x * 100},${detectedQuad.bottomLeft.y * 100}
                            `}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="0.5"
                            strokeLinejoin="round"
                          />
                          
                          {/* Corner circles with glow effect */}
                          <circle cx={detectedQuad.topLeft.x * 100} cy={detectedQuad.topLeft.y * 100} r="2" fill="#22c55e" filter="url(#glow)" />
                          <circle cx={detectedQuad.topRight.x * 100} cy={detectedQuad.topRight.y * 100} r="2" fill="#22c55e" filter="url(#glow)" />
                          <circle cx={detectedQuad.bottomRight.x * 100} cy={detectedQuad.bottomRight.y * 100} r="2" fill="#22c55e" filter="url(#glow)" />
                          <circle cx={detectedQuad.bottomLeft.x * 100} cy={detectedQuad.bottomLeft.y * 100} r="2" fill="#22c55e" filter="url(#glow)" />
                          
                          {/* Corner L-brackets */}
                          {/* Top-left bracket */}
                          <path
                            d={`M ${detectedQuad.topLeft.x * 100 + 5},${detectedQuad.topLeft.y * 100} 
                                L ${detectedQuad.topLeft.x * 100},${detectedQuad.topLeft.y * 100} 
                                L ${detectedQuad.topLeft.x * 100},${detectedQuad.topLeft.y * 100 + 5}`}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                          {/* Top-right bracket */}
                          <path
                            d={`M ${detectedQuad.topRight.x * 100 - 5},${detectedQuad.topRight.y * 100} 
                                L ${detectedQuad.topRight.x * 100},${detectedQuad.topRight.y * 100} 
                                L ${detectedQuad.topRight.x * 100},${detectedQuad.topRight.y * 100 + 5}`}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                          {/* Bottom-right bracket */}
                          <path
                            d={`M ${detectedQuad.bottomRight.x * 100 - 5},${detectedQuad.bottomRight.y * 100} 
                                L ${detectedQuad.bottomRight.x * 100},${detectedQuad.bottomRight.y * 100} 
                                L ${detectedQuad.bottomRight.x * 100},${detectedQuad.bottomRight.y * 100 - 5}`}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                          {/* Bottom-left bracket */}
                          <path
                            d={`M ${detectedQuad.bottomLeft.x * 100 + 5},${detectedQuad.bottomLeft.y * 100} 
                                L ${detectedQuad.bottomLeft.x * 100},${detectedQuad.bottomLeft.y * 100} 
                                L ${detectedQuad.bottomLeft.x * 100},${detectedQuad.bottomLeft.y * 100 - 5}`}
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="1"
                            strokeLinecap="round"
                          />
                          
                          {/* Glow filter */}
                          <defs>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                        </>
                      )}

                      {/* Fallback guide when no document detected */}
                      {!detectedQuad && (
                        <>
                          <rect
                            x="10" y="10" width="80" height="80"
                            fill="none"
                            stroke="rgba(69, 202, 255, 0.5)"
                            strokeWidth="0.3"
                            strokeDasharray="2,2"
                            rx="1"
                          />
                          {/* Center crosshair */}
                          <line x1="48" y1="50" x2="52" y2="50" stroke="rgba(69, 202, 255, 0.5)" strokeWidth="0.3" />
                          <line x1="50" y1="48" x2="50" y2="52" stroke="rgba(69, 202, 255, 0.5)" strokeWidth="0.3" />
                        </>
                      )}
                    </svg>
                  )}

                  {/* Detection Status Badge */}
                  <Box
                    position="absolute"
                    top={3}
                    left={3}
                    bg={detectedQuad ? "green.500" : "gray.600"}
                    color="white"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontSize="xs"
                    fontWeight="bold"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    transition="all 0.3s"
                  >
                    <Box
                      w={2}
                      h={2}
                      borderRadius="full"
                      bg={detectedQuad ? "green.200" : "gray.400"}
                      animation={detectedQuad ? "pulse 1s infinite" : "none"}
                    />
                    {detectedQuad ? "Document Detected" : "Searching..."}
                  </Box>

                  {/* Eye Toggle Button */}
                  <Tooltip label={showControls ? 'Hide controls' : 'Show controls'} hasArrow placement="left">
                    <Button
                      position="absolute"
                      top={3}
                      right={3}
                      size="sm"
                      colorScheme="brand"
                      variant={showControls ? 'solid' : 'ghost'}
                      onClick={() => setShowControls(!showControls)}
                      zIndex={10}
                      borderRadius="full"
                      p={2}
                      minWidth="auto"
                    >
                      <Iconify icon={showControls ? FiEye : FiEyeOff} boxSize={4} />
                    </Button>
                  </Tooltip>

                  {/* Countdown Overlay */}
                  {countdown !== null && (
                    <Flex
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      align="center"
                      justify="center"
                      bg="rgba(0,0,0,0.8)"
                      zIndex={20}
                      flexDirection="column"
                    >
                      <Text
                        fontSize="8xl"
                        fontWeight="bold"
                        color="white"
                        textShadow="0 0 40px rgba(66, 153, 225, 1)"
                      >
                        {countdown}
                      </Text>
                      <Text fontSize="lg" color="white" mt={4}>📱 Auto-Capture Starting...</Text>
                      <Text fontSize="sm" color="whiteAlpha.700" mt={2}>
                        {pendingDocumentCount} document{pendingDocumentCount !== 1 ? 's' : ''} queued
                      </Text>
                      <Button
                        mt={4}
                        colorScheme="red"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                          }
                          setCountdown(null);
                          setPendingDocumentCount(0);
                          toast({ title: 'Cancelled', status: 'warning', duration: 2000 });
                        }}
                      >
                        Cancel
                      </Button>
                    </Flex>
                  )}

                  {/* Auto-capture Status */}
                  {autoCapture && (
                    <Box
                      position="absolute"
                      bottom={3}
                      left={3}
                      bg={
                        frameChangeStatus === 'captured' ? 'green.500' :
                        frameChangeStatus === 'ready' ? 'green.400' :
                        frameChangeStatus === 'detecting' ? 'orange.400' :
                        'blue.500'
                      }
                      color="white"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="bold"
                      display="flex"
                      alignItems="center"
                      gap={2}
                    >
                      <Box w={2} h={2} borderRadius="full" bg="white" animation="pulse 1s infinite" />
                      {frameChangeStatus === 'captured' ? '✓ Captured!' :
                       frameChangeStatus === 'ready' ? '📸 Ready...' :
                       frameChangeStatus === 'detecting' ? '👀 Detecting...' :
                       `📷 ${autoCaptureCount} captured`}
                      {autoCaptureSource === 'dashboard' && (
                        <Tag size="sm" colorScheme="blue" ml={1}>Dashboard</Tag>
                      )}
                    </Box>
                  )}

                  {/* Fullscreen Controls */}
                  {isFullScreen && showControls && (
                    <VStack
                      position="absolute"
                      bottom={6}
                      left="50%"
                      transform="translateX(-50%)"
                      spacing={2}
                      zIndex={5}
                    >
                      <Flex gap={2}>
                        <Button
                          colorScheme={autoCapture ? 'green' : 'brand'}
                          size="lg"
                          onClick={() => autoCapture ? stopAutoCapture() : startAutoCapture('local')}
                          isDisabled={!stream || uploading}
                          leftIcon={<Iconify icon={FiAperture} boxSize={5} />}
                        >
                          {autoCapture ? `Stop (${autoCaptureCount})` : 'Auto'}
                        </Button>
                        <Button
                          colorScheme="brand"
                          size="lg"
                          onClick={captureFromCamera}
                          isDisabled={!stream || uploading || autoCapture}
                          isLoading={uploading}
                          leftIcon={<Iconify icon={FiCamera} boxSize={5} />}
                        >
                          Capture
                        </Button>
                      </Flex>
                    </VStack>
                  )}
                </Box>

                {/* Control Buttons - Normal Mode */}
                {!isFullScreen && showControls && (
                  <Flex wrap="wrap" gap={2} justify="center">
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
                    <Button
                      variant={autoCapture ? 'solid' : 'outline'}
                      colorScheme={autoCapture ? 'green' : 'orange'}
                      onClick={() => autoCapture ? stopAutoCapture() : startAutoCapture('local')}
                      isDisabled={!stream || uploading}
                      leftIcon={<Iconify icon={FiAperture} boxSize={5} />}
                    >
                      {autoCapture ? `Stop (${autoCaptureCount})` : 'Auto Capture'}
                    </Button>
                    <Button
                      variant="outline"
                      colorScheme="brand"
                      onClick={toggleFullScreen}
                      isDisabled={!stream}
                      leftIcon={<Iconify icon={isFullScreen ? FiMinimize2 : FiMaximize2} boxSize={5} />}
                    >
                      Fullscreen
                    </Button>
                  </Flex>
                )}

                {/* Auto-Capture Status Panel */}
                {autoCapture && showControls && !isFullScreen && (
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
                      <Text fontWeight="600" fontSize="sm">
                        {frameChangeStatus === 'ready' ? '📸 New document detected - capturing...' :
                         frameChangeStatus === 'detecting' ? '👀 Waiting for stable document...' :
                         frameChangeStatus === 'captured' ? '✓ Captured! Place next document.' :
                         `📷 Captured ${autoCaptureCount} documents`}
                      </Text>
                      <Text fontSize="xs" color={muted}>
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
