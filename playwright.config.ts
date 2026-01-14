import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConfigLoader } from './framework/config/loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const site = process.env.SITE;
const env = process.env.ENV ?? 'staging';
const configLoader = new ConfigLoader();

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

function getEnabledSites(): string[] {
  const allSites = discoverSites();
  const enabledSites: string[] = [];

  for (const siteName of allSites) {
    const { enabled, reason } = configLoader.isEnabledSync({ site: siteName, env });
    if (enabled) {
      enabledSites.push(siteName);
    } else {
      console.log(`\x1b[33mSkipping ${siteName}: ${reason}\x1b[0m`);
    }
  }

  return enabledSites;
}

function isSiteEnabled(siteName: string): boolean {
  const { enabled, reason } = configLoader.isEnabledSync({ site: siteName, env });
  if (!enabled) {
    console.log(`\x1b[33mSkipping ${siteName}: ${reason}\x1b[0m`);
  }
  return enabled;
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
    ? (isSiteEnabled(site)
        ? [
            {
              name: site,
              testDir: `./sites/${site}/tests`,
              use: {
                ...devices['Desktop Chrome'],
              },
            },
          ]
        : [])
    : getEnabledSites().map((siteName) => ({
        name: siteName,
        testDir: `./sites/${siteName}/tests`,
        use: {
          ...devices['Desktop Chrome'],
        },
      })),
});
