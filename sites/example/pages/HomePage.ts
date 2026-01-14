import { BasePage, Page, Component } from '../../../framework/core/index.js';
import { HeaderComponent } from '../components/index.js';

@Page('/')
export class HomePage extends BasePage {
  @Component('[data-testid="header"]', { type: HeaderComponent })
  declare readonly header: HeaderComponent;

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
