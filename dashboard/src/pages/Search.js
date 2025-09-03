import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';
import exportService from '../services/exportService';

const Search = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.warning('Please enter a search term');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setHasSearched(true);

      const response = await apiService.searchDocuments(searchQuery.trim());
      setSearchResults(response.documents || []);
      
      if (response.documents.length === 0) {
        toast.info(`No documents found for "${searchQuery}"`);
      } else {
        toast.success(`Found ${response.documents.length} documents`);
      }

    } catch (error) {
      setError(error.message || 'Search failed');
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const highlightSearchTerm = (text, term) => {
    if (!term || !text) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <span key={index} className="search-highlight">{part}</span> : 
        part
    );
  };

  const handleExportResults = (format) => {
    if (searchResults.length === 0) {
      toast.warning('No search results to export');
      return;
    }

    const filename = exportService.generateFilename(`search_${searchQuery}`, format);

    switch (format) {
      case 'txt':
        exportService.exportAsText(searchResults, filename);
        break;
      case 'pdf':
        exportService.exportAsPDF(searchResults, filename);
        break;
      case 'csv':
        exportService.exportSearchAsCSV(searchResults, searchQuery, filename);
        break;
      default:
        toast.error('Unsupported export format');
        return;
    }

    toast.success(`Search results exported as ${format.toUpperCase()}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Search Documents</h1>
        {searchResults.length > 0 && (
          <div className="d-flex gap-2">
            <Button variant="outline-primary" size="sm" onClick={() => handleExportResults('txt')}>
              Export TXT
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => handleExportResults('pdf')}>
              Export PDF
            </Button>
            <Button variant="outline-primary" size="sm" onClick={() => handleExportResults('csv')}>
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Search Form */}
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="align-items-end">
              <Col md={10}>
                <Form.Group>
                  <Form.Label>Search Term</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter text to search for in documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isLoading}
                  />
                  <Form.Text className="text-muted">
                    Search through the text content of all your documents
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-100"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {hasSearched && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">
              Search Results 
              {searchQuery && ` for "${searchQuery}"`}
              {searchResults.length > 0 && ` (${searchResults.length} found)`}
            </h5>
          </Card.Header>
          <Card.Body>
            {searchResults.length > 0 ? (
              <Row>
                {searchResults.map((doc) => (
                  <Col key={doc._id} lg={6} className="mb-4">
                    <Card className="document-card h-100">
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h6 className="card-title mb-0">{doc.filename}</h6>
                          <small className="text-muted">{formatDate(doc.captured_at)}</small>
                        </div>

                        <div className="text-center mb-3">
                          <img
                            src={apiService.getDocumentImageUrl(doc._id)}
                            alt={doc.filename}
                            className="document-image"
                            style={{ maxHeight: '120px', maxWidth: '100%' }}
                          />
                        </div>

                        <div className="mb-2">
                          <small className="text-muted">
                            Size: {formatFileSize(doc.metadata?.file_size || 0)}
                          </small>
                        </div>

                        {doc.ocr_text && (
                          <div className="flex-grow-1 mb-3">
                            <p className="card-text small">
                              {highlightSearchTerm(
                                doc.ocr_text.substring(0, 200) + 
                                (doc.ocr_text.length > 200 ? '...' : ''),
                                searchQuery
                              )}
                            </p>
                          </div>
                        )}

                        <div className="mt-auto">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-100"
                            onClick={() => navigate(`/documents/${doc._id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="empty-state">
                <i>🔍</i>
                <h4>No Documents Found</h4>
                <p>
                  {searchQuery 
                    ? `No documents contain the text "${searchQuery}"`
                    : 'Enter a search term to find documents'
                  }
                </p>
                {searchQuery && (
                  <div className="mt-3">
                    <small className="text-muted">
                      Try different keywords or check your spelling
                    </small>
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Search Tips */}
      {!hasSearched && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">Search Tips</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <h6>💡 How to Search</h6>
                <ul className="mb-0">
                  <li>Enter any word or phrase to find documents containing that text</li>
                  <li>Search is case-insensitive</li>
                  <li>Use specific terms for better results</li>
                </ul>
              </Col>
              <Col md={6}>
                <h6>📊 Export Results</h6>
                <ul className="mb-0">
                  <li>Export search results as TXT, PDF, or CSV</li>
                  <li>Includes matched documents and search highlights</li>
                  <li>Perfect for creating reports or backups</li>
                </ul>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default Search;
