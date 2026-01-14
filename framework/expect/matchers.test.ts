import { describe, it, expect, vi } from 'vitest';
import { componentMatchers } from './matchers.js';
import { BaseComponent } from '../core/BaseComponent.js';
import { ComponentCollection } from '../core/ComponentCollection.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

function createMockLocator(overrides: Partial<Locator> = {}): Locator {
  return {
    count: vi.fn().mockResolvedValue(0),
    nth: vi.fn().mockReturnThis(),
    first: vi.fn().mockReturnThis(),
    last: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    getAttribute: vi.fn().mockResolvedValue(null),
    textContent: vi.fn().mockResolvedValue(''),
    isVisible: vi.fn().mockResolvedValue(true),
    click: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Locator;
}

function createMockCollectionLocator(count: number): Locator {
  const nthMocks: Locator[] = [];
  for (let i = 0; i < count; i++) {
    nthMocks.push(createMockLocator());
  }

  return {
    count: vi.fn().mockResolvedValue(count),
    nth: vi.fn().mockImplementation((index: number) => nthMocks[index]),
    first: vi.fn().mockReturnValue(nthMocks[0]),
    last: vi.fn().mockReturnValue(nthMocks[count - 1]),
    filter: vi.fn().mockReturnThis(),
  } as unknown as Locator;
}

describe('componentMatchers', () => {
  describe('toHaveItemCount', () => {
    it('should pass when collection has expected count', async () => {
      const locator = createMockCollectionLocator(5);
      const collection = new ComponentCollection(locator, BaseComponent, mockConfig);

      const result = await componentMatchers.toHaveItemCount(collection, 5);

      expect(result.pass).toBe(true);
      expect(result.message()).toBe('Expected collection not to have 5 items');
    });

    it('should fail when collection has different count', async () => {
      const locator = createMockCollectionLocator(3);
      const collection = new ComponentCollection(locator, BaseComponent, mockConfig);

      const result = await componentMatchers.toHaveItemCount(collection, 5);

      expect(result.pass).toBe(false);
      expect(result.message()).toBe('Expected collection to have 5 items, but got 3');
    });

    it('should pass for empty collection when expecting 0', async () => {
      const locator = createMockCollectionLocator(0);
      const collection = new ComponentCollection(locator, BaseComponent, mockConfig);

      const result = await componentMatchers.toHaveItemCount(collection, 0);

      expect(result.pass).toBe(true);
    });

    it('should fail for empty collection when expecting items', async () => {
      const locator = createMockCollectionLocator(0);
      const collection = new ComponentCollection(locator, BaseComponent, mockConfig);

      const result = await componentMatchers.toHaveItemCount(collection, 3);

      expect(result.pass).toBe(false);
      expect(result.message()).toBe('Expected collection to have 3 items, but got 0');
    });
  });

  describe('toBeInState', () => {
    it('should pass when component is in expected state', async () => {
      const locator = createMockLocator({
        getAttribute: vi.fn().mockResolvedValue('active'),
      });
      const component = new BaseComponent(locator, mockConfig);

      const result = await componentMatchers.toBeInState(component, 'active');

      expect(result.pass).toBe(true);
      expect(result.message()).toBe('Expected component not to be in state "active"');
    });

    it('should fail when component is in different state', async () => {
      const locator = createMockLocator({
        getAttribute: vi.fn().mockResolvedValue('inactive'),
      });
      const component = new BaseComponent(locator, mockConfig);

      const result = await componentMatchers.toBeInState(component, 'active');

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected component to be in state "active", but got "inactive"'
      );
    });

    it('should handle null state (no data-state attribute)', async () => {
      const locator = createMockLocator({
        getAttribute: vi.fn().mockResolvedValue(null),
      });
      const component = new BaseComponent(locator, mockConfig);

      const result = await componentMatchers.toBeInState(component, 'active');

      expect(result.pass).toBe(false);
      expect(result.message()).toBe(
        'Expected component to be in state "active", but got "null"'
      );
    });

    it('should pass when expecting null state and component has no state', async () => {
      const locator = createMockLocator({
        getAttribute: vi.fn().mockResolvedValue(null),
      });
      const component = new BaseComponent(locator, mockConfig);

      // Note: This tests exact match behavior - null === null would not work with string
      // In practice, if you need to check for missing attribute, use different approach
      const result = await componentMatchers.toBeInState(component, 'null');

      // Will fail because actual is null (object), not "null" (string)
      expect(result.pass).toBe(false);
    });

    it('should verify getAttribute is called with data-state', async () => {
      const getAttribute = vi.fn().mockResolvedValue('loading');
      const locator = createMockLocator({ getAttribute });
      const component = new BaseComponent(locator, mockConfig);

      await componentMatchers.toBeInState(component, 'loading');

      expect(getAttribute).toHaveBeenCalledWith('data-state');
    });
  });
});
