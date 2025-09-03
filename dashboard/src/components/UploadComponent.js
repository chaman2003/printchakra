import React, { useState, useRef } from 'react';
import { Card, Button, Alert, ProgressBar, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';

const UploadComponent = ({ onUploadSuccess, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const acceptedTypes = {
    'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'],
    'application/pdf': ['.pdf']
  };

  const acceptedExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.pdf'];

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file) => {
    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!acceptedExtensions.includes(fileExtension)) {
      toast.error('Please select an image file (JPG, PNG, BMP, TIFF) or PDF document');
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const result = await apiService.uploadDocument(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      toast.success(
        <div>
          <strong>Document uploaded successfully!</strong>
          <br />
          <small>
            {result.file_type === 'pdf' 
              ? `PDF processed with ${result.processing_details?.processing_method}`
              : 'Image processed with OCR'
            }
          </small>
        </div>
      );

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    return '🖼️';
  };

  if (compact) {
    return (
      <Card className="upload-compact border-0 shadow-sm">
        <Card.Body className="p-3">
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="d-flex align-items-center gap-2"
            >
              <i className="bi bi-cloud-upload"></i>
              Upload
            </Button>
            
            {selectedFile && (
              <div className="flex-grow-1">
                <div className="d-flex align-items-center gap-2">
                  <span>{getFileIcon(selectedFile.name)}</span>
                  <small className="text-muted">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </small>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={uploadFile}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Processing...' : 'Process'}
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={removeSelectedFile}
                  >
                    ×
                  </Button>
                </div>
                {isUploading && (
                  <ProgressBar 
                    now={uploadProgress} 
                    size="sm" 
                    className="mt-2"
                    animated
                  />
                )}
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.bmp,.tiff,.tif,.pdf"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="upload-component border-0 shadow-sm mb-4">
      <Card.Body className="p-4">
        <div
          className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#007bff' : '#dee2e6'}`,
            borderRadius: '12px',
            padding: '3rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backgroundColor: isDragging ? '#f8f9fa' : 'transparent'
          }}
        >
          <div className="upload-icon mb-3">
            <i 
              className="bi bi-cloud-upload" 
              style={{ fontSize: '3rem', color: '#6c757d' }}
            ></i>
          </div>
          
          <h5 className="mb-2 text-muted">
            {isDragging ? 'Drop your file here' : 'Upload Document'}
          </h5>
          
          <p className="text-muted mb-3">
            Drop your image or PDF here, or click to browse
          </p>
          
          <div className="supported-formats mb-3">
            <Badge bg="light" text="dark" className="me-2">Images</Badge>
            <Badge bg="light" text="dark" className="me-2">PDFs</Badge>
            <Badge bg="light" text="dark">Up to 50MB</Badge>
          </div>
          
          <Button 
            variant="outline-primary" 
            disabled={isUploading}
            className="px-4"
          >
            Choose File
          </Button>
        </div>

        {selectedFile && (
          <div className="selected-file mt-4 p-3 bg-light rounded">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.5rem' }}>
                  {getFileIcon(selectedFile.name)}
                </span>
                <div>
                  <h6 className="mb-1">{selectedFile.name}</h6>
                  <small className="text-muted">
                    {formatFileSize(selectedFile.size)} • 
                    {selectedFile.type || 'Unknown type'}
                  </small>
                </div>
              </div>
              
              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  onClick={uploadFile}
                  disabled={isUploading}
                  className="px-4"
                >
                  {isUploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Processing...
                    </>
                  ) : (
                    'Upload & Process'
                  )}
                </Button>
                
                <Button
                  variant="outline-secondary"
                  onClick={removeSelectedFile}
                  disabled={isUploading}
                >
                  Remove
                </Button>
              </div>
            </div>
            
            {isUploading && (
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Processing document...</small>
                  <small className="text-muted">{uploadProgress}%</small>
                </div>
                <ProgressBar 
                  now={uploadProgress} 
                  animated 
                  variant="success"
                />
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.bmp,.tiff,.tif,.pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />
      </Card.Body>
    </Card>
  );
};

export default UploadComponent;
