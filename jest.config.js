/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Roots for test discovery
  roots: ['<rootDir>/src'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@entities/(.*)$': '<rootDir>/src/entities/$1',
    '^@middlewares/(.*)$': '<rootDir>/src/middlewares/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/migrations/**',
    '!src/config/**',
    '!src/__tests__/setup/**',
  ],

  // Coverage directory
  coverageDirectory: 'coverage',

  // Coverage thresholds (adjusted for integration tests)
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    }],
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.test.js' }],
  },

  // Transform ES modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(@faker-js)/)',
  ],

  // Setup files - run before each test file
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/jest.setup.ts'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/uploads/',
    '/logs/',
  ],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Reset mocks between tests
  resetMocks: true,

  // Test timeout (increased for integration tests with database)
  testTimeout: 30000,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Detect open handles (useful for finding database connection leaks)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/setup/globalSetup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/globalTeardown.ts',
};
