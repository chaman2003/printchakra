import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './Phone.css';

const Phone: React.FC = () => {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [uploading, setUploading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'file' | 'camera'>('file');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

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
      // Trigger capture after a short delay
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
    };
  }, [captureMode, stream]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
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
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  const captureFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewImage(url);
        uploadImage(blob, `capture_${Date.now()}.jpg`);
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const uploadImage = async (file: Blob, filename: string) => {
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file, filename);

      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.upload}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      showMessage(`✅ ${response.data.message || 'Upload successful'}`);
      console.log('Upload response:', response.data);
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
            <div className="camera-view">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-preview"
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <button
              onClick={captureFromCamera}
              className="btn btn-large btn-success capture-btn"
              disabled={!stream || uploading}
            >
              {uploading ? '⏳ Uploading...' : '📸 Capture'}
            </button>
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
