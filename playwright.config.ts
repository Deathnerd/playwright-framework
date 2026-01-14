import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const site = process.env.SITE;
const env = process.env.ENV ?? 'staging';

function discoverSites(): string[] {
  const sitesDir = path.join(__dirname, 'sites');
  if (!fs.existsSync(sitesDir)) {
    return [];
  }
  return fs.readdirSync(sitesDir).filter((name) => {
    const sitePath = path.join(sitesDir, name);
    return fs.statSync(sitePath).isDirectory() &&
           fs.existsSync(path.join(sitePath, 'config.json'));
  });
}

export default defineConfig({
  testDir: site ? `./sites/${site}/tests` : './sites',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: site
    ? [
        {
          name: site,
          testDir: `./sites/${site}/tests`,
          use: {
            ...devices['Desktop Chrome'],
          },
        },
      ]
    : discoverSites().map((siteName) => ({
        name: siteName,
        testDir: `./sites/${siteName}/tests`,
        use: {
          ...devices['Desktop Chrome'],
        },
      })),
});
