const { createProxyMiddleware } = require('http-proxy-middleware');

const target = 'http://localhost:5000';
const apiPaths = [
  '/health',
  '/phone',
  '/files',
  '/document',
  '/ocr',
  '/print',
  '/printer',
  '/processing-status',
  '/process',
  '/validate',
  '/detect',
  '/export',
  '/pdf',
  '/pipeline',
  '/convert',
  '/converted',
  '/connection',
  '/voice',
];

module.exports = function setupProxy(app) {
  apiPaths.forEach(path => {
    app.use(
      path,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        ws: true,
      })
    );
  });
};
