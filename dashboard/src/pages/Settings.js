import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import authService from '../services/authService';

const Settings = () => {
  const [user] = useState(authService.getCurrentUser());
  const [settings, setSettings] = useState({
    exportFormat: 'pdf',
    autoSync: true,
    notifications: true,
    compressionQuality: 'medium',
  });

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    // In a real app, you'd save these to localStorage or backend
    localStorage.setItem('userSettings', JSON.stringify({
      ...settings,
      [key]: value
    }));
    toast.success('Setting updated');
  };

  const handleExportAll = () => {
    // This would trigger a full export
    toast.info('Full export feature coming soon!');
  };

  const handleClearCache = () => {
    // Clear any cached data
    if (window.confirm('Are you sure you want to clear the cache?')) {
      localStorage.removeItem('documentCache');
      toast.success('Cache cleared successfully');
    }
  };

  return (
    <div>
      <h1 className="mb-4">Settings</h1>

      <Row>
        <Col lg={8}>
          {/* User Information */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">User Information</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      type="text"
                      value={user.username || 'Unknown'}
                      disabled
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>User ID</Form.Label>
                    <Form.Control
                      type="text"
                      value={user.id || 'Unknown'}
                      disabled
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Export Settings */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Export Preferences</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Default Export Format</Form.Label>
                <Form.Select
                  value={settings.exportFormat}
                  onChange={(e) => handleSettingChange('exportFormat', e.target.value)}
                >
                  <option value="txt">Text (.txt)</option>
                  <option value="pdf">PDF (.pdf)</option>
                  <option value="json">JSON (.json)</option>
                  <option value="csv">CSV (.csv)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Choose the default format for document exports
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Image Compression Quality</Form.Label>
                <Form.Select
                  value={settings.compressionQuality}
                  onChange={(e) => handleSettingChange('compressionQuality', e.target.value)}
                >
                  <option value="low">Low (Smaller files)</option>
                  <option value="medium">Medium (Balanced)</option>
                  <option value="high">High (Larger files)</option>
                </Form.Select>
                <Form.Text className="text-muted">
                  Balance between file size and image quality
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* App Settings */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Application Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form.Check
                type="switch"
                id="auto-sync"
                label="Auto-sync with mobile app"
                checked={settings.autoSync}
                onChange={(e) => handleSettingChange('autoSync', e.target.checked)}
                className="mb-3"
              />
              <Form.Text className="text-muted d-block mb-3">
                Automatically sync documents when mobile app is connected
              </Form.Text>

              <Form.Check
                type="switch"
                id="notifications"
                label="Show notifications"
                checked={settings.notifications}
                onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                className="mb-3"
              />
              <Form.Text className="text-muted d-block">
                Display notifications for new documents and errors
              </Form.Text>
            </Card.Body>
          </Card>

          {/* Data Management */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Data Management</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-grid gap-2">
                <Button variant="outline-primary" onClick={handleExportAll}>
                  Export All Documents
                </Button>
                <Button variant="outline-warning" onClick={handleClearCache}>
                  Clear Cache
                </Button>
              </div>
              <Alert variant="info" className="mt-3 mb-0">
                <strong>Note:</strong> This is an offline-first MVP. Data is stored locally and synced over Wi-Fi.
              </Alert>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          {/* System Information */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">System Information</h5>
            </Card.Header>
            <Card.Body>
              <table className="table table-borderless table-sm">
                <tbody>
                  <tr>
                    <td><strong>Version:</strong></td>
                    <td>MVP v1.0</td>
                  </tr>
                  <tr>
                    <td><strong>Build:</strong></td>
                    <td>Development</td>
                  </tr>
                  <tr>
                    <td><strong>Backend:</strong></td>
                    <td>Python Flask</td>
                  </tr>
                  <tr>
                    <td><strong>Database:</strong></td>
                    <td>MongoDB</td>
                  </tr>
                  <tr>
                    <td><strong>OCR Engine:</strong></td>
                    <td>Tesseract 4.x</td>
                  </tr>
                </tbody>
              </table>
            </Card.Body>
          </Card>

          {/* Help & Support */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Help & Support</h5>
            </Card.Header>
            <Card.Body>
              <p className="mb-3">
                PrintChakra is an offline-first document OCR system designed for local use.
              </p>
              
              <div className="d-grid gap-2">
                <Button variant="outline-info" size="sm">
                  📖 User Guide
                </Button>
                <Button variant="outline-info" size="sm">
                  🐛 Report Issue
                </Button>
                <Button variant="outline-info" size="sm">
                  💡 Feature Request
                </Button>
              </div>

              <Alert variant="light" className="mt-3 mb-0">
                <small>
                  <strong>MVP Limitations:</strong><br />
                  • Android only<br />
                  • English OCR only<br />
                  • Local network only<br />
                  • Basic UI/UX
                </small>
              </Alert>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
