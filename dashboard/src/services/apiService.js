import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          localStorage.removeItem('userId');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(username, password) {
    try {
      const response = await this.client.post('/auth/login', {
        username,
        password,
      });
      
      const { token, user_id, username: userName } = response.data;
      
      // Store credentials
      localStorage.setItem('authToken', token);
      localStorage.setItem('userId', user_id);
      localStorage.setItem('username', userName);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(username, password, deviceId) {
    try {
      const response = await this.client.post('/auth/register', {
        username,
        password,
        device_id: deviceId,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
  }

  // Document upload method
  async uploadDocument(formData) {
    try {
      const response = await this.client.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 minutes timeout for large PDFs
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Document methods
  async getDocuments(page = 1, limit = 20) {
    try {
      const response = await this.client.get('/documents', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDocument(documentId) {
    try {
      const response = await this.client.get(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteDocument(documentId) {
    try {
      const response = await this.client.delete(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async convertDocument(documentId, format) {
    try {
      const response = await this.client.post(`/documents/${documentId}/convert`, {
        format: format
      }, {
        responseType: 'blob', // Important for file downloads
        timeout: 60000
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = `document.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Conversion error:', error);
      throw this.handleError(error);
    }
  }

  async batchConvertDocuments(documentIds, format) {
    try {
      const response = await this.client.post('/documents/batch-convert', {
        document_ids: documentIds,
        format: format
      }, {
        responseType: 'blob', // Important for file downloads
        timeout: 120000 // 2 minutes timeout for batch operations
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from response headers
      const contentDisposition = response.headers['content-disposition'];
      let filename = `converted_documents_${format}.zip`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, filename };
    } catch (error) {
      console.error('Batch conversion error:', error);
      throw this.handleError(error);
    }
  }

  async searchDocuments(query) {
    try {
      const response = await this.client.get('/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  getDocumentImageUrl(documentId) {
    const token = localStorage.getItem('authToken');
    return `${API_BASE_URL}/documents/${documentId}/image?token=${token}`;
  }

  // Statistics methods
  async getStatistics() {
    try {
      // Since we don't have a dedicated stats endpoint, we'll get documents and calculate
      const response = await this.getDocuments(1, 1000); // Get all documents for stats
      const documents = response.documents || [];
      
      const totalDocuments = documents.length;
      const totalSize = documents.reduce((sum, doc) => sum + (doc.metadata?.file_size || 0), 0);
      const avgProcessingTime = documents.reduce((sum, doc) => sum + (doc.metadata?.processing_time || 0), 0) / totalDocuments;
      
      // Group by date for recent activity
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentDocuments = documents.filter(doc => new Date(doc.captured_at) >= lastWeek).length;
      
      return {
        totalDocuments,
        totalSize,
        averageProcessingTime: avgProcessingTime || 0,
        recentDocuments,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Export methods
  async exportDocumentsAsText(documentIds = []) {
    try {
      let documents;
      if (documentIds.length > 0) {
        // Get specific documents
        documents = await Promise.all(
          documentIds.map(id => this.getDocument(id))
        );
      } else {
        // Get all documents
        const response = await this.getDocuments(1, 1000);
        documents = response.documents;
      }

      // Create text content
      let textContent = 'PrintChakra - Exported Documents\n';
      textContent += '================================\n\n';
      
      documents.forEach((doc, index) => {
        textContent += `Document ${index + 1}: ${doc.filename}\n`;
        textContent += `Captured: ${new Date(doc.captured_at).toLocaleString()}\n`;
        textContent += `Size: ${(doc.metadata?.file_size / 1024).toFixed(1)} KB\n`;
        textContent += '--- Text Content ---\n';
        textContent += doc.ocr_text || 'No text extracted';
        textContent += '\n\n' + '='.repeat(50) + '\n\n';
      });

      return textContent;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility methods
  isAuthenticated() {
    const token = localStorage.getItem('authToken');
    return !!token;
  }

  getCurrentUser() {
    return {
      id: localStorage.getItem('userId'),
      username: localStorage.getItem('username'),
    };
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'Server error',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        message: 'Network error - please check your connection',
        status: 0,
        data: null,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'Unknown error occurred',
        status: -1,
        data: null,
      };
    }
  }
}

export default new ApiService();
