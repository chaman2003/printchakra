/**
 * Suppress webpack dev server deprecation warnings
 * These warnings are from react-scripts internal webpack configuration
 * and don't affect functionality
 */

const originalEmit = process.emit;

process.emit = function(name, ...args) {
  if (
    name === 'warning' &&
    args[0]?.code?.includes?.('DEP_WEBPACK_DEV_SERVER')
  ) {
    return;
  }
  return originalEmit.apply(process, [name, ...args]);
};

module.exports = {};
