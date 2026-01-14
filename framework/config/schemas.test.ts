import { describe, it, expect } from 'vitest';
import { SiteConfigSchema } from './schemas.js';

describe('SiteConfigSchema', () => {
  it('should accept valid complete config', () => {
    const config = {
      enabled: true,
      baseUrl: 'https://example.com',
      credentials: {
        username: 'user',
        password: 'pass',
      },
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 10000,
      },
      diagnostics: {
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'off',
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should accept config with optional credentials', () => {
    const config = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 10000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should accept config with enabled: false', () => {
    const config = {
      enabled: false,
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 10000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it('should reject missing baseUrl', () => {
    const config = {
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 10000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('baseUrl');
    }
  });

  it('should reject invalid baseUrl (not a URL)', () => {
    const config = {
      baseUrl: 'not-a-valid-url',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 10000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('baseUrl');
      expect(result.error.issues[0].message.toLowerCase()).toContain('url');
    }
  });

  it('should reject negative timeout', () => {
    const config = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: -1000,
        action: 5000,
        assertion: 10000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('navigation');
    }
  });

  it('should reject invalid screenshot mode', () => {
    const config = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 10000,
      },
      diagnostics: {
        screenshot: 'invalid-mode',
        trace: 'off',
        video: 'off',
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('screenshot');
    }
  });
});
