---
purpose: guide
topics: [page-objects, pages, navigation, routes]
related:
  - "[[components]]"
  - "[[architecture]]"
  - "[[testing]]"
see-also:
  - framework/core/BasePage.ts
---

# Page Objects

Page objects represent entire pages in your application. They contain components and provide page-level interactions.

## BasePage

All pages extend `BasePage`:

```typescript
import { BasePage, Page } from '@framework/core/index.js';

@Page('/dashboard')
export class DashboardPage extends BasePage {
  // Page implementation
}
```

### The @Page Decorator

The `@Page` decorator defines the route for the page:

```typescript
@Page('/products')           // Simple route
@Page('/products/:id')       // Route with parameter (for reference)
@Page('/checkout')           // Another route
```

### Constructor Parameters

```typescript
constructor(
  page: Page,          // Playwright Page object
  config: SiteConfig   // Site configuration
)
```

## Creating Pages

### Basic Page

```typescript
import { BasePage, Page } from '@framework/core/index.js';
import { HeaderComponent } from '../components/HeaderComponent.js';
import { FooterComponent } from '../components/FooterComponent.js';

@Page('/home')
export class HomePage extends BasePage {
  static readonly selectors = {
    hero: '[data-testid="hero"]',
    featuredProducts: '[data-testid="featured"]',
  } as const;

  get header() {
    return new HeaderComponent(
      this.page.locator('[data-testid="header"]'),
      this.config,
      this.page
    );
  }

  get footer() {
    return new FooterComponent(
      this.page.locator('[data-testid="footer"]'),
      this.config,
      this.page
    );
  }

  get hero() {
    return this.page.locator(HomePage.selectors.hero);
  }
}
```

### Page with Multiple Components

```typescript
@Page('/dashboard')
export class DashboardPage extends BasePage {
  static readonly selectors = {
    pageTitle: 'h1:has-text("Dashboard")',
    welcomeMessage: '[data-testid="welcome"]',
  } as const;

  // Shared component across pages
  get navBar() {
    return new NavBarComponent(
      this.page.locator('body'),
      this.config,
      this.page
    );
  }

  // Page-specific components
  get filters() {
    return new DashboardFiltersComponent(
      this.page.locator('[data-testid="filters"]'),
      this.config,
      this.page
    );
  }

  get summaryCards() {
    return new SummaryCardsComponent(
      this.page.locator('[data-testid="summary"]'),
      this.config,
      this.page
    );
  }

  // Direct element access
  get pageTitle() {
    return this.page.locator(DashboardPage.selectors.pageTitle);
  }
}
```

## Navigation

### Using goto()

The `goto()` method navigates to the page's route:

```typescript
const dashboard = await new DashboardPage(page, config).goto();

// goto() returns `this` for chaining
const products = await new ProductsPage(page, config)
  .goto()
  .then(p => p.filterByCategory('Electronics'));
```

### How goto() Works

```typescript
async goto(): Promise<this> {
  const route = this.getRoute();  // Gets route from @Page decorator
  const url = this.config.baseUrl + route;
  await this.page.goto(url);
  await this.waitForReady();      // Wait for page to be ready
  return this;
}
```

### Custom waitForReady

Override `waitForReady()` for pages that need special loading logic:

```typescript
@Page('/dashboard')
export class DashboardPage extends BasePage {
  protected override async waitForReady(): Promise<void> {
    // Wait for specific element instead of networkidle
    await this.page.locator('[data-testid="dashboard-loaded"]')
      .waitFor({ state: 'visible' });
  }
}
```

### Navigation Between Pages

```typescript
@Page('/products')
export class ProductsPage extends BasePage {
  async navigateToProduct(id: string): Promise<ProductPage> {
    await this.page.locator(`[data-product-id="${id}"]`).click();
    return new ProductPage(this.page, this.config);
  }
}
```

## Page Methods

### Action Methods

