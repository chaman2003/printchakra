import axios from 'axios';
import { API_BASE_URL, getDefaultHeaders } from './config';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: false,
  headers: getDefaultHeaders()
});

// Request interceptor to ensure headers are always present
apiClient.interceptors.request.use(
  (config) => {
    // Get fresh default headers
    const defaultHeaders = getDefaultHeaders();
    
    // Apply default headers to every request
    Object.entries(defaultHeaders).forEach(([key, value]) => {
      if (!config.headers.has(key)) {
        config.headers.set(key, value);
      }
    });
    
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
      status: response.status
    });
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`❌ API Error Response: ${error.response.status}`, {
        url: error.config?.url,
        message: error.response.data?.message || error.response.data?.error,
        data: error.response.data
      });
    } else if (error.request) {
      console.error('❌ API No Response:', {
        url: error.config?.url,
        message: error.message
      });
    } else {
      console.error('❌ API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
