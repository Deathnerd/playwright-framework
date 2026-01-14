---
purpose: guide
topics: [components, composition, selectors, patterns]
related:
  - "[[page-objects]]"
  - "[[architecture]]"
see-also:
  - framework/core/BaseComponent.ts
  - framework/core/ComponentCollection.ts
---

# Components

Components are the building blocks of page objects. They encapsulate a section of the DOM with its interactions and assertions.

## BaseComponent

All components extend `BaseComponent`:

```typescript
import { BaseComponent } from '@framework/core/index.js';

export class MyComponent extends BaseComponent {
  // Component implementation
}
```

### Constructor Parameters

```typescript
constructor(
  locator: Locator,   // Playwright locator scoped to component root
  config: SiteConfig, // Site configuration
  page?: Page         // Optional Page for page-level operations
)
```

## Defining Selectors

Use a static `selectors` object for type-safe, refactorable selectors:

```typescript
export class CartComponent extends BaseComponent {
  static readonly selectors = {
    itemRow: '[data-testid="cart-item"]',
    removeButton: '[data-testid="remove"]',
    quantity: '[data-testid="qty-input"]',
    total: '[data-testid="cart-total"]',
  } as const;
}
```

**Benefits:**
- Type-safe - TypeScript catches typos
- Refactorable - Rename in one place
- Discoverable - IDE autocomplete
- Testable - Easy to mock

## Writing Methods

### Action Methods

Methods that perform actions should:
- Be `async` and return `Promise<void>`
- Use `this.locator` to scope to component
- Reference selectors via static property

```typescript
async removeItem(): Promise<void> {
  await this.locator.locator(CartComponent.selectors.removeButton).click();
}

async setQuantity(qty: number): Promise<void> {
  await this.locator
    .locator(CartComponent.selectors.quantity)
    .fill(String(qty));
}
```

### Query Methods

Methods that return data:

```typescript
async getTotal(): Promise<number> {
  const text = await this.locator
    .locator(CartComponent.selectors.total)
    .textContent();
  return parseFloat(text?.replace('$', '') ?? '0');
}

async getItemCount(): Promise<number> {
  return this.locator
    .locator(CartComponent.selectors.itemRow)
    .count();
}
```

### State Methods

Methods that check component state:

```typescript
async isEmpty(): Promise<boolean> {
  return (await this.getItemCount()) === 0;
}

async isLoading(): Promise<boolean> {
  return this.locator.locator('.spinner').isVisible();
}
```

## Component Composition

Components can contain other components using getter methods:

```typescript
import { HeaderComponent } from './HeaderComponent.js';
import { FooterComponent } from './FooterComponent.js';

export class PageLayoutComponent extends BaseComponent {
  static readonly selectors = {
    header: '[data-testid="header"]',
    footer: '[data-testid="footer"]',
    content: '[data-testid="content"]',
  } as const;

  get header() {
    return new HeaderComponent(
      this.locator.locator(PageLayoutComponent.selectors.header),
      this.config,
      this.page
    );
  }

  get footer() {
    return new FooterComponent(
      this.locator.locator(PageLayoutComponent.selectors.footer),
      this.config,
      this.page
    );
  }
}
```

**Why getters instead of decorators:**
- Avoids Babel/TypeScript decorator issues
- Simpler debugging
- Explicit instantiation
- Works with all build tools

## Component Collections

For repeated elements, use `ComponentCollection`:

```typescript
import { ComponentCollection } from '@framework/core/index.js';

export class CartItemComponent extends BaseComponent {
  static readonly selectors = {
    name: '[data-testid="item-name"]',
    price: '[data-testid="item-price"]',
  } as const;

  async getName(): Promise<string> {
    return (await this.locator
      .locator(CartItemComponent.selectors.name)
      .textContent()) ?? '';
  }
}

export class CartComponent extends BaseComponent {
  get items() {
    return new ComponentCollection(
      this.locator.locator('[data-testid="cart-item"]'),
      CartItemComponent,
      this.config
    );
  }
}
```

### Collection API

```typescript
// Count
const count = await cart.items.count();

// Index access
const firstItem = cart.items[0];
const secondItem = cart.items.nth(1);

// First/last
const first = cart.items.first();
const last = cart.items.last();

// Filtering
const expensiveItems = cart.items.filter({ hasText: '$100' });

// Iteration
for await (const item of cart.items) {
  console.log(await item.getName());
}

// Get all as array
const allItems = await cart.items.all();
```

## Page-Level Operations

When a component needs `page` access (e.g., for alerts, navigation):

```typescript
export class NavBarComponent extends BaseComponent {
  async logout(): Promise<void> {
    // Need page to access elements outside component scope
    await this.page!.locator('.user-menu').click();
    await this.page!.locator('a[href="/logout"]').click();
  }
}
```

Pass `page` when instantiating:

```typescript
get navBar() {
  return new NavBarComponent(
    this.page.locator('[data-testid="nav"]'),
    this.config,
    this.page  // Pass page for page-level operations
  );
}
```

## Best Practices

### DO

- Keep selectors in static `selectors` object
- Use `this.locator` to scope all queries
- Make methods async
- Use meaningful method names
- Pass `page` only when needed

### DON'T

- Hard-code selectors in methods
- Use page-level locators without `page` parameter
- Create synchronous methods for async operations
- Expose locators directly (wrap in methods)

## Example: Complete Component

```typescript
import { BaseComponent } from '@framework/core/index.js';
import type { Locator, Page } from '@playwright/test';
import type { SiteConfig } from '@framework/config/types.js';

export class SearchComponent extends BaseComponent {
  static readonly selectors = {
    input: '[data-testid="search-input"]',
    button: '[data-testid="search-button"]',
    results: '[data-testid="search-result"]',
    noResults: '[data-testid="no-results"]',
    loading: '.search-loading',
  } as const;

  // Action: perform search
  async search(query: string): Promise<void> {
    await this.locator
      .locator(SearchComponent.selectors.input)
      .fill(query);
    await this.locator
      .locator(SearchComponent.selectors.button)
      .click();
  }

  // Query: get result count
  async getResultCount(): Promise<number> {
    return this.locator
      .locator(SearchComponent.selectors.results)
      .count();
  }

  // State: check if loading
  async isLoading(): Promise<boolean> {
    return this.locator
      .locator(SearchComponent.selectors.loading)
      .isVisible();
  }

  // State: check if no results
  async hasNoResults(): Promise<boolean> {
    return this.locator
      .locator(SearchComponent.selectors.noResults)
      .isVisible();
  }

  // Wait: wait for results to load
  async waitForResults(): Promise<void> {
    await this.locator
      .locator(SearchComponent.selectors.loading)
      .waitFor({ state: 'hidden' });
  }
}
```
