import { describe, it, expect, vi } from 'vitest';
import { ComponentCollection } from './ComponentCollection.js';
import { BaseComponent } from './BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

class TestItemComponent extends BaseComponent {
  async getText(): Promise<string> {
    return (await this.locator.textContent()) ?? '';
  }
}

function createMockLocator(count: number): Locator {
  const nthMocks: Locator[] = [];

  for (let i = 0; i < count; i++) {
    nthMocks.push({
      textContent: vi.fn().mockResolvedValue(`Item ${i}`),
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
    } as unknown as Locator);
  }

  return {
    count: vi.fn().mockResolvedValue(count),
    nth: vi.fn().mockImplementation((index: number) => nthMocks[index]),
    first: vi.fn().mockReturnValue(nthMocks[0]),
    last: vi.fn().mockReturnValue(nthMocks[count - 1]),
    filter: vi.fn().mockReturnThis(),
  } as unknown as Locator;
}

describe('ComponentCollection', () => {
  it('should return count of items', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    expect(await collection.count()).toBe(3);
  });

  it('should access item by index using nth()', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection.nth(1);
    expect(item).toBeInstanceOf(TestItemComponent);
    expect(await item.getText()).toBe('Item 1');
  });

  it('should access item by numeric index via Proxy', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection[0];
    expect(item).toBeInstanceOf(TestItemComponent);
    expect(await item.getText()).toBe('Item 0');
  });

  it('should access first item', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection.first();
    expect(await item.getText()).toBe('Item 0');
  });

  it('should access last item', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection.last();
    expect(await item.getText()).toBe('Item 2');
  });

  it('should be async iterable', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const texts: string[] = [];
    for await (const item of collection) {
      texts.push(await item.getText());
    }

    expect(texts).toEqual(['Item 0', 'Item 1', 'Item 2']);
  });

  it('should support spread operator', async () => {
    const locator = createMockLocator(2);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const items = await collection.all();
    expect(items).toHaveLength(2);
    expect(items[0]).toBeInstanceOf(TestItemComponent);
  });
});
