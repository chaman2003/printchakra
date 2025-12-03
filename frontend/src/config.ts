// Backend API Configuration
// Automatically detects and routes to the correct backend:
// - Local development: localhost:5000
// - Deployed/ngrok: Same host or environment variable
// - Fallback: Environment variable REACT_APP_API_URL

const getApiBaseUrl = () => {
  // Priority 1: Explicit environment variable (highest priority)
  if (process.env.REACT_APP_API_URL) {
    console.log('[Config] Using REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // Priority 2: Check if running locally (development)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[Config] Detected local development');
    return 'http://localhost:5000';
  }

  // Priority 3: Same host as frontend (deployed on same server/ngrok)
  // This handles ngrok, Vercel, or any other deployment where backend/frontend share same host
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const sameHostUrl = `${protocol}//${hostname}${port}`;
  
  console.log('[Config] Detected deployed environment, using same host:', sameHostUrl);
  return sameHostUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Determine environment type for logging/debugging
export const ENVIRONMENT = (() => {
  if (process.env.REACT_APP_API_URL) {
    return 'custom-url';
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'development';
  }
  return 'deployed';
})();

// Check if Socket.IO is available
const isSocketIOEnabled = () => {
  // Enable Socket.IO everywhere - let transport fallback handle issues
  // This allows real-time updates on both local and deployed environments
  return true;
};

export const SOCKET_IO_ENABLED = isSocketIOEnabled();

// Check if using ngrok or similar tunnel service (needs bypass header)
const isUsingTunnel = () => {
  return (
    API_BASE_URL.includes('ngrok') ||
    API_BASE_URL.includes('loca.lt') ||
    API_BASE_URL.includes('.ngrok') ||
    API_BASE_URL.includes('vercel') ||
    API_BASE_URL.includes('heroku')
  );
};

// Get default headers for axios requests
export const getDefaultHeaders = () => {
  const headers: Record<string, string> = {};

  // Add tunnel bypass header if using ngrok/similar
  if (isUsingTunnel()) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};

// Separate image base URL for better reliability
export const getImageUrl = (endpoint: string, filename: string) => {
  const baseUrl = API_BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}/${filename}`;

  // Add timestamp to bypass cache
  const separator = fullUrl.includes('?') ? '&' : '?';
  return `${fullUrl}${separator}_t=${Date.now()}`;
};

// Socket.IO specific configuration - handles both local and deployed
export const SOCKET_CONFIG = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  timeout: 15000,
  transports: ['polling', 'websocket'] as ('polling' | 'websocket')[],
  upgrade: true,
  forceNew: false,
  path: '/socket.io/',
  withCredentials: true, // Needed for deployed environments
  secure: API_BASE_URL.startsWith('https'),
  rejectUnauthorized: false,
  autoConnect: true,
  ...(isUsingTunnel()
    ? {
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true',
        },
      }
    : {}),
};

export const API_ENDPOINTS = {
  // Core endpoints - Match backend exactly
  health: '/health',
  upload: '/upload',
  files: '/files',
  processed: '/public/processed',
  uploads: '/public/uploads',
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
  converted: '/public/converted',
  getConvertedFiles: '/get-converted-files',
  deleteConverted: '/delete-converted',

  // AI Orchestration endpoints
  orchestrateCommand: '/orchestrate/command',
  orchestrateConfirm: '/orchestrate/confirm',
  orchestrateCancel: '/orchestrate/cancel',
  orchestrateStatus: '/orchestrate/status',
  orchestrateDocuments: '/orchestrate/documents',
  orchestrateSelect: '/orchestrate/select',
  orchestrateConfigure: '/orchestrate/configure',
  orchestrateReset: '/orchestrate/reset',
  orchestrateHistory: '/orchestrate/history',
};

console.log('API Configuration:', {
  API_BASE_URL,
  hostname: window.location.hostname,
  SOCKET_IO_ENABLED,
  endpoints: Object.keys(API_ENDPOINTS).length + ' endpoints configured',
});
