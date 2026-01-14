import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';
import type { ComponentConstructor } from './types.js';
import { BaseComponent } from './BaseComponent.js';

export type ArrayAccessible<T extends BaseComponent> = ComponentCollection<T> & {
  [index: number]: T;
};

export class ComponentCollection<T extends BaseComponent> {
  constructor(
    private readonly locator: Locator,
    private readonly ComponentClass: ComponentConstructor<T>,
    private readonly config: SiteConfig
  ) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.nth(parseInt(prop, 10));
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as ArrayAccessible<T>;
  }

  async count(): Promise<number> {
    return this.locator.count();
  }

  nth(index: number): T {
    return new this.ComponentClass(this.locator.nth(index), this.config);
  }

  first(): T {
    return new this.ComponentClass(this.locator.first(), this.config);
  }

  last(): T {
    return new this.ComponentClass(this.locator.last(), this.config);
  }

  filter(options: { hasText?: string | RegExp; has?: Locator }): ComponentCollection<T> {
    return new ComponentCollection(
      this.locator.filter(options),
      this.ComponentClass,
      this.config
    ) as ArrayAccessible<T> as ComponentCollection<T>;
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
