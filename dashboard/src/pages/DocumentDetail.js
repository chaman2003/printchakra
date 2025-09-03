import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Button, Spinner, Alert, ButtonGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';
import exportService from '../services/exportService';

const DocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadDocument();
    }
  }, [id]);

  const loadDocument = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await apiService.getDocument(id);
      setDocument(response);
    } catch (error) {
      setError(error.message || 'Failed to load document');
      toast.error('Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await apiService.deleteDocument(id);
        toast.success('Document deleted successfully');
        navigate('/documents');
      } catch (error) {
        toast.error('Failed to delete document');
      }
    }
  };

  const handleExport = (format) => {
    if (!document) return;

    const filename = exportService.generateFilename(
      document.filename.replace(/\.[^/.]+$/, ""),
      format
    );

    switch (format) {
      case 'txt':
        exportService.exportAsText([document], filename);
        break;
      case 'pdf':
        exportService.exportSingleDocumentAsPDF(document, filename);
        break;
      case 'json':
        exportService.exportAsJSON([document], filename);
        break;
      default:
        toast.error('Unsupported export format');
        return;
    }

    toast.success(`Document exported as ${format.toUpperCase()}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading document...</p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Document</Alert.Heading>
        <p>{error || 'Document not found'}</p>
        <Button variant="outline-danger" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate('/documents')}
            className="me-3"
          >
            ← Back to Documents
          </Button>
          <h1 className="d-inline">{document.filename}</h1>
        </div>
        
        <div>
          <ButtonGroup className="me-2">
            <Button variant="outline-primary" size="sm" onClick={() => handleExport('txt')}>
              Export TXT
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => handleExport('json')}>
              Export JSON
            </Button>
          </ButtonGroup>
          <Button variant="outline-danger" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <Row>
        {/* Document Image */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Document Image</h5>
            </Card.Header>
            <Card.Body className="text-center">
              <img
                src={apiService.getDocumentImageUrl(id)}
                alt={document.filename}
                className="img-fluid"
                style={{ maxHeight: '600px', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Document Details */}
        <Col lg={6} className="mb-4">
          <Card className="mb-3">
            <Card.Header>
              <h5 className="mb-0">Document Information</h5>
            </Card.Header>
            <Card.Body>
              <table className="table table-borderless">
                <tbody>
                  <tr>
                    <td><strong>Filename:</strong></td>
                    <td>{document.filename}</td>
                  </tr>
                  <tr>
                    <td><strong>Captured:</strong></td>
                    <td>{formatDate(document.captured_at)}</td>
                  </tr>
                  <tr>
                    <td><strong>File Size:</strong></td>
                    <td>{formatFileSize(document.metadata?.file_size || 0)}</td>
                  </tr>
                  {document.metadata?.dimensions && (
                    <tr>
                      <td><strong>Dimensions:</strong></td>
                      <td>
                        {document.metadata.dimensions.width} × {document.metadata.dimensions.height} pixels
                      </td>
                    </tr>
                  )}
                  {document.metadata?.processing_time && (
                    <tr>
                      <td><strong>Processing Time:</strong></td>
                      <td>{document.metadata.processing_time.toFixed(2)} seconds</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Document ID:</strong></td>
                    <td><code>{document._id}</code></td>
                  </tr>
                </tbody>
              </table>
            </Card.Body>
          </Card>

          {/* OCR Text */}
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Extracted Text</h5>
              {document.ocr_text && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(document.ocr_text)}
                >
                  Copy Text
                </Button>
              )}
            </Card.Header>
            <Card.Body>
              {document.ocr_text ? (
                <div className="ocr-text">
                  {document.ocr_text}
                </div>
              ) : (
                <div className="text-center text-muted py-4">
                  <i style={{ fontSize: '2rem' }}>📄</i>
                  <p className="mt-2">No text was extracted from this document</p>
                  <small>The document might not contain readable text or OCR processing failed</small>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DocumentDetail;
