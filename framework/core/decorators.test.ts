import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { Component, getComponentMetadata } from './decorators.js';
import { BaseComponent } from './BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

function createMockLocator(): Locator {
  const self: Partial<Locator> = {
    locator: vi.fn().mockImplementation(() => self),
  };
  return self as Locator;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('@Component decorator', () => {
  it('should store metadata for decorated property', () => {
    class ChildComponent extends BaseComponent {}

    class ParentComponent extends BaseComponent {
      @Component('[data-testid="child"]')
      readonly child!: ChildComponent;
    }

    const metadata = getComponentMetadata(ParentComponent.prototype, 'child');
    expect(metadata).toBeDefined();
    expect(metadata?.selector).toBe('[data-testid="child"]');
    expect(metadata?.multiple).toBe(false);
  });

  it('should support multiple option', () => {
    class ItemComponent extends BaseComponent {}

    class ListComponent extends BaseComponent {
      @Component('[data-testid="item"]', { multiple: true })
      readonly items!: ItemComponent[];
    }

    const metadata = getComponentMetadata(ListComponent.prototype, 'items');
    expect(metadata?.multiple).toBe(true);
  });

  it('should get all component properties from class', () => {
    class HeaderComponent extends BaseComponent {}
    class FooterComponent extends BaseComponent {}

    class PageComponent extends BaseComponent {
      @Component('[data-testid="header"]')
      readonly header!: HeaderComponent;

      @Component('[data-testid="footer"]')
      readonly footer!: FooterComponent;
    }

    const allMetadata = getComponentMetadata(PageComponent.prototype);
    expect(Object.keys(allMetadata)).toHaveLength(2);
    expect(allMetadata.header.selector).toBe('[data-testid="header"]');
    expect(allMetadata.footer.selector).toBe('[data-testid="footer"]');
  });

  it('should store type from explicit type option', () => {
    class HeaderComponent extends BaseComponent {}

    class PageComponent extends BaseComponent {
      @Component('[data-testid="header"]', { type: HeaderComponent })
      readonly header!: HeaderComponent;
    }

    const metadata = getComponentMetadata(PageComponent.prototype, 'header');
    expect(metadata?.type).toBe(HeaderComponent);
  });

  it('should support both type and multiple options', () => {
    class ItemComponent extends BaseComponent {}

    class ListComponent extends BaseComponent {
      @Component('[data-testid="item"]', { type: ItemComponent, multiple: true })
      readonly items!: ItemComponent[];
    }

    const metadata = getComponentMetadata(ListComponent.prototype, 'items');
    expect(metadata?.type).toBe(ItemComponent);
    expect(metadata?.multiple).toBe(true);
  });
});