```typescript
@Page('/login')
export class LoginPage extends BasePage {
  async login(email: string, password: string): Promise<void> {
    await this.page.locator('[name="email"]').fill(email);
    await this.page.locator('[name="password"]').fill(password);
    await this.page.locator('[type="submit"]').click();
  }

  async loginAndNavigateToDashboard(
    email: string,
    password: string
  ): Promise<DashboardPage> {
    await this.login(email, password);
    await this.page.waitForURL(/\/dashboard/);
    return new DashboardPage(this.page, this.config);
  }
}
```

### Query Methods

```typescript
@Page('/products')
export class ProductsPage extends BasePage {
  async getProductCount(): Promise<number> {
    return this.page.locator('[data-testid="product-card"]').count();
  }

  async getProductNames(): Promise<string[]> {
    const products = this.page.locator('[data-testid="product-name"]');
    const count = await products.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      names.push(await products.nth(i).textContent() ?? '');
    }
    return names;
  }
}
```

## Shared Components

For components used across multiple pages (like navigation):

### Pattern 1: Base Page Class

```typescript
// sites/mysite/pages/AuthenticatedPage.ts
export abstract class AuthenticatedPage extends BasePage {
  get navBar() {
    return new NavBarComponent(
      this.page.locator('body'),
      this.config,
      this.page
    );
  }

  get footer() {
    return new FooterComponent(
      this.page.locator('[data-testid="footer"]'),
      this.config,
      this.page
    );
  }
}

// sites/mysite/pages/DashboardPage.ts
@Page('/dashboard')
export class DashboardPage extends AuthenticatedPage {
  // navBar and footer inherited
  // Add dashboard-specific components
}
```

### Pattern 2: Getter in Each Page

```typescript
@Page('/dashboard')
export class DashboardPage extends BasePage {
  get navBar() {
    return new NavBarComponent(
      this.page.locator('body'),
      this.config,
      this.page
    );
  }
}

@Page('/products')
export class ProductsPage extends BasePage {
  get navBar() {
    return new NavBarComponent(
      this.page.locator('body'),
      this.config,
      this.page
    );
  }
}
```

## Best Practices

### DO

- Use `@Page` decorator for route definition
- Create getters for component access
- Override `waitForReady()` for complex loading
- Return page objects from navigation methods
- Keep page methods focused on page-level actions

### DON'T

- Put business logic in page objects
- Access DOM directly for complex components
- Skip the `goto()` call when navigation is needed
- Hardcode URLs (use `config.baseUrl`)

## Example: Complete Page Object

```typescript
import { BasePage, Page } from '@framework/core/index.js';
import { NavBarComponent } from '../components/NavBarComponent.js';
import { ProductGridComponent } from '../components/ProductGridComponent.js';
import { FilterSidebarComponent } from '../components/FilterSidebarComponent.js';
import { PaginationComponent } from '../components/PaginationComponent.js';

@Page('/products')
export class ProductsPage extends BasePage {
  static readonly selectors = {
    pageTitle: 'h1:has-text("Products")',
    searchInput: '[data-testid="product-search"]',
    sortDropdown: '[data-testid="sort-by"]',
  } as const;

  // Shared navigation
  get navBar() {
    return new NavBarComponent(
      this.page.locator('body'),
      this.config,
      this.page
    );
  }

  // Page components
  get filters() {
    return new FilterSidebarComponent(
      this.page.locator('[data-testid="filters"]'),
      this.config
    );
  }

  get productGrid() {
    return new ProductGridComponent(
      this.page.locator('[data-testid="product-grid"]'),
      this.config
    );
  }

  get pagination() {
    return new PaginationComponent(
      this.page.locator('[data-testid="pagination"]'),
      this.config
    );
  }

  // Page elements
  get pageTitle() {
    return this.page.locator(ProductsPage.selectors.pageTitle);
  }

  // Page actions
  async search(query: string): Promise<void> {
    await this.page.locator(ProductsPage.selectors.searchInput).fill(query);
    await this.page.locator(ProductsPage.selectors.searchInput).press('Enter');
  }

  async sortBy(option: string): Promise<void> {
    await this.page.locator(ProductsPage.selectors.sortDropdown).selectOption(option);
  }

  // Custom ready state
  protected override async waitForReady(): Promise<void> {
    await this.productGrid.locator.waitFor({ state: 'visible' });
  }
}
```
