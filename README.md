# Playwright Page Object Framework

A multi-site, component-based page object framework for [Playwright](https://playwright.dev/) with strict TypeScript, designed for testing multiple web applications from a single codebase.

## Features

- **Multi-site architecture** - Test multiple sites from one codebase with shared and site-specific code
- **Component composition** - Build pages from reusable, nested components
- **4-level configuration** - Framework defaults → Site config → Environment config → Local overrides
- **Environment variable interpolation** - Use `${VAR:-default}` syntax in config files
- **Zod validation** - Runtime config validation with clear error messages
- **Type-safe selectors** - Static selector objects with full TypeScript inference
- **Collection support** - First-class support for lists of components with array-like access
- **Extended test fixture** - Custom `config` fixture with resolved site configuration

## Requirements

- Node.js 18+
- npm 9+

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd playwright-framework

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Quick Start

```bash
# Run all tests for all enabled sites
npm test

# Run tests for a specific site
SITE=mysite npm test

# Run with a specific environment
SITE=mysite ENV=staging npm test

# Run a single test file
SITE=mysite npm test -- path/to/test.spec.ts

# Run in headed mode
SITE=mysite npm test -- --headed

# Open Playwright UI
npm run test:ui

# Run unit tests
npm run test:unit

# Type check
npm run lint
```

## Project Structure

```
playwright-framework/
├── framework/                 # Core framework (shared across all sites)
│   ├── core/                  # BaseComponent, BasePage, decorators
│   │   ├── BaseComponent.ts   # Foundation for all components
│   │   ├── BasePage.ts        # Foundation for all page objects
│   │   ├── ComponentCollection.ts  # Collection handling
│   │   └── decorators.ts      # @Page, @Component decorators
│   ├── config/                # Configuration system
│   │   ├── loader.ts          # 4-level config resolution
│   │   ├── schemas.ts         # Zod validation schemas
│   │   └── types.ts           # TypeScript types
│   ├── expect/                # Custom Playwright matchers
│   ├── data/                  # Test data factories
│   ├── defaults.json          # Framework default configuration
│   └── test.ts                # Extended Playwright test fixture
├── sites/                     # Site-specific implementations
│   └── <site-name>/
│       ├── config.json        # Site configuration
│       ├── env/               # Environment-specific configs
│       │   ├── staging.json
│       │   └── production.json
│       ├── components/        # Site components
│       ├── pages/             # Page objects
│       ├── tests/             # Test files
│       ├── data/              # Test data fixtures
│       └── CLAUDE.md          # AI context for site
├── docs/                      # Documentation
├── local.json                 # Local overrides (gitignored)
└── playwright.config.ts       # Playwright configuration
```

## Creating a Site

### 1. Create Site Directory Structure

```bash
mkdir -p sites/mysite/{components,pages,tests,data,env}
```

### 2. Create Site Configuration

`sites/mysite/config.json`:

```json
{
  "baseUrl": "https://mysite.example.com",
  "credentials": {
    "username": "${TEST_USER}",
    "password": "${TEST_PASS}"
  },
  "timeouts": {
    "navigation": 60000
  }
}
```

### 3. Create Environment Configuration

`sites/mysite/env/staging.json`:

```json
{
  "baseUrl": "https://staging.mysite.example.com"
}
```

### 4. Create Index Files

`sites/mysite/components/index.ts`:

```typescript
export * from './HeaderComponent.js';
export * from './FooterComponent.js';
```

`sites/mysite/pages/index.ts`:

```typescript
export * from './HomePage.js';
export * from './LoginPage.js';
```

## Creating Components

Components encapsulate a section of the DOM with its interactions:

```typescript
// sites/mysite/components/SearchComponent.ts
import { BaseComponent } from '@framework/core/index.js';

export class SearchComponent extends BaseComponent {
  static readonly selectors = {
    input: '[data-testid="search-input"]',
    button: '[data-testid="search-button"]',
    results: '[data-testid="search-result"]',
  } as const;

  async search(query: string): Promise<void> {
    await this.locator.locator(SearchComponent.selectors.input).fill(query);
    await this.locator.locator(SearchComponent.selectors.button).click();
  }

  async getResultCount(): Promise<number> {
    return this.locator.locator(SearchComponent.selectors.results).count();
  }
}
```

### Component with Child Components

```typescript
import { BaseComponent } from '@framework/core/index.js';
import { SearchComponent } from './SearchComponent.js';
import { UserMenuComponent } from './UserMenuComponent.js';

export class HeaderComponent extends BaseComponent {
  static readonly selectors = {
    search: '[data-testid="header-search"]',
    userMenu: '[data-testid="user-menu"]',
    logo: '[data-testid="logo"]',
  } as const;

  get search() {
    return new SearchComponent(
      this.locator.locator(HeaderComponent.selectors.search),
      this.config
    );
  }

  get userMenu() {
    return new UserMenuComponent(
      this.locator.locator(HeaderComponent.selectors.userMenu),
      this.config,
      this.page
    );
  }
}
```

### Component Collections

For repeated elements like lists:

```typescript
import { BaseComponent, ComponentCollection } from '@framework/core/index.js';

export class ProductCardComponent extends BaseComponent {
  static readonly selectors = {
    name: '[data-testid="product-name"]',
    price: '[data-testid="product-price"]',
  } as const;

  async getName(): Promise<string> {
    return (await this.locator.locator(ProductCardComponent.selectors.name).textContent()) ?? '';
  }
}

export class ProductGridComponent extends BaseComponent {
  get products() {
    return new ComponentCollection(
      this.locator.locator('[data-testid="product-card"]'),
      ProductCardComponent,
      this.config
    );
  }
}

// Usage in tests:
const count = await grid.products.count();
const firstName = await grid.products[0].getName();
const lastProduct = grid.products.last();

for await (const product of grid.products) {
  console.log(await product.getName());
}
```

## Creating Page Objects

Pages represent entire pages and contain components:

```typescript
// sites/mysite/pages/DashboardPage.ts
import { BasePage, Page } from '@framework/core/index.js';
import { HeaderComponent } from '../components/HeaderComponent.js';
import { SidebarComponent } from '../components/SidebarComponent.js';

@Page('/dashboard')
export class DashboardPage extends BasePage {
  static readonly selectors = {
    title: 'h1[data-testid="page-title"]',
    welcomeMessage: '[data-testid="welcome"]',
  } as const;

  get header() {
    return new HeaderComponent(
      this.page.locator('[data-testid="header"]'),
      this.config,
      this.page
    );
  }

  get sidebar() {
    return new SidebarComponent(
      this.page.locator('[data-testid="sidebar"]'),
      this.config
    );
  }

  get title() {
    return this.page.locator(DashboardPage.selectors.title);
  }

  // Custom wait for page to be ready
  protected override async waitForReady(): Promise<void> {
    await this.page.locator('[data-testid="dashboard-loaded"]').waitFor({ state: 'visible' });
  }
}
```

### Navigation Between Pages

```typescript
@Page('/login')
export class LoginPage extends BasePage {
  async login(email: string, password: string): Promise<DashboardPage> {
    await this.page.locator('[name="email"]').fill(email);
    await this.page.locator('[name="password"]').fill(password);
    await this.page.locator('[type="submit"]').click();
    await this.page.waitForURL(/\/dashboard/);
    return new DashboardPage(this.page, this.config);
  }
}
```

## Writing Tests

```typescript
// sites/mysite/tests/dashboard.spec.ts
import { test, expect } from '@framework/test.js';
import { LoginPage, DashboardPage } from '../pages/index.js';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, config }) => {
    const loginPage = await new LoginPage(page, config).goto();
    await loginPage.login(
      config.credentials!.username,
      config.credentials!.password
    );
  });

  test('should display page title', async ({ page, config }) => {
    const dashboard = new DashboardPage(page, config);

    await expect(dashboard.title).toBeVisible();
    await expect(dashboard.title).toHaveText(/Dashboard/);
  });

  test('should show user menu in header', async ({ page, config }) => {
    const dashboard = new DashboardPage(page, config);

    await expect(dashboard.header.userMenu.locator).toBeVisible();
  });

  test('should navigate to settings', async ({ page, config }) => {
    const dashboard = new DashboardPage(page, config);

    await dashboard.sidebar.navigateTo('Settings');
    await expect(page).toHaveURL(/\/settings/);
  });
});
```

## Configuration

### Configuration Hierarchy

Configuration is merged in order, with later layers overriding earlier:

1. `framework/defaults.json` - Framework defaults
2. `sites/<site>/config.json` - Site-specific settings
3. `sites/<site>/env/<env>.json` - Environment overrides
4. `local.json` - Local developer overrides (gitignored)

### Environment Variable Interpolation

Use `${VAR}` or `${VAR:-default}` syntax in config files:

```json
{
  "baseUrl": "${BASE_URL:-http://localhost:3000}",
  "credentials": {
    "username": "${TEST_USER}",
    "password": "${TEST_PASS}"
  }
}
```

### Configuration Schema

```typescript
interface SiteConfig {
  enabled?: boolean;              // Enable/disable site in test discovery
  baseUrl: string;                // Site base URL (required, must be valid URL)
  credentials?: {
    username: string;
    password: string;
  };
  timeouts: {
    navigation: number;           // Page navigation timeout (ms, positive)
    action: number;               // Action timeout (ms, positive)
    assertion: number;            // Assertion timeout (ms, positive)
  };
  diagnostics?: {
    screenshot: 'off' | 'on' | 'only-on-failure';
    trace: 'off' | 'on' | 'retain-on-failure';
    video: 'off' | 'on' | 'retain-on-failure';
  };
}
```

### Local Overrides

Create `local.json` in the project root for personal settings:

```json
{
  "baseUrl": "http://localhost:3000",
  "credentials": {
    "username": "dev@example.com",
    "password": "devpassword"
  }
}
```

This file is gitignored and should never be committed.

### Disabling Sites

Set `enabled: false` in site or environment config to skip during test discovery:

```json
{
  "enabled": false,
  "baseUrl": "https://disabled-site.com"
}
```

## Test Data

### Static Fixtures

```typescript
// sites/mysite/data/users.ts
export const users = {
  admin: {
    email: 'admin@example.com',
    password: 'adminpass',
    role: 'admin',
  },
  regular: {
    email: 'user@example.com',
    password: 'userpass',
    role: 'user',
  },
} as const;
```

### Factories

```typescript
// sites/mysite/data/factories.ts
import { Factory } from '@framework/data/index.js';

export const UserFactory = new Factory({
  email: 'user@example.com',
  name: 'Test User',
}).withSequence((n) => ({
  email: `user${n}@example.com`,
}));

// Usage
const user = UserFactory.build({ name: 'Custom Name' });
const users = UserFactory.buildMany(5);
```

## Important Patterns

### Use Getter Methods for Child Components

Playwright's built-in transpiler has compatibility issues with decorator metadata. Use getter methods for reliable component composition:

```typescript
// Correct - getter method
get header() {
  return new HeaderComponent(
    this.page.locator('[data-testid="header"]'),
    this.config,
    this.page
  );
}
```

### Static Selectors

Always define selectors as a static readonly object:

```typescript
export class MyComponent extends BaseComponent {
  static readonly selectors = {
    button: '[data-testid="my-button"]',
    input: '[data-testid="my-input"]',
  } as const;
}
```

### Component Scoping

Always use `this.locator` to scope queries within a component:

```typescript
// Correct - scoped to component
await this.locator.locator(MyComponent.selectors.button).click();

// Incorrect - searches entire page
await this.page.locator(MyComponent.selectors.button).click();
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all Playwright tests for enabled sites |
| `SITE=<name> npm test` | Run tests for specific site |
| `SITE=<name> ENV=<env> npm test` | Run with specific environment |
| `npm test -- --headed` | Run in headed browser mode |
| `npm test -- --ui` | Open Playwright UI mode |
| `npm test -- --grep "pattern"` | Run tests matching pattern |
| `npm test -- --project=chromium` | Run in specific browser |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run lint` | TypeScript type checking |

## Documentation

See the `docs/` directory for detailed guides:

- [Architecture](docs/architecture.md) - Framework design and layers
- [Getting Started](docs/getting-started.md) - Step-by-step setup guide
- [Components](docs/components.md) - Component patterns and BaseComponent API
- [Page Objects](docs/page-objects.md) - Page patterns and BasePage API
- [Configuration](docs/configuration.md) - Config loader, inheritance, validation
- [Testing](docs/testing.md) - Test patterns, fixtures, and assertions
- [Fluent Chains](docs/patterns/fluent-chains.md) - DSL-style API patterns
- [Shared Components](docs/patterns/shared-components.md) - Reusing components across pages

## License

MIT
