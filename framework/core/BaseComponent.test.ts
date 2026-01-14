import { describe, it, expect, vi } from 'vitest';
import { BaseComponent } from './BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

// Mock locator
function createMockLocator(overrides: Partial<Locator> = {}): Locator {
  return {
    locator: vi.fn().mockReturnThis(),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue('test'),
    isVisible: vi.fn().mockResolvedValue(true),
    waitFor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Locator;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('BaseComponent', () => {
  it('should store locator and config', () => {
    const locator = createMockLocator();
    const component = new BaseComponent(locator, mockConfig);

    expect(component.locator).toBe(locator);
    expect(component.config).toBe(mockConfig);
  });

  it('should allow subclasses to define static selectors', () => {
    class TestComponent extends BaseComponent {
      static readonly selectors = {
        button: '[data-testid="btn"]',
        input: '[data-testid="input"]',
      } as const;
    }

    expect(TestComponent.selectors.button).toBe('[data-testid="btn"]');
  });

  it('should provide selector access in subclass', () => {
    class TestComponent extends BaseComponent {
      static readonly selectors = {
        button: '[data-testid="btn"]',
      } as const;

      get buttonSelector(): string {
        return TestComponent.selectors.button;
      }
    }

    const locator = createMockLocator();
    const component = new TestComponent(locator, mockConfig);

    expect(component.buttonSelector).toBe('[data-testid="btn"]');
  });

  it('should allow subclasses to use locator methods', async () => {
    const mockClick = vi.fn().mockResolvedValue(undefined);
    const innerLocator = createMockLocator({ click: mockClick });
    const locator = createMockLocator({
      locator: vi.fn().mockReturnValue(innerLocator),
    });

    class ButtonComponent extends BaseComponent {
      static readonly selectors = {
        submit: '[type="submit"]',
      } as const;

      async clickSubmit(): Promise<void> {
        await this.locator.locator(ButtonComponent.selectors.submit).click();
      }
    }

    const component = new ButtonComponent(locator, mockConfig);
    await component.clickSubmit();

    expect(locator.locator).toHaveBeenCalledWith('[type="submit"]');
    expect(mockClick).toHaveBeenCalled();
  });
});
