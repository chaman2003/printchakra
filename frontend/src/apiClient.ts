import axios from 'axios';
import { API_BASE_URL, getDefaultHeaders } from './config';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 120 seconds for long-running OCR operations
  headers: getDefaultHeaders(),
});

// Request interceptor to ensure headers are always present
apiClient.interceptors.request.use(
  config => {
    // Merge with default headers
    const defaultHeaders = getDefaultHeaders();

    // Safely merge headers
    Object.keys(defaultHeaders).forEach(key => {
      config.headers.set(key, defaultHeaders[key]);
    });

    return config;
  },
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  response => {
    console.log(
      `API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`,
      {
        status: response.status,
      }
    );
    return response;
  },
  error => {
    if (error.response) {
      console.error(`API Error Response: ${error.response.status}`, {
        url: error.config?.url,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error('API No Response:', {
        url: error.config?.url,
        message: error.message,
      });
    } else {
      console.error('API Request Setup Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
