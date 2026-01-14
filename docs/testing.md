---
purpose: guide
topics: [testing, assertions, fixtures, test-data]
related:
  - "[[page-objects]]"
  - "[[components]]"
  - "[[configuration]]"
see-also:
  - framework/test.ts
  - framework/expect/matchers.ts
  - framework/data/Factory.ts
---

# Testing

This guide covers writing tests using the framework's extended Playwright test fixture.

## Test Structure

### Basic Test

```typescript
import { test, expect } from '@framework/test.js';
import { HomePage } from '../pages/index.js';

test.describe('Home Page', () => {
  test('should display title', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();

    await expect(page).toHaveTitle(/Welcome/);
  });
});
```

### Test with Setup

```typescript
test.describe('Dashboard', () => {
  test.beforeEach(async ({ page, config }) => {
    const loginPage = await new LoginPage(page, config).goto();
    await loginPage.login('user@example.com', 'password');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should show user name', async ({ page, config }) => {
    const dashboard = new DashboardPage(page, config);
    await expect(dashboard.navBar.userName).toHaveText('Test User');
  });
});
```

## The Config Fixture

The framework provides a `config` fixture with site configuration:

```typescript
test('uses config', async ({ page, config }) => {
  // config.baseUrl - site base URL
  // config.timeouts - timeout settings
  // config.credentials - optional login credentials
  // config.diagnostics - screenshot/trace settings

  console.log(`Testing against ${config.baseUrl}`);
});
```

## Custom Matchers

The framework extends Playwright's `expect` with component-aware matchers:

### toHaveItemCount

```typescript
await expect(cart.items).toHaveItemCount(3);
```

### toBeInState

```typescript
await expect(dashboard.filters).toBeInState('active');
```

## Test Data

### Inline Data

For simple, one-off values:

```typescript
test('login with credentials', async ({ page, config }) => {
  const loginPage = await new LoginPage(page, config).goto();
  await loginPage.login('test@example.com', 'password123');
});
```

### Fixtures

For reusable static data, create fixture files:

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

// In test
import { users } from '../data/users.js';

test('admin login', async ({ page, config }) => {
  await loginPage.login(users.admin.email, users.admin.password);
});
```

### Factories

For dynamic or generated data:

```typescript
// sites/mysite/data/factories.ts
import { Factory } from '@framework/data/index.js';

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export const AddressFactory = new Factory<Address>({
  street: '123 Main St',
  city: 'Boston',
  state: 'MA',
  zip: '02101',
});

// With sequence for unique values
export const UserFactory = new Factory({
  email: 'user@example.com',
  name: 'Test User',
}).withSequence((n) => ({
  email: `user${n}@example.com`,
}));

// In test
const address = AddressFactory.build({ city: 'New York' });
const users = UserFactory.buildMany(5);
```

## Test Organization

### By Feature

```
sites/mysite/tests/
├── auth/
│   ├── login.spec.ts
│   └── logout.spec.ts
├── products/
│   ├── listing.spec.ts
│   └── details.spec.ts
└── checkout/
    ├── cart.spec.ts
    └── payment.spec.ts
```

### By Page

```
sites/mysite/tests/
├── home.spec.ts
├── login.spec.ts
├── dashboard.spec.ts
└── products.spec.ts
```

## Running Tests

### Environment Variables

```bash
# Required
SITE=mysite npm test

# Optional
SITE=mysite ENV=production npm test
```

### Playwright CLI Options

```bash
# Run specific file
SITE=mysite npm test -- login.spec.ts

# Run tests matching pattern
SITE=mysite npm test -- --grep "login"

# Run in headed mode
SITE=mysite npm test -- --headed

# Run with UI
SITE=mysite npm run test:ui

# Run specific project (browser)
SITE=mysite npm test -- --project=chromium
```

## Assertions

### Built-in Playwright Matchers

```typescript
// Page assertions
await expect(page).toHaveTitle(/Dashboard/);
await expect(page).toHaveURL(/\/dashboard/);

// Locator assertions
await expect(button).toBeVisible();
await expect(input).toBeEnabled();
await expect(element).toHaveText('Hello');
await expect(element).toHaveAttribute('data-state', 'active');
await expect(list).toHaveCount(5);
```

### Component Matchers

```typescript
// Collection count
await expect(cart.items).toHaveItemCount(3);

// Component state
await expect(dashboard.filters).toBeInState('loading');
```

### Custom Assertions

Add site-specific matchers:

```typescript
// sites/mysite/expect/matchers.ts
export const siteMatchers = {
  async toBeLoggedIn(page: Page) {
    const isLoggedIn = await page.locator('[data-logged-in="true"]').isVisible();
    return {
      pass: isLoggedIn,
      message: () => isLoggedIn
        ? 'Expected user not to be logged in'
        : 'Expected user to be logged in',
    };
  },
};
```

## Waiting Strategies

### Playwright Auto-Wait (Default)

Playwright automatically waits for elements:

```typescript
// These wait automatically
await button.click();           // Waits for visible, enabled
await input.fill('text');       // Waits for editable
await element.textContent();    // Waits for attached
```

### Explicit Waits

When auto-wait isn't enough:

```typescript
// Wait for element state
await page.locator('.loading').waitFor({ state: 'hidden' });

// Wait for URL
await page.waitForURL(/\/success/);

// Wait for network
await page.waitForResponse('**/api/data');

// Wait for condition
await expect(async () => {
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
}).toPass();
```

## Best Practices

### DO

- Use `config` fixture for site settings
- Create page objects in tests
- Use descriptive test names
- Group related tests with `describe`
- Use fixtures/factories for test data

### DON'T

- Hardcode URLs or credentials
- Use `page.waitForTimeout()` (use proper waits)
- Skip assertions
- Share state between tests
- Put test logic in page objects

## Example: Complete Test Suite

```typescript
import { test, expect } from '@framework/test.js';
import { LoginPage, DashboardPage } from '../pages/index.js';
import { users } from '../data/users.js';

test.describe('Dashboard', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page, config }) => {
    // Login before each test
    const loginPage = await new LoginPage(page, config).goto();
    await loginPage.login(users.admin.email, users.admin.password);
    await expect(page).toHaveURL(/\/dashboard/);

    dashboard = new DashboardPage(page, config);
  });

  test('should display page title', async () => {
    await expect(dashboard.pageTitle).toBeVisible();
    await expect(dashboard.pageTitle).toHaveText(/Dashboard/);
  });

  test('should show navigation bar', async () => {
    await expect(dashboard.navBar.locator).toBeVisible();
    await expect(dashboard.navBar.dashboardLink).toHaveClass(/active/);
  });

  test('should display summary cards', async () => {
    await expect(dashboard.summaryCards.locator).toBeVisible();
    const count = await dashboard.summaryCards.cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter by status', async ({ page }) => {
    await dashboard.filters.selectStatus('Active');

    // Verify filter applied
    await expect(page).toHaveURL(/status=active/);
  });

  test('should navigate to issues', async ({ page }) => {
    await dashboard.navBar.navigateToIssues();

    await expect(page).toHaveURL(/\/issues/);
  });

  test('should logout successfully', async ({ page }) => {
    await dashboard.navBar.logout();

    await expect(page).toHaveURL(/\/login|\/$/);
  });
});
```
