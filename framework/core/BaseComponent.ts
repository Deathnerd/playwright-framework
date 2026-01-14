import type { Locator, Page } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

export class BaseComponent {
  static readonly selectors: Record<string, string> = {};

  constructor(
    public readonly locator: Locator,
    public readonly config: SiteConfig,
    public readonly page?: Page
  ) {}
}
