import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { BasePage, Page as PageDecorator, getPageRoute } from './BasePage.js';
import { Component } from './decorators.js';
import { BaseComponent } from './BaseComponent.js';
import { ComponentCollection } from './ComponentCollection.js';
import type { Page } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

function createMockPage(): Page {
  return {
    goto: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://test.com/checkout'),
  } as unknown as Page;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('BasePage', () => {
  it('should store page and config', () => {
    const page = createMockPage();
    const basePage = new BasePage(page, mockConfig);

    expect(basePage.page).toBe(page);
    expect(basePage.config).toBe(mockConfig);
  });

  it('should navigate to route via goto()', async () => {
    @PageDecorator('/checkout')
    class CheckoutPage extends BasePage {}

    const page = createMockPage();
    const checkoutPage = new CheckoutPage(page, mockConfig);

    await checkoutPage.goto();

    expect(page.goto).toHaveBeenCalledWith('https://test.com/checkout');
    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle');
  });

  it('should return this from goto() for chaining', async () => {
    @PageDecorator('/checkout')
    class CheckoutPage extends BasePage {}

    const page = createMockPage();
    const checkoutPage = new CheckoutPage(page, mockConfig);

    const result = await checkoutPage.goto();

    expect(result).toBe(checkoutPage);
  });

  it('should get route from @Page decorator', () => {
    @PageDecorator('/products')
    class ProductsPage extends BasePage {}

    const route = getPageRoute(ProductsPage);
    expect(route).toBe('/products');
  });

  it('should allow custom waitForReady override', async () => {
    const customWait = vi.fn().mockResolvedValue(undefined);

    @PageDecorator('/custom')
    class CustomPage extends BasePage {
      protected override async waitForReady(): Promise<void> {
        await customWait();
      }
    }

    const page = createMockPage();
    const customPage = new CustomPage(page, mockConfig);

    await customPage.goto();

    expect(customWait).toHaveBeenCalled();
  });

  describe('component initialization', () => {
    it('should initialize child components from @Component decorators', () => {
      class HeaderComponent extends BaseComponent {}

      @PageDecorator('/home')
      class HomePage extends BasePage {
        @Component('[data-testid="header"]', { type: HeaderComponent })
        declare readonly header: HeaderComponent;
      }

      const mockLocator = {
        locator: vi.fn().mockReturnValue({
          textContent: vi.fn().mockResolvedValue('Header'),
        }),
      };
      const page = createMockPage();
      (page as any).locator = vi.fn().mockReturnValue(mockLocator);

      const homePage = new HomePage(page, mockConfig);

      expect(homePage.header).toBeInstanceOf(HeaderComponent);
    });

    it('should initialize ComponentCollection for multiple components', () => {
      class ItemComponent extends BaseComponent {}

      @PageDecorator('/list')
      class ListPage extends BasePage {
        @Component('[data-testid="item"]', { multiple: true, type: ItemComponent })
        declare readonly items: ComponentCollection<ItemComponent>;
      }

      const mockLocator = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockReturnValue({}),
      };
      const page = createMockPage();
      (page as any).locator = vi.fn().mockReturnValue(mockLocator);

      const listPage = new ListPage(page, mockConfig);

      expect(listPage.items).toBeInstanceOf(ComponentCollection);
    });
  });
});
