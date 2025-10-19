// Backend API Configuration
// Priority: Environment variable > Local development > ngrok domain
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    console.log('Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if running locally
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // Production fallback to ngrok (or your custom domain)
  const prodUrl = 'https://freezingly-nonsignificative-edison.ngrok-free.dev';
  console.log('Using production URL:', prodUrl);
  return prodUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Separate image base URL for better reliability
export const getImageUrl = (endpoint: string, filename: string) => {
  // Use direct HTTP for images to bypass WebSocket issues
  const baseUrl = API_BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}/${filename}`;
  return fullUrl;
};

// Socket.IO specific configuration
export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  transports: ['polling', 'websocket'], // Try polling first
  upgrade: true,
  rememberUpgrade: true,
  path: '/socket.io/',
};

export const API_ENDPOINTS = {
  // Basic endpoints
  health: '/health',
  upload: '/upload',
  files: '/files',
  processed: '/processed',
  delete: '/delete',
  ocr: '/ocr',
  print: '/print',
  
  // Advanced processing endpoints
  processAdvanced: '/process/advanced',
  validateQuality: '/validate/quality',
  exportPdf: '/export/pdf',
  pdf: '/pdf',
  pipelineInfo: '/pipeline/info',
  classifyDocument: '/classify/document',
  batchProcess: '/batch/process',
};

console.log('🔧 API Configuration:', { API_BASE_URL, hostname: window.location.hostname });
