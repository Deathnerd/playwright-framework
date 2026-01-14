import 'reflect-metadata';
import type { Page as PlaywrightPage } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';
import { getComponentMetadata, type ComponentMetadata } from './decorators.js';
import { ComponentCollection } from './ComponentCollection.js';

const PAGE_ROUTE_KEY = Symbol('page:route');

export function Page(route: string): ClassDecorator {
  return (target: Function): void => {
    Reflect.defineMetadata(PAGE_ROUTE_KEY, route, target);
  };
}

export function getPageRoute(target: Function): string | undefined {
  return Reflect.getMetadata(PAGE_ROUTE_KEY, target) as string | undefined;
}

export class BasePage {
  constructor(
    public readonly page: PlaywrightPage,
    public readonly config: SiteConfig
  ) {
    this.initializeComponents();
  }

  async goto(): Promise<this> {
    const route = this.getRoute();
    const url = this.config.baseUrl + route;
    await this.page.goto(url);
    await this.waitForReady();
    return this;
  }

  protected getRoute(): string {
    const route = getPageRoute(this.constructor);
    if (!route) {
      throw new Error(`No @Page decorator found on ${this.constructor.name}`);
    }
    return route;
  }

  protected async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  private initializeComponents(): void {
    const metadata = getComponentMetadata(Object.getPrototypeOf(this)) as Record<
      string,
      ComponentMetadata
    >;

    for (const [propertyKey, meta] of Object.entries(metadata)) {
      const locator = this.page.locator(meta.selector);
      const ComponentClass = meta.type;

      if (!ComponentClass) {
        continue;
      }

      if (meta.multiple) {
        (this as any)[propertyKey] = new ComponentCollection(
          locator,
          ComponentClass as any,
          this.config,
          this.page
        );
      } else {
        (this as any)[propertyKey] = new ComponentClass(locator, this.config, this.page);
      }
    }
  }
}
