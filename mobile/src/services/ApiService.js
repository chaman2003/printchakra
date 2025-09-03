import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://192.168.1.100:5000/api'; // Update with your local IP

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async config => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      },
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userId');
          // Navigate to login screen
        }
        return Promise.reject(error);
      },
    );
  }

  // Authentication methods
  async login(username, password) {
    try {
      const response = await this.client.post('/auth/login', {
        username,
        password,
      });
      
      const {token, user_id} = response.data;
      
      // Store credentials
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userId', user_id);
      
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

  async logout() {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
  }

  // Document methods
  async uploadDocument(imageUri, deviceId) {
    try {
      const formData = new FormData();
      
      // Handle different file sources
      let fileData;
      if (typeof imageUri === 'string' && imageUri.startsWith('file://')) {
        // File URI from document picker or camera
        fileData = {
          uri: imageUri,
          type: 'image/jpeg', // Default for camera captures
          name: `document_${Date.now()}.jpg`,
        };
      } else if (typeof imageUri === 'object') {
        // Document picker object
        fileData = {
          uri: imageUri.uri,
          type: imageUri.type || 'application/octet-stream',
          name: imageUri.name || `document_${Date.now()}`,
        };
      } else {
        // Regular URI
        fileData = {
          uri: imageUri,
          type: 'image/jpeg',
          name: `document_${Date.now()}.jpg`,
        };
      }

      formData.append('file', fileData);

      if (deviceId) {
        formData.append('device_id', deviceId);
      }

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

  async getDocuments(page = 1, limit = 20) {
    try {
      const response = await this.client.get('/documents', {
        params: {page, limit},
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

  async searchDocuments(query) {
    try {
      const response = await this.client.get('/search', {
        params: {q: query},
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  getDocumentImageUrl(documentId) {
    return `${API_BASE_URL}/documents/${documentId}/image`;
  }

  // Utility methods
  async checkAuthStatus() {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  }

  async getUserId() {
    return await AsyncStorage.getItem('userId');
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
