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
  console.log('   Frontend hostname:', window.location.hostname);
  console.log('   Frontend origin:', window.location.origin);
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
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  
  // Always add ngrok bypass header for all requests
  if (isUsingNgrok()) {
    headers['ngrok-skip-browser-warning'] = '69';  // ngrok requires a specific value
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
const baseSocketConfig = {
  reconnection: true,
  reconnectionDelay: 3000,  // Wait 3s before retry (from 1s)
  reconnectionDelayMax: 10000,  // Max wait 10s (from 5s)
  reconnectionAttempts: 5,  // Limit attempts to prevent spam (from 20)
  timeout: 30000,  // 30s connection timeout (was 20s)
  // Use polling first for ngrok, then try websocket
  transports: isUsingNgrok() 
    ? ['polling', 'websocket'] as ('polling' | 'websocket')[]
    : ['websocket', 'polling'] as ('polling' | 'websocket')[],
  upgrade: false,  // Never upgrade transport (polling is safer for ngrok)
  forceNew: false,
  path: '/socket.io/',
  withCredentials: false,
  secure: API_BASE_URL.startsWith('https'),
  rejectUnauthorized: false,
  // More lenient polling for ngrok - check less frequently
  pollInterval: isUsingNgrok() ? 5000 : 1000,  // Poll every 5s for ngrok (reduce server load)
};

// Add extraHeaders only for ngrok to avoid type issues
export const SOCKET_CONFIG = isUsingNgrok() 
  ? {
      ...baseSocketConfig,
      extraHeaders: {
        'ngrok-skip-browser-warning': '69'
      }
    }
  : baseSocketConfig;

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
