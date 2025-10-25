// Backend API Configuration
// Priority: Environment variable > Local development > Production URL
const getApiBaseUrl = () => {
  // 1. Check environment variable (highest priority)
  if (process.env.REACT_APP_API_URL) {
    console.log('✅ Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // 2. Check if running locally (development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('✅ Using local development URL: http://localhost:5000');
    return 'http://localhost:5000';
  }
  
  // 3. Production fallback - using ngrok tunnel
  // Update this URL when your ngrok tunnel changes
  const prodUrl = 'https://ostensible-unvibrant-clarisa.ngrok-free.dev';
  console.log('✅ Using production URL (ngrok):', prodUrl);
  return prodUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Check if Socket.IO is available
const isSocketIOEnabled = () => {
  // Enable Socket.IO everywhere - let transport fallback handle ngrok
  // This allows real-time updates on both local and ngrok deployments
  return true;
};

export const SOCKET_IO_ENABLED = isSocketIOEnabled();

// Check if using ngrok or localtunnel (needs bypass header)
const isUsingNgrok = () => {
  return API_BASE_URL.includes('ngrok') || API_BASE_URL.includes('loca.lt');
};

// Get default headers for axios requests
export const getDefaultHeaders = () => {
  const headers: Record<string, string> = {};
  
  // Add ngrok bypass header if using ngrok
  if (isUsingNgrok()) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }
  
  return headers;
};

// Separate image base URL for better reliability
export const getImageUrl = (endpoint: string, filename: string) => {
  // Use direct HTTP for images to bypass WebSocket issues
  const baseUrl = API_BASE_URL;
  
  // For ngrok, we need to add the bypass header as a query parameter approach won't work
  // Instead, images will need to be loaded through a proxy or with proper headers
  const fullUrl = `${baseUrl}${endpoint}/${filename}`;
  
  // Add timestamp to bypass cache
  const separator = fullUrl.includes('?') ? '&' : '?';
  return `${fullUrl}${separator}_t=${Date.now()}`;
};

// Socket.IO specific configuration
export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  timeout: 15000,
  // Use polling first for ngrok, then try websocket
  transports: isUsingNgrok() 
    ? ['polling', 'websocket'] as ('polling' | 'websocket')[]
    : ['websocket', 'polling'] as ('polling' | 'websocket')[],
  upgrade: isUsingNgrok() ? false : true, // Disable upgrade for ngrok
  forceNew: false,
  path: '/socket.io/',
  withCredentials: false,
  secure: API_BASE_URL.startsWith('https'),
  rejectUnauthorized: false,
  ...(isUsingNgrok() ? {
    extraHeaders: {
      'ngrok-skip-browser-warning': 'true'
    }
  } : {})
};

export const API_ENDPOINTS = {
  // Core endpoints - Match backend exactly
  health: '/health',
  upload: '/upload',
  files: '/files',
  processed: '/processed',
  uploads: '/uploads',
  delete: '/delete',
  ocr: '/ocr',
  print: '/print',
  processingStatus: '/processing-status',
  
  // Advanced processing endpoints
  processAdvanced: '/process/advanced',
  validateQuality: '/validate/quality',
  detectDocument: '/detect/document',
  exportPdf: '/export/pdf',
  pdf: '/pdf',
  pipelineInfo: '/pipeline/info',
  classifyDocument: '/classify/document',
  batchProcess: '/batch/process',
  
  // File conversion endpoints
  convert: '/convert',
  converted: '/converted',
  getConvertedFiles: '/get-converted-files',
  deleteConverted: '/delete-converted',
};

console.log('🔧 API Configuration:', { 
  API_BASE_URL, 
  hostname: window.location.hostname,
  SOCKET_IO_ENABLED,
  endpoints: Object.keys(API_ENDPOINTS).length + ' endpoints configured'
});
