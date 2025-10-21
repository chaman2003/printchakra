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

// Custom hook to load images with proper headers
const useImageWithHeaders = (imageUrl: string) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = await axios.get(imageUrl, {
          headers: getDefaultHeaders(),
          responseType: 'blob',
          timeout: 10000
        });

        if (isMounted) {
          const blob = response.data;
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load image:', imageUrl, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    if (imageUrl) {
      loadImage();
    }

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [imageUrl]);

  return { blobUrl, loading, error };
};

// Image component that loads with proper headers
const SecureImage: React.FC<{
  filename: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ filename, alt, className, onClick, style }) => {
  const imageUrl = `${API_BASE_URL}${API_ENDPOINTS.processed}/${filename}`;
  const { blobUrl, loading, error } = useImageWithHeaders(imageUrl);

  if (loading) {
    return (
      <div className={`${className} loading-placeholder`} style={style}>
        <div className="spinner-small"></div>
        <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#999' }}>Loading...</div>
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <img
        src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNjQiIGZpbGw9IiNjY2MiIHRleHQtYW5jaG9yPSJtaWRkbGUiPvCfk4Q8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI2MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SW1hZ2UgTm90IEZvdW5kPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNjglIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiNiYmIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlByb2Nlc3NpbmcuLi48L3RleHQ+PC9zdmc+"
        alt={alt}
        className={className}
        onClick={onClick}
        style={style}
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      style={style}
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
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [connectionRetries, setConnectionRetries] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<string | null>(null);
  
  // File conversion state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [conversionModalOpen, setConversionModalOpen] = useState(false);
  const [targetFormat, setTargetFormat] = useState<string>('pdf');
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState<string>('');
  const [mergePdf, setMergePdf] = useState<boolean>(true); // New: merge PDF option
  
  // Converted files state
  const [showConvertedFiles, setShowConvertedFiles] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<any[]>([]);

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

  // Conversion handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedFiles([]);
  };

  const toggleFileSelection = (filename: string) => {
    setSelectedFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const openConversionModal = () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to convert');
      return;
    }
    setConversionModalOpen(true);
  };

  const closeConversionModal = () => {
    setConversionModalOpen(false);
    setTargetFormat('pdf');
    setConversionProgress('');
  };

  const handleConvert = async () => {
    try {
      setConverting(true);
      setConversionProgress('Starting conversion...');

      const response = await axios.post(
        `${API_BASE_URL}/convert`,
        {
          files: selectedFiles,
          format: targetFormat,
          merge_pdf: mergePdf && targetFormat === 'pdf' // Only merge if format is PDF
        },
        {
          headers: getDefaultHeaders()
        }
      );

      if (response.data.success) {
        const { success_count, fail_count, results, merged } = response.data;
        
        if (merged) {
          setConversionProgress(
            `✅ Merged into single PDF!\n${selectedFiles.length} files combined`
          );
        } else {
          setConversionProgress(
            `✅ Conversion complete!\nSuccess: ${success_count}\nFailed: ${fail_count}`
          );
        }

        // Show detailed results
        const successFiles = results.filter((r: any) => r.success).map((r: any) => r.output);
        if (successFiles.length > 0) {
          setTimeout(() => {
            const message = merged 
              ? `Merged PDF created:\n${successFiles[0]}\n\nFile saved in backend/converted/ folder`
              : `Converted files:\n${successFiles.join('\n')}\n\nFiles saved in backend/converted/ folder`;
            alert(message);
            closeConversionModal();
            setSelectionMode(false);
            setSelectedFiles([]);
            loadConvertedFiles(); // Refresh converted files list
          }, 1500);
        }
      } else {
        setConversionProgress(`❌ Conversion failed: ${response.data.error}`);
      }
    } catch (err: any) {
      console.error('Conversion error:', err);
      setConversionProgress(`❌ Conversion error: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };
  
  // Load converted files
  const loadConvertedFiles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/get-converted-files`, {
        headers: getDefaultHeaders()
      });
      if (response.data.files) {
        setConvertedFiles(response.data.files);
      }
    } catch (err) {
      console.error('Failed to load converted files:', err);
    }
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
        <button 
          onClick={toggleSelectionMode} 
          className={`btn ${selectionMode ? 'btn-warning' : 'btn-secondary'}`}
        >
          {selectionMode ? '✖ Cancel Selection' : '☑ Select Files'}
        </button>
        {selectionMode && selectedFiles.length > 0 && (
          <button 
            onClick={openConversionModal} 
            className="btn btn-primary"
          >
            🔄 Convert ({selectedFiles.length})
          </button>
        )}
        <button 
          onClick={() => {
            setShowConvertedFiles(!showConvertedFiles);
            if (!showConvertedFiles) loadConvertedFiles();
          }} 
          className="btn btn-info"
        >
          📁 {showConvertedFiles ? 'Hide' : 'Show'} Converted Files
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
                  <div key={file.filename} className={`file-card ${file.processing ? 'processing' : ''} ${selectedFiles.includes(file.filename) ? 'selected' : ''}`}>
                    {selectionMode && !file.processing && (
                      <div className="file-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.filename)}
                          onChange={() => toggleFileSelection(file.filename)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    <div 
                      className="file-preview" 
                      onClick={() => !file.processing && openImageModal(file.filename)}
                      style={{ cursor: file.processing ? 'not-allowed' : 'pointer' }}
                    >
                      <SecureImage
                        filename={file.filename}
                        alt={file.filename}
                        className={`thumbnail-image ${file.processing ? 'processing-image' : ''}`}
                        onClick={() => !file.processing && openImageModal(file.filename)}
                      />
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
                      {!file.processing && (
                        <div className="image-hover-overlay">
                          <div className="hover-icon">🔍</div>
                          <div className="hover-text">Click to view full size</div>
                        </div>
                      )}
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
              <SecureImage
                filename={selectedImageFile}
                alt={selectedImageFile}
                className="modal-image"
              />
            </div>
            <div className="image-modal-footer">
              <button onClick={closeImageModal} className="btn btn-secondary">Close</button>
              <button 
                onClick={async () => {
                  try {
                    const response = await axios.get(
                      `${API_BASE_URL}${API_ENDPOINTS.processed}/${selectedImageFile}`,
                      {
                        headers: getDefaultHeaders(),
                        responseType: 'blob'
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
                  } catch (err) {
                    console.error('Download failed:', err);
                    alert('Failed to download image');
                  }
                }}
                className="btn btn-primary"
              >
                📥 Download
              </button>
            </div>
          </div>
        </div>
      )}

      {conversionModalOpen && (
        <div className="image-modal-overlay" onClick={closeConversionModal}>
          <div className="conversion-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="image-modal-header">
              <h3>🔄 Convert Files</h3>
              <button className="close-btn" onClick={closeConversionModal}>✕</button>
            </div>
            <div className="conversion-modal-body">
              <div className="conversion-info">
                <p><strong>Selected Files:</strong> {selectedFiles.length}</p>
                <ul className="selected-files-list">
                  {selectedFiles.map(filename => (
                    <li key={filename}>{filename}</li>
                  ))}
                </ul>
              </div>
              
              <div className="conversion-format">
                <label htmlFor="target-format"><strong>Convert to:</strong></label>
                <select 
                  id="target-format"
                  value={targetFormat} 
                  onChange={(e) => setTargetFormat(e.target.value)}
                  disabled={converting}
                  className="format-select"
                >
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPG</option>
                  <option value="docx">Word Document (DOCX)</option>
                </select>
              </div>

              {targetFormat === 'pdf' && selectedFiles.length > 1 && (
                <div className="conversion-option">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={mergePdf}
                      onChange={(e) => setMergePdf(e.target.checked)}
                      disabled={converting}
                    />
                    <span>Merge all images into single PDF</span>
                  </label>
                  <p className="option-description">
                    {mergePdf 
                      ? `All ${selectedFiles.length} files will be combined into one PDF document`
                      : `Each file will be converted to a separate PDF`
                    }
                  </p>
                </div>
              )}

              {conversionProgress && (
                <div className="conversion-progress">
                  <pre>{conversionProgress}</pre>
                </div>
              )}
            </div>
            <div className="image-modal-footer">
              <button 
                onClick={closeConversionModal} 
                className="btn btn-secondary"
                disabled={converting}
              >
                Cancel
              </button>
              <button 
                onClick={handleConvert}
                className="btn btn-primary"
                disabled={converting}
              >
                {converting ? '🔄 Converting...' : '✓ Convert'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvertedFiles && (
        <div className="converted-files-section">
          <div className="section-header">
            <h3>📁 Converted Files</h3>
            <button 
              onClick={() => setShowConvertedFiles(false)} 
              className="btn btn-sm btn-secondary"
            >
              Hide
            </button>
          </div>
          
          {convertedFiles.length === 0 ? (
            <div className="no-files">
              <p>No converted files yet. Use the conversion feature to create some!</p>
            </div>
          ) : (
            <div className="converted-files-grid">
              {convertedFiles.map((file) => (
                <div key={file.filename} className="converted-file-card">
                  <div className="file-icon">
                    {file.filename.endsWith('.pdf') ? '📄' : 
                     file.filename.endsWith('.docx') ? '📝' : '🖼️'}
                  </div>
                  <div className="file-info">
                    <h4 className="file-name">{file.filename}</h4>
                    <p className="file-meta">
                      {(file.size / 1024).toFixed(2)} KB • {new Date(file.created).toLocaleString()}
                    </p>
                  </div>
                  <div className="file-actions">
                    <a
                      href={`${API_BASE_URL}/converted/${file.filename}`}
                      download={file.filename}
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.preventDefault();
                        // Download with headers
                        axios.get(`${API_BASE_URL}/converted/${file.filename}`, {
                          headers: getDefaultHeaders(),
                          responseType: 'blob'
                        }).then(response => {
                          const blob = response.data;
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = file.filename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }).catch(err => {
                          console.error('Download failed:', err);
                          alert('Failed to download file');
                        });
                      }}
                    >
                      📥 Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
