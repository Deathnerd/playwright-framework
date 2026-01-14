import type { Locator, Page } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';
import type { ComponentConstructor } from './types.js';
import { BaseComponent } from './BaseComponent.js';

// Declaration merging: interface adds index signature to the class
// This tells TypeScript that ComponentCollection<T> supports numeric indexing
export interface ComponentCollection<T extends BaseComponent> {
  [index: number]: T;
}

export class ComponentCollection<T extends BaseComponent> {
  constructor(
    private readonly locator: Locator,
    private readonly ComponentClass: ComponentConstructor<T>,
    private readonly config: SiteConfig,
    private readonly page?: Page
  ) {
    // Proxy enables array-like access: collection[0], collection[1], etc.
    // The interface declaration above makes this type-safe without casts
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.nth(parseInt(prop, 10));
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async count(): Promise<number> {
    return this.locator.count();
  }

  nth(index: number): T {
    return new this.ComponentClass(this.locator.nth(index), this.config, this.page);
  }

  first(): T {
    return new this.ComponentClass(this.locator.first(), this.config, this.page);
  }

  last(): T {
    return new this.ComponentClass(this.locator.last(), this.config, this.page);
  }

  filter(options: { hasText?: string | RegExp; has?: Locator }): ComponentCollection<T> {
    return new ComponentCollection(
      this.locator.filter(options),
      this.ComponentClass,
      this.config,
      this.page
    );
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const count = await this.count();
    for (let i = 0; i < count; i++) {
      yield this.nth(i);
    }
  }

  async all(): Promise<T[]> {
    const items: T[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }
}
