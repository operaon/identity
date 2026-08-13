module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: '<rootDir>/tests/setup.js',
  setupFiles: ['<rootDir>/tests/env.js'],
  clearMocks: true,
  forceExit: true,
  detectOpenHandles: false,
  testTimeout: 15000,
};
