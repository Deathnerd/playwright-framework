import { test, expect } from '@framework/test.js';
import { HomePage } from '../pages/index.js';

test.describe('Home Page', () => {
  test('should load home page', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();
    await expect(page).toHaveTitle(/Example/);
  });

  test('should display header', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();
    await expect(homePage.header.locator).toBeVisible();
  });

  test('should navigate via header', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();
    await homePage.header.clickLogo();
    await expect(page).toHaveURL(config.baseUrl + '/');
  });
});
