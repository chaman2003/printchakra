import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import './Dashboard.css';

interface FileInfo {
  filename: string;
  size: number;
  created: string;
  has_text: boolean;
}

interface ProcessingOptions {
  autoCrop: boolean;
  aiEnhance: boolean;
  strictQuality: boolean;
  exportPdf: boolean;
  pageSize: 'A4' | 'Letter' | 'Legal' | 'A3';
  compress: boolean;
  quality: number;
}

interface PipelineInfo {
  available: boolean;
  modules: {
    scanning: boolean;
    processing: boolean;
    ocr: boolean;
    classification: boolean;
    enhancement: boolean;
    storage: boolean;
    export: boolean;
  };
  features: Record<string, boolean>;
  config: Record<string, any>;
}

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [pipelineInfo, setPipelineInfo] = useState<PipelineInfo | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    autoCrop: true,
    aiEnhance: false,
    strictQuality: false,
    exportPdf: false,
    pageSize: 'A4',
    compress: true,
    quality: 85,
  });

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
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

    setSocket(newSocket);

    // Load files and pipeline info initially
    loadFiles();
    loadPipelineInfo();

    return () => {
      newSocket.close();
    };
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.files}`);
      // Handle both array response and object with files property
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

  const loadPipelineInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.pipelineInfo}`);
      setPipelineInfo(response.data);
      console.log('Pipeline info:', response.data);
    } catch (err) {
      console.error('Failed to load pipeline info:', err);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
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
      alert(`Failed to delete file: ${err.message}`);
    }
  };

  const viewOCR = async (filename: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ocr}/${filename}`);
      setOcrText(response.data.text || 'No text found');
      setSelectedFile(filename);
    } catch (err: any) {
      alert(`Failed to load OCR text: ${err.message}`);
    }
  };

  const exportToPDF = async (filenames: string[]) => {
    try {
      const formData = new FormData();
      filenames.forEach(filename => {
        // We need to fetch the image and add it to FormData
        // For simplicity, we'll use the filename
        formData.append('filenames[]', filename);
      });
      formData.append('page_size', processingOptions.pageSize);

      const response = await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.exportPdf}`,
        formData,
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `printchakra_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('✅ PDF exported successfully');
    } catch (err: any) {
      alert(`❌ Failed to export PDF: ${err.message}`);
    }
  };

  const triggerPrint = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'blank'
      });
      alert('✅ ' + response.data.message);
    } catch (err: any) {
      alert(`❌ Failed to trigger print: ${err.message}`);
    }
  };

  const testPrinter = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'test'
      });
      alert('✅ ' + response.data.message);
    } catch (err: any) {
      alert(`❌ Printer test failed: ${err.message}`);
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
        <h2 className="page-title">📊 Dashboard</h2>
        <p className="page-description">Manage your processed documents</p>
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected to server' : 'Disconnected'}
        </div>
      </div>

      {pipelineInfo && pipelineInfo.available && (
        <div className="pipeline-status">
          <h4>🔧 Advanced Processing Available</h4>
          <div className="features-grid">
            {Object.entries(pipelineInfo.features).map(([key, value]) => (
              <span key={key} className={`feature-badge ${value ? 'enabled' : 'disabled'}`}>
                {value ? '✓' : '✗'} {key.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          <button 
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="btn btn-secondary btn-sm"
          >
            {showAdvancedOptions ? '▼' : '▶'} Processing Options
          </button>
          
          {showAdvancedOptions && (
            <div className="advanced-options">
              <div className="option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={processingOptions.autoCrop}
                    onChange={(e) => setProcessingOptions({...processingOptions, autoCrop: e.target.checked})}
                  />
                  Auto-crop documents
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={processingOptions.aiEnhance}
                    onChange={(e) => setProcessingOptions({...processingOptions, aiEnhance: e.target.checked})}
                  />
                  AI enhancement
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={processingOptions.strictQuality}
                    onChange={(e) => setProcessingOptions({...processingOptions, strictQuality: e.target.checked})}
                  />
                  Strict quality check
                </label>
              </div>
              <div className="option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={processingOptions.exportPdf}
                    onChange={(e) => setProcessingOptions({...processingOptions, exportPdf: e.target.checked})}
                  />
                  Auto-export to PDF
                </label>
                <label>
                  Page Size:
                  <select
                    value={processingOptions.pageSize}
                    onChange={(e) => setProcessingOptions({...processingOptions, pageSize: e.target.value as any})}
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">Letter</option>
                    <option value="Legal">Legal</option>
                    <option value="A3">A3</option>
                  </select>
                </label>
              </div>
              <div className="option-group">
                <label>
                  <input
                    type="checkbox"
                    checked={processingOptions.compress}
                    onChange={(e) => setProcessingOptions({...processingOptions, compress: e.target.checked})}
                  />
                  Compress images
                </label>
                <label>
                  Quality: {processingOptions.quality}%
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={processingOptions.quality}
                    onChange={(e) => setProcessingOptions({...processingOptions, quality: parseInt(e.target.value)})}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-actions">
        <button onClick={loadFiles} className="btn btn-primary">
          🔄 Refresh Files
        </button>
        <button onClick={testPrinter} className="btn btn-info">
          🖨️ Test Printer
        </button>
        <button onClick={triggerPrint} className="btn btn-success">
          📸 Print & Capture
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
            <h3>📁 Files ({files.length})</h3>
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
                        src={`${API_BASE_URL}${API_ENDPOINTS.processed}/${file.filename}`}
                        alt={file.filename}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    </div>
                    <div className="file-info">
                      <h4 className="file-name">{file.filename}</h4>
                      <p className="file-meta">
                        {formatFileSize(file.size)} • {formatDate(file.created)}
                      </p>
                      {file.has_text && <span className="ocr-badge">📝 Has OCR</span>}
                    </div>
                    <div className="file-actions">
                      <button
                        onClick={() => window.open(`${API_BASE_URL}${API_ENDPOINTS.processed}/${file.filename}`, '_blank')}
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
              <h3>📄 OCR Text: {selectedFile}</h3>
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

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.files}`);
      // Handle both array response and object with files property
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
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) {
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
      alert(`Failed to delete file: ${err.message}`);
    }
  };

  const viewOCR = async (filename: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ocr}/${filename}`);
      setOcrText(response.data.text || 'No text found');
      setSelectedFile(filename);
    } catch (err: any) {
      alert(`Failed to load OCR text: ${err.message}`);
    }
  };

  const triggerPrint = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'blank'
      });
      alert('✅ ' + response.data.message);
    } catch (err: any) {
      alert(`❌ Failed to trigger print: ${err.message}`);
    }
  };

  const testPrinter = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.print}`, {
        type: 'test'
      });
      alert('✅ ' + response.data.message);
    } catch (err: any) {
      alert(`❌ Printer test failed: ${err.message}`);
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
        <h2 className="page-title">📊 Dashboard</h2>
        <p className="page-description">Manage your processed documents</p>
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {connected ? 'Connected to server' : 'Disconnected'}
        </div>
      </div>

      <div className="dashboard-actions">
        <button onClick={loadFiles} className="btn btn-primary">
          🔄 Refresh Files
        </button>
        <button onClick={testPrinter} className="btn btn-info">
          🖨️ Test Printer
        </button>
        <button onClick={triggerPrint} className="btn btn-success">
          � Print & Capture
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
            <h3>📁 Files ({files.length})</h3>
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
                        src={`${API_BASE_URL}${API_ENDPOINTS.processed}/${file.filename}`}
                        alt={file.filename}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBOb3QgRm91bmQ8L3RleHQ+PC9zdmc+';
                        }}
                      />
                    </div>
                    <div className="file-info">
                      <h4 className="file-name">{file.filename}</h4>
                      <p className="file-meta">
                        {formatFileSize(file.size)} • {formatDate(file.created)}
                      </p>
                      {file.has_text && <span className="ocr-badge">📝 Has OCR</span>}
                    </div>
                    <div className="file-actions">
                      <button
                        onClick={() => window.open(`${API_BASE_URL}${API_ENDPOINTS.processed}/${file.filename}`, '_blank')}
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
              <h3>📄 OCR Text: {selectedFile}</h3>
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
