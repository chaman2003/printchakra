// Backend API Configuration
// Uses environment variable if available, falls back to ngrok domain
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://freezingly-nonsignificative-edison.ngrok-free.dev';

export const API_ENDPOINTS = {
  health: '/health',
  upload: '/upload',
  files: '/files',
  processed: '/processed',
  delete: '/delete',
  ocr: '/ocr',
  print: '/print',
};
