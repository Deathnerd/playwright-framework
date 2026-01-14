import { BaseComponent, Component } from '../../../framework/core/index.js';

export class NavItemComponent extends BaseComponent {
  async click(): Promise<void> {
    await this.locator.click();
  }

  async getText(): Promise<string> {
    return (await this.locator.textContent()) ?? '';
  }
}

export class HeaderComponent extends BaseComponent {
  static readonly selectors = {
    logo: '[data-testid="logo"]',
    navItem: '[data-testid="nav-item"]',
    searchInput: '[data-testid="search-input"]',
    cartButton: '[data-testid="cart-button"]',
  } as const;

  async clickLogo(): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.logo).click();
  }

  async search(query: string): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.searchInput).fill(query);
    await this.locator.locator(HeaderComponent.selectors.searchInput).press('Enter');
  }

  async openCart(): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.cartButton).click();
  }
}
