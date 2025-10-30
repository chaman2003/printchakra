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

      return webpackConfig;
    },
  },
};