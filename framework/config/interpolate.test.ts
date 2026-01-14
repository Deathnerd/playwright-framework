import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interpolateEnvVars } from './interpolate.js';

describe('interpolateEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should replace ${VAR} with environment value', () => {
    process.env.TEST_URL = 'https://test.example.com';
    const result = interpolateEnvVars({ baseUrl: '${TEST_URL}' });
    expect(result.baseUrl).toBe('https://test.example.com');
  });

  it('should use default value when env var is missing', () => {
    delete process.env.MISSING_VAR;
    const result = interpolateEnvVars({ baseUrl: '${MISSING_VAR:-https://default.com}' });
    expect(result.baseUrl).toBe('https://default.com');
  });

  it('should throw when required env var is missing', () => {
    delete process.env.REQUIRED_VAR;
    expect(() => interpolateEnvVars({ baseUrl: '${REQUIRED_VAR}' }))
      .toThrow('Missing required environment variable: REQUIRED_VAR');
  });

  it('should handle nested objects', () => {
    process.env.USER = 'testuser';
    process.env.PASS = 'secret';
    const result = interpolateEnvVars({
      credentials: {
        username: '${USER}',
        password: '${PASS}',
      },
    });
    expect(result.credentials.username).toBe('testuser');
    expect(result.credentials.password).toBe('secret');
  });

  it('should leave non-interpolated strings unchanged', () => {
    const result = interpolateEnvVars({ baseUrl: 'https://static.com' });
    expect(result.baseUrl).toBe('https://static.com');
  });

  it('should handle arrays', () => {
    process.env.ITEM = 'value';
    const result = interpolateEnvVars({ items: ['${ITEM}', 'static'] });
    expect(result.items).toEqual(['value', 'static']);
  });
});
