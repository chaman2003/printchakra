import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Load statistics
      const statsData = await apiService.getStatistics();
      setStats(statsData);

      // Load recent documents
      const documentsResponse = await apiService.getDocuments(1, 5);
      setRecentDocuments(documentsResponse.documents || []);

    } catch (error) {
      setError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="loading-spinner">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Dashboard</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Dashboard</h1>
        <small className="text-muted">Welcome to PrintChakra</small>
      </div>

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="text-primary mb-2">
                <i className="bi bi-file-text" style={{ fontSize: '2rem' }}>📄</i>
              </div>
              <h3 className="mb-1">{stats?.totalDocuments || 0}</h3>
              <p className="text-muted mb-0">Total Documents</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="text-success mb-2">
                <i className="bi bi-hdd" style={{ fontSize: '2rem' }}>💾</i>
              </div>
              <h3 className="mb-1">{formatFileSize(stats?.totalSize || 0)}</h3>
              <p className="text-muted mb-0">Total Storage</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="text-warning mb-2">
                <i className="bi bi-clock" style={{ fontSize: '2rem' }}>⏱️</i>
              </div>
              <h3 className="mb-1">{(stats?.averageProcessingTime || 0).toFixed(1)}s</h3>
              <p className="text-muted mb-0">Avg Processing Time</p>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3} className="mb-3">
          <Card className="stats-card h-100">
            <Card.Body className="text-center">
              <div className="text-info mb-2">
                <i className="bi bi-calendar-week" style={{ fontSize: '2rem' }}>📅</i>
              </div>
              <h3 className="mb-1">{stats?.recentDocuments || 0}</h3>
              <p className="text-muted mb-0">This Week</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Documents */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Recent Documents</h5>
            </Card.Header>
            <Card.Body>
              {recentDocuments.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Filename</th>
                        <th>Captured</th>
                        <th>Size</th>
                        <th>Text Preview</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDocuments.map((doc) => (
                        <tr key={doc._id}>
                          <td>
                            <strong>{doc.filename}</strong>
                          </td>
                          <td>
                            <small className="text-muted">
                              {formatDate(doc.captured_at)}
                            </small>
                          </td>
                          <td>
                            <small>
                              {formatFileSize(doc.metadata?.file_size || 0)}
                            </small>
                          </td>
                          <td>
                            <small className="text-muted">
                              {doc.ocr_text 
                                ? `${doc.ocr_text.substring(0, 100)}...`
                                : 'No text extracted'
                              }
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <i>📄</i>
                  <h4>No Documents Yet</h4>
                  <p>Start by scanning documents with the mobile app</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mt-4">
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Quick Actions</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4} className="mb-3">
                  <Card className="h-100 border-primary">
                    <Card.Body className="text-center">
                      <div className="text-primary mb-2">
                        <i style={{ fontSize: '2rem' }}>📱</i>
                      </div>
                      <h6>Mobile App</h6>
                      <p className="small text-muted">
                        Use the PrintChakra mobile app to scan new documents
                      </p>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4} className="mb-3">
                  <Card className="h-100 border-success">
                    <Card.Body className="text-center">
                      <div className="text-success mb-2">
                        <i style={{ fontSize: '2rem' }}>🔍</i>
                      </div>
                      <h6>Search Documents</h6>
                      <p className="small text-muted">
                        Find documents by searching through their text content
                      </p>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={4} className="mb-3">
                  <Card className="h-100 border-warning">
                    <Card.Body className="text-center">
                      <div className="text-warning mb-2">
                        <i style={{ fontSize: '2rem' }}>📤</i>
                      </div>
                      <h6>Export Data</h6>
                      <p className="small text-muted">
                        Export your documents as PDF or text files
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
