module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/__tests__'],
    testMatch: ['**/*.e2e.test.ts'],
    collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
    setupFilesAfterEnv: ['<rootDir>/jest.e2e.setup.ts'],
};