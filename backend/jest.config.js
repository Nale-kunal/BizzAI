export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    collectCoverageFrom: [
        'controllers/**/*.js',
        'services/**/*.js',
        'utils/**/*.js',
        'middlewares/**/*.js',
        'models/**/*.js',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/migrations/**',
        '!**/config/**'
    ],
    coverageThreshold: {
        global: {
            statements: 8,
            branches: 8,
            functions: 8,
            lines: 8
        }
    },
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup/testSetup.js'],
    testTimeout: 30000,
    verbose: true,
    forceExit: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};
