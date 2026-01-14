import type { Locator, Page } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

export interface ComponentConstructor<T extends BaseComponentInterface = BaseComponentInterface> {
  new (locator: Locator, config: SiteConfig, page?: Page): T;
  readonly selectors?: Record<string, string>;
}

export interface BaseComponentInterface {
  readonly locator: Locator;
  readonly config: SiteConfig;
  readonly page?: Page;
}

export interface ComponentOptions {
  multiple?: boolean;
  type?: ComponentConstructor;
}

export interface ComponentDefineOptions {
  readyWhen?: (locator: Locator) => Promise<void>;
  readySelector?: string;
  readyState?: 'visible' | 'hidden' | 'attached' | 'detached';
}
