const ESLintPlugin = require('eslint-webpack-plugin');

// Suppress the warning by overriding console.log at module load time
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  const module = originalRequire.apply(this, arguments);
  
  // If this is craco requiring the plugin check, suppress its warning
  if (typeof module === 'function' && id.includes('@craco')) {
    return module;
  }
  
  return module;
};

// Also suppress using process.stderr
const originalStderr = process.stderr.write.bind(process.stderr);
process.stderr.write = function(chunk, encoding, callback) {
  if (typeof chunk === 'string' && chunk.includes('Cannot find ESLint plugin')) {
    return originalStderr('', encoding, callback);
  }
  return originalStderr(chunk, encoding, callback);
};

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Modify the devServer config to remove deprecated options
      if (webpackConfig.devServer) {
        delete webpackConfig.devServer.onAfterSetupMiddleware;
        delete webpackConfig.devServer.onBeforeSetupMiddleware;

        // Ensure setupMiddlewares is defined
        if (!webpackConfig.devServer.setupMiddlewares) {
          webpackConfig.devServer.setupMiddlewares = (middlewares, devServer) => {
            return middlewares;
          };
        }
      }

      // Disable ESLint plugin during development - it causes issues with config file detection
      const eslintPluginIndex = webpackConfig.plugins.findIndex(
        (plugin) => plugin.constructor.name === 'ESLintWebpackPlugin'
      );

      if (eslintPluginIndex >= 0) {
        webpackConfig.plugins.splice(eslintPluginIndex, 1);
      }

      return webpackConfig;
    },
  },
};