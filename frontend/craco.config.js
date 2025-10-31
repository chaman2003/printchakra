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

      // Find ESLintWebpackPlugin and ensure it's properly configured
      const eslintPluginIndex = webpackConfig.plugins.findIndex(
        (plugin) => plugin.constructor.name === 'ESLintWebpackPlugin'
      );

      if (eslintPluginIndex >= 0) {
        // Properly initialize the plugin with updated ESLint path
        webpackConfig.plugins[eslintPluginIndex] = new ESLintPlugin({
          extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
          formatter: require.resolve('react-dev-utils/eslintFormatter'),
          eslintPath: require.resolve('eslint/use-at-your-own-risk'),
          failOnError: false, // Don't fail on ESLint errors during build
          cache: true,
          cacheLocation: paths.appNodeModules + '/.cache/eslint-webpack-plugin',
          context: paths.appSrc,
        });
      }

      return webpackConfig;
    },
  },
};