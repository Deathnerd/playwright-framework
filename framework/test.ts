import { test as base, expect as baseExpect } from '@playwright/test';
import { ConfigLoader } from './config/loader.js';
import type { SiteConfig } from './config/types.js';
import { captureComponentState } from './diagnostics/capture.js';
import { componentMatchers } from './expect/matchers.js';

export interface TestFixtures {
  config: SiteConfig;
}

export const test = base.extend<TestFixtures>({
  config: async ({}, use, testInfo) => {
    const site = process.env.SITE;
    const env = process.env.ENV ?? 'staging';

    if (!site) {
      throw new Error('SITE environment variable is required');
    }

    const loader = new ConfigLoader();
    const config = await loader.resolve({ site, env });

    await use(config);
  },

  page: async ({ page, config }, use, testInfo) => {
    // Set default timeouts from config
    page.setDefaultTimeout(config.timeouts.action);
    page.setDefaultNavigationTimeout(config.timeouts.navigation);

    await use(page);

    // Capture diagnostics on failure (component capture would go here if components were tracked)
    if (testInfo.status === 'failed') {
      await testInfo.attach('page-url', {
        body: page.url(),
        contentType: 'text/plain',
      });
    }
  },
});

export const expect = baseExpect.extend(componentMatchers);

export { type SiteConfig } from './config/types.js';
