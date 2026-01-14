---
purpose: guide
topics: [getting-started, quickstart, setup, installation]
related:
  - "[[architecture]]"
  - "[[configuration]]"
  - "[[testing]]"
see-also:
  - package.json
  - playwright.config.ts
---

# Getting Started

This guide walks you through setting up and using the Playwright page object framework.

## Prerequisites

- Node.js 18+
- npm or yarn
- Chrome/Chromium (installed automatically by Playwright)

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd playwright-framework

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

## Project Structure

```
├── framework/          # Core framework (don't modify unless extending)
├── sites/              # Your test sites go here
│   └── example/        # Example site for reference
├── docs/               # Documentation
└── playwright.config.ts
```

## Running Tests

### Single Site

```bash
# Run all tests for a site
SITE=audit-findings npm test

# Run with specific environment
SITE=audit-findings ENV=staging npm test

# Run specific test file
SITE=audit-findings npm test -- dashboard.spec.ts

# Run with UI mode
SITE=audit-findings npm run test:ui
```

### All Sites

```bash
# Run tests for all discovered sites
npm test
```

## Creating Your First Site

### 1. Create Site Directory

```bash
mkdir -p sites/mysite/{components,pages,tests,data,env}
```

### 2. Create Site Configuration

`sites/mysite/config.json`:
```json
{
  "baseUrl": "https://mysite.example.com",
  "timeouts": {
    "navigation": 30000,
    "action": 5000,
    "assertion": 5000
  }
}
```

### 3. Create Environment Override

`sites/mysite/env/staging.json`:
```json
{
  "baseUrl": "https://staging.mysite.example.com"
}
```

### 4. Create a Component

`sites/mysite/components/HeaderComponent.ts`:
```typescript
import { BaseComponent } from '@framework/core/index.js';

export class HeaderComponent extends BaseComponent {
  static readonly selectors = {
    logo: '[data-testid="logo"]',
    navLink: '[data-testid="nav-link"]',
  } as const;

  async clickLogo(): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.logo).click();
  }
}
```

### 5. Create a Page Object

`sites/mysite/pages/HomePage.ts`:
```typescript
import { BasePage, Page } from '@framework/core/index.js';
import { HeaderComponent } from '../components/HeaderComponent.js';

@Page('/')
export class HomePage extends BasePage {
  get header() {
    return new HeaderComponent(
      this.page.locator('[data-testid="header"]'),
      this.config,
      this.page
    );
  }
}
```

### 6. Create Index Files

`sites/mysite/components/index.ts`:
```typescript
export * from './HeaderComponent.js';
```

`sites/mysite/pages/index.ts`:
```typescript
export * from './HomePage.js';
```

### 7. Write a Test

`sites/mysite/tests/home.spec.ts`:
```typescript
import { test, expect } from '@framework/test.js';
import { HomePage } from '../pages/index.js';

test.describe('Home Page', () => {
  test('should load successfully', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();

    await expect(page).toHaveTitle(/MySite/);
    await expect(homePage.header.locator).toBeVisible();
  });
});
```

### 8. Run Your Test

```bash
SITE=mysite ENV=staging npm test
```

## Using Environment Variables

Configuration supports `${VAR:-default}` syntax:

```json
{
  "baseUrl": "${BASE_URL:-https://localhost:3000}",
  "credentials": {
    "username": "${TEST_USER}",
    "password": "${TEST_PASS}"
  }
}
```

Set variables before running:
```bash
TEST_USER=myuser TEST_PASS=secret SITE=mysite npm test
```

## Local Overrides

Create `local.json` (gitignored) for personal overrides:

```json
{
  "baseUrl": "http://localhost:3000",
  "credentials": {
    "username": "dev@example.com",
    "password": "devpassword"
  }
}
```

## Next Steps

- Read [[components]] for component patterns
- Read [[page-objects]] for page object patterns
- Read [[testing]] for test writing patterns
- Read [[configuration]] for config system details
