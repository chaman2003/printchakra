import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, SOCKET_CONFIG, SOCKET_IO_ENABLED, getImageUrl, getDefaultHeaders } from '../config';
import './Dashboard.css';

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

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<string | null>(null);

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
      alert('Failed to delete file: ' + err.message);
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
      alert('Failed to load OCR text: ' + err.message);
    }
  };

  const triggerPrint = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'blank'
      }, {
        headers: getDefaultHeaders()
      });
      alert('Print triggered: ' + response.data.message);
    } catch (err: any) {
      alert('Failed to trigger print: ' + err.message);
    }
  };

  const testPrinter = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'test'
      }, {
        headers: getDefaultHeaders()
      });
      alert('Printer test successful: ' + response.data.message);
    } catch (err: any) {
      alert('Printer test failed: ' + err.message);
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
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setSelectedImageFile(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">📊 Dashboard</h2>
        <p className="page-description">Manage your processed documents</p>
        <div className="status-indicator">
          <span className={`status-dot ${error ? 'error' : ''}`}></span>
          {error ? 
            `⚠️ Connection issues (retry ${connectionRetries})` : 
            (connected ? 'Connected to server' : 'Disconnected')
          }
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={handleRefreshClick} className="btn btn-primary">
           Refresh Files
        </button>
        <button onClick={testPrinter} className="btn btn-info">
           Test Printer
        </button>
        <button onClick={triggerPrint} className="btn btn-success">
           Print & Capture
        </button>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {processingProgress && (
        <div className="processing-progress">
          <div className="progress-header">
            <h4>📊 Processing: Step {processingProgress.step}/{processingProgress.total_steps} – {processingProgress.stage_name}</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(processingProgress.step / processingProgress.total_steps) * 100}%` }}
              ></div>
            </div>
            <p className="progress-message">{processingProgress.message}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading files...</div>
      ) : (
        <div className="dashboard-content">
          <div className="files-section">
            <h3> Files ({files.length})</h3>
            {files.length === 0 ? (
              <div className="no-files">
                <p>No files yet. Use the Phone interface to capture documents.</p>
              </div>
            ) : (
              <div className="files-grid">
                {files.map((file) => (
                  <div key={file.filename} className={`file-card ${file.processing ? 'processing' : ''}`}>
                    <div className="file-preview">
                      {file.processing && (
                        <div className="processing-overlay">
                          <div className="spinner"></div>
                          <div className="processing-text">
                            Processing: Step {file.processing_step}/{file.processing_total}
                            <br />
                            <span className="stage-name">{file.processing_stage}</span>
                          </div>
                        </div>
                      )}
                      <img
                        src={file.processing 
                          ? getImageUrl('/uploads', file.filename) 
                          : getImageUrl(API_ENDPOINTS.processed, file.filename)
                        }
                        alt={file.filename}
                        crossOrigin="anonymous"
                        className="thumbnail-image"
                        onClick={() => !file.processing && openImageModal(file.filename)}
                        style={{ cursor: file.processing ? 'not-allowed' : 'pointer' }}
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const retryCount = parseInt(img.getAttribute('data-retry') || '0');
                          
                          if (retryCount < 3) {
                            // Retry loading the image
                            setTimeout(() => {
                              img.setAttribute('data-retry', (retryCount + 1).toString());
                              const endpoint = file.processing ? '/uploads' : API_ENDPOINTS.processed;
                              img.src = getImageUrl(endpoint, file.filename) + '?retry=' + Date.now();
                            }, 1000 * (retryCount + 1));
                          } else {
                            // Show placeholder if all retries fail
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBMb2FkIEZhaWxlZDwvdGV4dD48L3N2Zz4=';
                          }
                        }}
                      />
                    </div>
                    <div className="file-info">
                      <h4 className="file-name">{file.filename}</h4>
                      <p className="file-meta">
                        {formatFileSize(file.size)} • {formatDate(file.created)}
                      </p>
                      {file.processing && (
                        <p className="processing-status">
                          ⏳ Processing: Step {file.processing_step}/{file.processing_total} – {file.processing_stage}
                        </p>
                      )}
                      {!file.processing && file.has_text && <span className="ocr-badge">✓ Has OCR</span>}
                    </div>
                    <div className="file-actions">
                      {!file.processing && (
                        <button
                          onClick={() => openImageModal(file.filename)}
                          className="btn btn-sm btn-secondary"
                        >
                          View
                        </button>
                      )}
                      {file.has_text && !file.processing && (
                        <button
                          onClick={() => viewOCR(file.filename)}
                          className="btn btn-sm btn-info"
                        >
                          OCR
                        </button>
                      )}
                      <button
                        onClick={() => deleteFile(file.filename)}
                        className="btn btn-sm btn-danger"
                        disabled={file.processing}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedFile && ocrText && (
            <div className="ocr-section">
              <h3> OCR Text: {selectedFile}</h3>
              <div className="ocr-text">
                <pre>{ocrText}</pre>
              </div>
              <button onClick={() => { setSelectedFile(null); setOcrText(''); }} className="btn btn-secondary">
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {imageModalOpen && selectedImageFile && (
        <div className="image-modal-overlay" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>{selectedImageFile}</h3>
              <button className="close-btn" onClick={closeImageModal}>✕</button>
            </div>
            <div className="image-modal-body">
              <img
                src={getImageUrl(API_ENDPOINTS.processed, selectedImageFile)}
                alt={selectedImageFile}
                crossOrigin="anonymous"
                className="modal-image"
              />
            </div>
            <div className="image-modal-footer">
              <button onClick={closeImageModal} className="btn btn-secondary">Close</button>
              <a 
                href={getImageUrl(API_ENDPOINTS.processed, selectedImageFile)} 
                download 
                className="btn btn-primary"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
