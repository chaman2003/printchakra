import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS, SOCKET_CONFIG, getImageUrl } from '../config';
import './Dashboard.css';

interface FileInfo {
  filename: string;
  size: number;
  created: string;
  has_text: boolean;
}

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');

  useEffect(() => {
    const newSocket = io(API_BASE_URL, SOCKET_CONFIG);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnected(false);
    });

    newSocket.on('new_file', (data) => {
      console.log('New file uploaded:', data);
      loadFiles();
    });

    newSocket.on('file_deleted', (data) => {
      console.log('File deleted:', data);
      loadFiles();
    });

    loadFiles();

    return () => {
      newSocket.close();
    };
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.files}`);
      const filesData = Array.isArray(response.data) ? response.data : (response.data.files || []);
      setFiles(filesData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load files:', err);
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.delete}/${filename}`);
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
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ocr}/${filename}`);
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title"> Dashboard</h2>
        <p className="page-description">Manage your processed documents</p>
        <div className="status-indicator">
          <span className="status-dot"></span>
          {connected ? 'Connected to server' : 'Disconnected'}
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={loadFiles} className="btn btn-primary">
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
                  <div key={file.filename} className="file-card">
                    <div className="file-preview">
                      <img
                        src={getImageUrl(API_ENDPOINTS.processed, file.filename)}
                        alt={file.filename}
                        crossOrigin="anonymous"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const retryCount = parseInt(img.getAttribute('data-retry') || '0');
                          
                          if (retryCount < 3) {
                            // Retry loading the image
                            setTimeout(() => {
                              img.setAttribute('data-retry', (retryCount + 1).toString());
                              img.src = getImageUrl(API_ENDPOINTS.processed, file.filename) + '?retry=' + Date.now();
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
                        {formatFileSize(file.size)}  {formatDate(file.created)}
                      </p>
                      {file.has_text && <span className="ocr-badge"> Has OCR</span>}
                    </div>
                    <div className="file-actions">
                      <button
                        onClick={() => window.open(getImageUrl(API_ENDPOINTS.processed, file.filename), '_blank')}
                        className="btn btn-sm btn-secondary"
                      >
                        View
                      </button>
                      {file.has_text && (
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
    </div>
  );
};

export default Dashboard;
