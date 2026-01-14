# Testing Guide

## Overview

This project uses Jest for testing with different configurations for different parts of the application.

## Running Tests

### Mobile App

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- CaptureScreen.test.tsx
```

### Backend

```bash
# Run all tests
npm test

# Run integration tests
npm run test:e2e

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testPathPattern=auth
```

## Test Structure

### Unit Tests

Test individual functions and components in isolation.

```typescript
describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });
});
```

### Integration Tests

Test how different parts work together.

```typescript
describe('Capture Flow', () => {
  it('uploads and retrieves capture', async () => {
    // Upload
    const uploadRes = await uploadCapture(data);
    
    // Retrieve
    const getRes = await getCapture(uploadRes.id);
    
    expect(getRes.id).toBe(uploadRes.id);
  });
});
```

### E2E Tests

Test complete user workflows.

```typescript
describe('User Registration Flow', () => {
  it('registers and logs in user', async () => {
    // Register
    await registerUser(userData);
    
    // Login
    const token = await loginUser(credentials);
    
    // Make authenticated request
    const profile = await getProfile(token);
    
    expect(profile.email).toBe(userData.email);
  });
});
```

## Mocking

### Mocking API Calls

```typescript
jest.mock('../api/client', () => ({
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));
```

### Mocking Native Modules

```typescript
jest.mock('react-native-vision-camera', () => ({
  useCameraDevice: jest.fn(() => ({ id: 'back' })),
  Camera: 'Camera',
}));
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory.

```bash
# View coverage report
open coverage/lcov-report/index.html
```

## Best Practices

1. **Test Naming**: Use descriptive test names
2. **Isolation**: Each test should be independent
3. **Cleanup**: Always clean up after tests
4. **Realistic Data**: Use realistic test data
5. **Edge Cases**: Test edge cases and error conditions

## Continuous Integration

Tests run automatically on every push via GitHub Actions.

See `.github/workflows/ci.yml` for CI configuration.