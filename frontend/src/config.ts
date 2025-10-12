// Backend API Configuration
// Priority: Environment variable > Local development > ngrok domain
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if running locally
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Production fallback to ngrok
  return 'https://freezingly-nonsignificative-edison.ngrok-free.dev';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  health: '/health',
  upload: '/upload',
  files: '/files',
  processed: '/processed',
  delete: '/delete',
  ocr: '/ocr',
  print: '/print',
};

console.log('API Configuration:', { API_BASE_URL, hostname: window.location.hostname });
