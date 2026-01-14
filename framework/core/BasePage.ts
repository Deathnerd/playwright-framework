import 'reflect-metadata';
import type { Page as PlaywrightPage } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

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
  ) {}

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
}
