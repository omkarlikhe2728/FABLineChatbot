module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  coveragePathIgnorePatterns: ['/node_modules/', '/logs/', '/.git/'],
  collectCoverageFrom: ['src/**/*.js'],
  verbose: true,
  setupFilesAfterEnv: [],
  testTimeout: 10000,
};
