import { BasePage, Page } from '@framework/core/index.js';
import { HeaderComponent } from '../components/index.js';

@Page('/')
export class HomePage extends BasePage {
  get header() {
    return new HeaderComponent(
      this.page.locator('[data-testid="header"]'),
      this.config,
      this.page
    );
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
