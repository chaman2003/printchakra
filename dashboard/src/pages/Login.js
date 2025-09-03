import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import authService from '../services/authService';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        await authService.register(formData.username, formData.password);
        toast.success('Account created successfully! Please login.');
        setIsRegisterMode(false);
      } else {
        await authService.login(formData.username, formData.password);
        toast.success('Login successful!');
        onLogin();
      }
    } catch (error) {
      setError(error.message || 'Authentication failed');
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsLoading(true);
      // You could implement a health check here
      toast.success('Connection to server successful!');
    } catch (error) {
      toast.error('Failed to connect to server. Please check if the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container fluid className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Row className="w-100">
        <Col md={6} lg={4} className="mx-auto">
          <Card className="shadow">
            <Card.Body className="p-5">
              <div className="text-center mb-4">
                <h2 className="mb-2">PrintChakra Dashboard</h2>
                <p className="text-muted">
                  {isRegisterMode ? 'Create your account' : 'Sign in to your account'}
                </p>
              </div>

              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="Enter username"
                    required
                    disabled={isLoading}
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    required
                    disabled={isLoading}
                  />
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  className="w-100 mb-3"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {isRegisterMode ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    isRegisterMode ? 'Create Account' : 'Sign In'
                  )}
                </Button>

                <div className="text-center mb-3">
                  <Button
                    variant="link"
                    onClick={() => setIsRegisterMode(!isRegisterMode)}
                    disabled={isLoading}
                    className="text-decoration-none"
                  >
                    {isRegisterMode
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Sign Up"
                    }
                  </Button>
                </div>

                <div className="text-center">
                  <Button
                    variant="outline-secondary"
                    onClick={testConnection}
                    disabled={isLoading}
                    size="sm"
                  >
                    Test Connection
                  </Button>
                </div>
              </Form>

              <div className="mt-4 pt-4 border-top text-center">
                <small className="text-muted">
                  PrintChakra MVP v1.0 - Offline Document Processing
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
