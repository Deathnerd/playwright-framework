import { describe, it, expect } from 'vitest';
import type { SiteConfig, DiagnosticsConfig, TimeoutsConfig } from './types.js';

describe('SiteConfig types', () => {
  it('should accept valid minimal config', () => {
    const config: SiteConfig = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
    };
    expect(config.baseUrl).toBe('https://example.com');
  });

  it('should accept config with all optional fields', () => {
    const config: SiteConfig = {
      baseUrl: 'https://example.com',
      credentials: {
        username: 'test',
        password: 'pass',
      },
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
      diagnostics: {
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'off',
      },
    };
    expect(config.credentials?.username).toBe('test');
  });
});
