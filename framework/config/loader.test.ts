import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from './loader.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ConfigLoader', () => {
  const testSitesDir = path.join(__dirname, '__test_sites__');
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    // Create test site structure
    await fs.mkdir(path.join(testSitesDir, 'testsite', 'env'), { recursive: true });

    await fs.writeFile(
      path.join(testSitesDir, 'testsite', 'config.json'),
      JSON.stringify({
        baseUrl: 'https://testsite.com',
        timeouts: { navigation: 60000 },
      })
    );

    await fs.writeFile(
      path.join(testSitesDir, 'testsite', 'env', 'staging.json'),
      JSON.stringify({
        baseUrl: 'https://staging.testsite.com',
      })
    );
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testSitesDir, { recursive: true, force: true });
  });

  it('should load framework defaults', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite' });

    expect(config.diagnostics?.screenshot).toBe('only-on-failure');
  });

  it('should merge site config over defaults', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite' });

    expect(config.baseUrl).toBe('https://testsite.com');
    expect(config.timeouts.navigation).toBe(60000);
    expect(config.timeouts.action).toBe(5000); // from defaults
  });

  it('should merge env config over site config', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite', env: 'staging' });

    expect(config.baseUrl).toBe('https://staging.testsite.com');
  });

  it('should interpolate environment variables', async () => {
    process.env.TEST_BASE_URL = 'https://env-override.com';

    await fs.writeFile(
      path.join(testSitesDir, 'testsite', 'config.json'),
      JSON.stringify({
        baseUrl: '${TEST_BASE_URL}',
      })
    );

    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite' });

    expect(config.baseUrl).toBe('https://env-override.com');
  });

  it('should throw for missing site', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });

    await expect(loader.resolve({ site: 'nonexistent' }))
      .rejects.toThrow(/Site config not found/);
  });
});
