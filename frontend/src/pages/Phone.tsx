import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './Phone.css';

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [uploading, setUploading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [qualityCheck, setQualityCheck] = useState<QualityCheck | null>(null);
  const [validateQuality, setValidateQuality] = useState(true);
  const [processingOptions, setProcessingOptions] = useState({
    autoCrop: true,
    aiEnhance: false,
    strictQuality: false,
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

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    newSocket.on('capture_now', (data) => {
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

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
      stopCamera();
      stopAutoCapture();
    };
  }, [captureMode, stream]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      try {
        if (cameraContainerRef.current?.requestFullscreen) {
          await cameraContainerRef.current.requestFullscreen();
          setIsFullScreen(true);
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
    
    autoCaptureIntervalRef.current = setInterval(() => {
      setAutoCaptureCountdown((prev) => {
        if (prev <= 1) {
          if (autoCaptureIntervalRef.current) {
            clearInterval(autoCaptureIntervalRef.current);
            autoCaptureIntervalRef.current = null;
          }
          // Trigger capture when countdown reaches 0
          setTimeout(() => {
            captureFromCamera();
            setAutoCapture(false);
          }, 300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopAutoCapture = () => {
    if (autoCaptureIntervalRef.current) {
      clearInterval(autoCaptureIntervalRef.current);
      autoCaptureIntervalRef.current = null;
    }
    setAutoCapture(false);
    setAutoCaptureCountdown(0);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

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

  const checkImageQuality = async (file: Blob): Promise<QualityCheck | null> => {
    if (!validateQuality) return null;

    try {
      const formData = new FormData();
      formData.append('file', file, 'temp.jpg');

      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.validateQuality}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

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
        showMessage(`✓ Quality: Blur ${quality.blur_score.toFixed(1)}, Focus ${quality.focus_score.toFixed(1)}`);
      }

      return quality;
    } catch (err) {
      console.error('Quality check failed:', err);
      return null; // Continue without quality check on error
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewImage(url);
        
        // Check quality before uploading
        const quality = await checkImageQuality(blob);
        if (quality === null && validateQuality && qualityCheck && !qualityCheck.quality.overall_acceptable) {
          setPreviewImage(null);
          return;
        }
        
        uploadImage(blob, `capture_${Date.now()}.jpg`);
      }
    }, 'image/jpeg', 0.9);
  };

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
    if (quality === null && validateQuality && qualityCheck && !qualityCheck.quality.overall_acceptable) {
      setPreviewImage(null);
      return;
    }
    
    uploadImage(file, file.name);
  };

  const uploadImage = async (file: Blob, filename: string) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file, filename);
      
      // Add processing options
      formData.append('auto_crop', processingOptions.autoCrop.toString());
      formData.append('ai_enhance', processingOptions.aiEnhance.toString());
      formData.append('strict_quality', processingOptions.strictQuality.toString());

      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.upload}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      showMessage(`✅ ${response.data.message || 'Upload successful'}`);
      console.log('Upload response:', response.data);
      
      // Clear quality check after successful upload
      setQualityCheck(null);
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
      showMessage(`❌ ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">📱 Phone Interface</h2>
        <p className="page-description">Capture and upload documents</p>
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected to server' : 'Disconnected'}
        </div>
      </div>

      {message && (
        <div className="message-banner">
          {message}
        </div>
      )}

      <div className="phone-options">
        <label className="option-label">
          <input
            type="checkbox"
            checked={validateQuality}
            onChange={(e) => setValidateQuality(e.target.checked)}
          />
          Validate quality before upload
        </label>
        <label className="option-label">
          <input
            type="checkbox"
            checked={processingOptions.autoCrop}
            onChange={(e) => setProcessingOptions({...processingOptions, autoCrop: e.target.checked})}
          />
          Auto-crop document
        </label>
        <label className="option-label">
          <input
            type="checkbox"
            checked={processingOptions.aiEnhance}
            onChange={(e) => setProcessingOptions({...processingOptions, aiEnhance: e.target.checked})}
          />
          AI enhancement
        </label>
      </div>

      {qualityCheck && (
        <div className={`quality-indicator ${qualityCheck.quality.overall_acceptable ? 'good' : 'warning'}`}>
          <h4>📊 Quality Check</h4>
          <div className="quality-metrics">
            <span className={`metric ${qualityCheck.is_blurry ? 'bad' : 'good'}`}>
              Blur: {qualityCheck.blur_score.toFixed(1)} {qualityCheck.is_blurry ? '❌' : '✓'}
            </span>
            <span className={`metric ${qualityCheck.is_focused ? 'good' : 'bad'}`}>
              Focus: {qualityCheck.focus_score.toFixed(1)} {qualityCheck.is_focused ? '✓' : '❌'}
            </span>
          </div>
          {qualityCheck.quality.issues.length > 0 && (
            <div className="quality-issues">
              <strong>Issues:</strong>
              <ul>
                {qualityCheck.quality.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="phone-content">
        <div className="capture-mode-selector">
          <button
            className={`mode-btn ${captureMode === 'file' ? 'active' : ''}`}
            onClick={() => handleCaptureMode('file')}
          >
            📁 Choose File
          </button>
          <button
            className={`mode-btn ${captureMode === 'camera' ? 'active' : ''}`}
            onClick={() => handleCaptureMode('camera')}
          >
            📷 Use Camera
          </button>
        </div>

        {captureMode === 'file' ? (
          <div className="file-upload-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-large btn-primary"
              disabled={uploading}
            >
              {uploading ? '⏳ Uploading...' : '📂 Select Image'}
            </button>
            <p className="helper-text">
              Choose an image from your device
            </p>
          </div>
        ) : (
          <div className="camera-section">
            <div className="camera-view" ref={cameraContainerRef}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-preview"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              {/* Reference line for layout detection */}
              <div className="layout-reference-line"></div>
            </div>
            <div className="camera-controls">
              <button
                onClick={captureFromCamera}
                className="btn btn-large btn-success capture-btn"
                disabled={!stream || uploading || autoCapture}
              >
                {uploading ? '⏳ Uploading...' : '📸 Capture'}
              </button>
              <button
                onClick={autoCapture ? stopAutoCapture : startAutoCapture}
                className={`btn btn-large auto-capture-btn ${autoCapture ? 'active' : ''}`}
                disabled={!stream || uploading}
              >
                {autoCapture ? `⏱️ ${autoCaptureCountdown}s` : '⏱️ Auto Capture'}
              </button>
              <button
                onClick={toggleFullScreen}
                className="btn btn-large btn-info fullscreen-btn"
                disabled={!stream}
              >
                {isFullScreen ? '🗗 Exit Fullscreen' : '⛶ Fullscreen'}
              </button>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="preview-section">
            <h3>Preview</h3>
            <img src={previewImage} alt="Preview" className="preview-image" />
          </div>
        )}

        <div className="info-section">
          <h3>ℹ️ How to use:</h3>
          <ul>
            <li>Choose between file upload or camera capture</li>
            <li>Enable quality validation for automatic blur/focus detection</li>
            <li>Select or capture a document image</li>
            <li>The image will be automatically processed and uploaded</li>
            <li>View processed files in the Dashboard</li>
            <li>Trigger capture remotely from Dashboard's Print button</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Phone;
