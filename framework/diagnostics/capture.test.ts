import { describe, it, expect, vi } from 'vitest';
import { captureComponentState } from './capture.js';
import { BaseComponent } from '../core/BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';
import type { BoundingBox, ComponentDiagnostics } from './types.js';

// Mock locator factory
function createMockLocator(overrides: Partial<Locator> = {}): Locator {
  return {
    boundingBox: vi.fn().mockResolvedValue({ x: 10, y: 20, width: 100, height: 50 }),
    isVisible: vi.fn().mockResolvedValue(true),
    innerHTML: vi.fn().mockResolvedValue('<span>Test content</span>'),
    evaluate: vi.fn().mockResolvedValue({ 'data-testid': 'test-component', class: 'btn' }),
    ...overrides,
  } as unknown as Locator;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('captureComponentState', () => {
  it('should capture all component diagnostics', async () => {
    const locator = createMockLocator();
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.componentName).toBe('BaseComponent');
    expect(diagnostics.selector).toBe('unknown');
    expect(diagnostics.boundingBox).toEqual({ x: 10, y: 20, width: 100, height: 50 });
    expect(diagnostics.isVisible).toBe(true);
    expect(diagnostics.innerHTML).toBe('<span>Test content</span>');
    expect(diagnostics.attributes).toEqual({ 'data-testid': 'test-component', class: 'btn' });
  });

  it('should handle null boundingBox when element is not in viewport', async () => {
    const locator = createMockLocator({
      boundingBox: vi.fn().mockResolvedValue(null),
    });
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.boundingBox).toBeNull();
  });

  it('should capture visibility state correctly', async () => {
    const locator = createMockLocator({
      isVisible: vi.fn().mockResolvedValue(false),
    });
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.isVisible).toBe(false);
  });

  it('should capture empty innerHTML for empty elements', async () => {
    const locator = createMockLocator({
      innerHTML: vi.fn().mockResolvedValue(''),
    });
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.innerHTML).toBe('');
  });

  it('should capture empty attributes object', async () => {
    const locator = createMockLocator({
      evaluate: vi.fn().mockResolvedValue({}),
    });
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.attributes).toEqual({});
  });

  it('should use subclass name as componentName', async () => {
    class CustomButton extends BaseComponent {
      static readonly selectors = { root: '[data-testid="custom-btn"]' };
    }

    const locator = createMockLocator();
    const component = new CustomButton(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.componentName).toBe('CustomButton');
  });

  it('should use rootSelector if available on component', async () => {
    class CustomComponent extends BaseComponent {
      readonly rootSelector = '[data-testid="custom"]';
    }

    const locator = createMockLocator();
    const component = new CustomComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.selector).toBe('[data-testid="custom"]');
  });

  it('should call all locator methods in parallel', async () => {
    const boundingBoxFn = vi.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 100 });
    const isVisibleFn = vi.fn().mockResolvedValue(true);
    const innerHTMLFn = vi.fn().mockResolvedValue('<div></div>');
    const evaluateFn = vi.fn().mockResolvedValue({});

    const locator = createMockLocator({
      boundingBox: boundingBoxFn,
      isVisible: isVisibleFn,
      innerHTML: innerHTMLFn,
      evaluate: evaluateFn,
    });
    const component = new BaseComponent(locator, mockConfig);

    await captureComponentState(component);

    expect(boundingBoxFn).toHaveBeenCalledTimes(1);
    expect(isVisibleFn).toHaveBeenCalledTimes(1);
    expect(innerHTMLFn).toHaveBeenCalledTimes(1);
    expect(evaluateFn).toHaveBeenCalledTimes(1);
  });

  it('should handle complex HTML content', async () => {
    const complexHTML = `
      <div class="container">
        <button data-action="submit">Click me</button>
        <input type="text" value="test" />
      </div>
    `;
    const locator = createMockLocator({
      innerHTML: vi.fn().mockResolvedValue(complexHTML),
    });
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.innerHTML).toBe(complexHTML);
  });

  it('should handle multiple attributes', async () => {
    const attributes = {
      id: 'main-form',
      class: 'form form-horizontal',
      'data-testid': 'registration-form',
      'aria-label': 'Registration form',
      role: 'form',
    };
    const locator = createMockLocator({
      evaluate: vi.fn().mockResolvedValue(attributes),
    });
    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.attributes).toEqual(attributes);
  });
});
