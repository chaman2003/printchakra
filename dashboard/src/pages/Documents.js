import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Spinner, Alert, ButtonGroup, Form, Dropdown } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import exportService from '../services/exportService';
import UploadComponent from '../components/UploadComponent';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [convertingDocuments, setConvertingDocuments] = useState(new Set());
  const [batchConverting, setBatchConverting] = useState(false);
  
  const navigate = useNavigate();
  const documentsPerPage = 12;

  useEffect(() => {
    loadDocuments();
  }, [currentPage]);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await apiService.getDocuments(currentPage, documentsPerPage);
      setDocuments(response.documents || []);
      setTotalPages(response.total_pages || 0);

    } catch (error) {
      setError(error.message || 'Failed to load documents');
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentSelect = (documentId) => {
    setSelectedDocuments(prev => {
      if (prev.includes(documentId)) {
        return prev.filter(id => id !== documentId);
      } else {
        return [...prev, documentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents.map(doc => doc._id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.length === 0) return;

    if (window.confirm(`Delete ${selectedDocuments.length} selected documents?`)) {
      try {
        await Promise.all(
          selectedDocuments.map(id => apiService.deleteDocument(id))
        );
        
        setSelectedDocuments([]);
        setSelectAll(false);
        loadDocuments();
        toast.success(`${selectedDocuments.length} documents deleted successfully`);
      } catch (error) {
        toast.error('Failed to delete some documents');
      }
    }
  };

  const handleExportSelected = (format) => {
    if (selectedDocuments.length === 0) {
      toast.warning('Please select documents to export');
      return;
    }

    const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc._id));
    const filename = exportService.generateFilename('selected_documents', format);

    switch (format) {
      case 'txt':
        exportService.exportAsText(selectedDocs, filename);
        break;
      case 'pdf':
        exportService.exportAsPDF(selectedDocs, filename);
        break;
      case 'json':
        exportService.exportAsJSON(selectedDocs, filename);
        break;
      default:
        toast.error('Unsupported export format');
    }

    toast.success(`Documents exported as ${format.toUpperCase()}`);
  };

  const handleBatchConvert = async (format) => {
    if (selectedDocuments.length === 0) {
      toast.warning('Please select documents to convert');
      return;
    }

    try {
      setBatchConverting(true);
      const response = await apiService.batchConvertDocuments(selectedDocuments, format);
      toast.success(`${selectedDocuments.length} documents converted to ${format.toUpperCase()} successfully!`);
      setSelectedDocuments([]);
      setSelectAll(false);
    } catch (error) {
      toast.error(`Failed to convert documents: ${error.message}`);
    } finally {
      setBatchConverting(false);
    }
  };

  const handleConvertDocument = async (documentId, format) => {
    try {
      // Add document to converting set to show loading state
      setConvertingDocuments(prev => new Set([...prev, documentId]));
      
      const response = await apiService.convertDocument(documentId, format);
      
      // The apiService already handles the download, so we just show success
      toast.success(`Document converted to ${format.toUpperCase()} successfully!`);
      
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error(`Failed to convert document: ${error.message || 'Unknown error'}`);
    } finally {
      // Remove document from converting set
      setConvertingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleUploadSuccess = (result) => {
    loadDocuments(); // Refresh the documents list
    toast.success('Document uploaded and processed successfully!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
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
        <p className="mt-3">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Documents</Alert.Heading>
        <p>{error}</p>
        <Button variant="outline-danger" onClick={loadDocuments}>
          Try Again
        </Button>
      </Alert>
    );
  }

  return (
    <div>
      {/* Upload Component */}
      <UploadComponent onUploadSuccess={handleUploadSuccess} />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">Documents</h1>
        <div className="d-flex gap-2 align-items-center">
          <Form.Check
            type="checkbox"
            label="Select All"
            checked={selectAll}
            onChange={handleSelectAll}
            className="me-3"
          />
          {selectedDocuments.length > 0 && (
            <>
              <ButtonGroup size="sm">
                <Dropdown>
                  <Dropdown.Toggle variant="outline-primary" size="sm" disabled={batchConverting}>
                    {batchConverting ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-1" />
                        Converting...
                      </>
                    ) : (
                      `Convert Selected (${selectedDocuments.length})`
                    )}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleBatchConvert('pdf')} disabled={batchConverting}>
                      📄 Convert to PDF
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleBatchConvert('txt')} disabled={batchConverting}>
                      📝 Extract Text
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleBatchConvert('json')} disabled={batchConverting}>
                      📊 Export Data
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
                <Button variant="outline-danger" size="sm" onClick={handleDeleteSelected}>
                  Delete Selected
                </Button>
              </ButtonGroup>
            </>
          )}
        </div>
      </div>

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <>
          <Row>
            {documents.map((doc) => {
              const fileType = doc.metadata?.file_type || 'image';
              const isPDF = fileType === 'pdf';
              
              return (
                <Col key={doc._id} md={6} lg={4} className="mb-4">
                  <Card className="document-card h-100 border-0 shadow-sm">
                    <Card.Body className="d-flex flex-column p-3">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div className="d-flex align-items-center gap-2">
                          <Form.Check
                            type="checkbox"
                            checked={selectedDocuments.includes(doc._id)}
                            onChange={() => handleDocumentSelect(doc._id)}
                          />
                          <span className="badge bg-light text-dark">
                            {isPDF ? '📄 PDF' : '🖼️ Image'}
                          </span>
                        </div>
                        <small className="text-muted">{formatDate(doc.captured_at)}</small>
                      </div>

                      <div className="text-center mb-3">
                        {isPDF ? (
                          <div 
                            className="pdf-preview d-flex align-items-center justify-content-center"
                            style={{ 
                              height: '150px', 
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #dee2e6',
                              borderRadius: '8px'
                            }}
                          >
                            <div className="text-center">
                              <i className="bi bi-file-pdf" style={{ fontSize: '3rem', color: '#dc3545' }}></i>
                              <div className="mt-2">
                                <small className="text-muted">
                                  {doc.metadata?.processing_details?.total_pages || 1} page(s)
                                </small>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <img
                            src={apiService.getDocumentImageUrl(doc._id)}
                            alt={doc.filename}
                            className="document-image rounded"
                            style={{ 
                              maxHeight: '150px', 
                              maxWidth: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        )}
                      </div>

                      <h6 className="card-title text-truncate" title={doc.filename}>
                        {doc.filename}
                      </h6>
                      
                      <div className="mb-2 d-flex justify-content-between">
                        <small className="text-muted">
                          {formatFileSize(doc.metadata?.file_size || 0)}
                        </small>
                        {doc.metadata?.processing_details?.processing_method && (
                          <small className="text-muted">
                            {doc.metadata.processing_details.processing_method === 'direct_text_extraction' 
                              ? 'Text extracted' 
                              : 'OCR processed'
                            }
                          </small>
                        )}
                      </div>

                      {doc.ocr_text && (
                        <p className="card-text flex-grow-1">
                          <small className="text-muted">
                            {doc.ocr_text.substring(0, 80)}...
                          </small>
                        </p>
                      )}

                      <div className="mt-auto">
                        <div className="d-flex gap-1 mb-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-grow-1"
                            onClick={() => navigate(`/documents/${doc._id}`)}
                          >
                            View Details
                          </Button>
                          
                          <Dropdown>
                            <Dropdown.Toggle 
                              variant="outline-secondary" 
                              size="sm"
                              id={`dropdown-${doc._id}`}
                              disabled={convertingDocuments.has(doc._id)}
                            >
                              {convertingDocuments.has(doc._id) ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <i className="bi bi-three-dots"></i>
                              )}
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <Dropdown.Header>Convert to:</Dropdown.Header>
                              
                              {/* Show PDF option only for images */}
                              {!isPDF && (
                                <Dropdown.Item 
                                  onClick={() => handleConvertDocument(doc._id, 'pdf')}
                                  disabled={convertingDocuments.has(doc._id)}
                                >
                                  📄 Convert to PDF
                                </Dropdown.Item>
                              )}
                              
                              {/* Show image conversion options for PDFs */}
                              {isPDF && (
                                <>
                                  <Dropdown.Item 
                                    onClick={() => handleConvertDocument(doc._id, 'txt')}
                                    disabled={convertingDocuments.has(doc._id)}
                                  >
                                    📝 Extract as Text
                                  </Dropdown.Item>
                                  <Dropdown.Item 
                                    onClick={() => handleConvertDocument(doc._id, 'json')}
                                    disabled={convertingDocuments.has(doc._id)}
                                  >
                                    📊 Export as JSON
                                  </Dropdown.Item>
                                </>
                              )}
                              
                              {/* Always show text and JSON options for images */}
                              {!isPDF && (
                                <>
                                  <Dropdown.Item 
                                    onClick={() => handleConvertDocument(doc._id, 'txt')}
                                    disabled={convertingDocuments.has(doc._id)}
                                  >
                                    📝 Extract Text
                                  </Dropdown.Item>
                                  <Dropdown.Item 
                                    onClick={() => handleConvertDocument(doc._id, 'json')}
                                    disabled={convertingDocuments.has(doc._id)}
                                  >
                                    📊 Export Data
                                  </Dropdown.Item>
                                </>
                              )}
                              
                              {/* Show original download for PDFs */}
                              {isPDF && (
                                <Dropdown.Item 
                                  onClick={() => handleConvertDocument(doc._id, 'pdf')}
                                  disabled={convertingDocuments.has(doc._id)}
                                >
                                  📥 Download Original
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <ButtonGroup>
                <Button
                  variant="outline-primary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline-primary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button variant="primary" disabled>
                  {currentPage} of {totalPages}
                </Button>
                <Button
                  variant="outline-primary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
                <Button
                  variant="outline-primary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  Last
                </Button>
              </ButtonGroup>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <i>📄</i>
          <h4>No Documents Found</h4>
          <p>Start by scanning documents with the mobile app</p>
        </div>
      )}
    </div>
  );
};

export default Documents;
