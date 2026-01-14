---
purpose: design-document
status: approved
topics: [architecture, framework, playwright, testing, page-objects, components]
related:
  - "[[architecture]]"
  - "[[components]]"
  - "[[page-objects]]"
---

# Playwright Page Object Framework Design

A multi-site, component-based page object framework for Playwright with strict TypeScript, composable components, and fluent DSL patterns.

## Design Goals

- Support multiple sites/products with varying degrees of shared code
- Strict TypeScript: no-implicit-any, null-safe
- Page objects composed of components, components composed of components
- DSL-style utilities with builder patterns
- Per-site configuration with environment overrides
- Rich diagnostics for debugging at scale

---

## Project Structure

```
playwright-framework/
├── .claude/
│   └── skills/
│       ├── add-site.md
│       ├── add-component.md
│       ├── add-page.md
│       ├── write-test.md
│       └── override-selector.md
├── CLAUDE.md
├── docs/
│   ├── architecture.md
│   ├── getting-started.md
│   ├── components.md
│   ├── page-objects.md
│   ├── testing.md
│   ├── configuration.md
│   └── patterns/
├── framework/
│   ├── core/           # BaseComponent, BasePage, decorators
│   ├── config/         # Config loader, merger, types
│   ├── diagnostics/    # Failure capture, component state
│   ├── expect/         # Custom Playwright matchers
│   ├── data/           # Fixtures loader, factory base
│   └── defaults.json
├── sites/
│   └── <site-name>/
│       ├── CLAUDE.md
│       ├── config.json
│       ├── env/
│       │   ├── staging.json
│       │   └── prod.json
│       ├── docs/
│       ├── components/
│       ├── pages/
│       ├── data/       # Fixtures, factories
│       └── tests/
├── local.json          # gitignored
└── playwright.config.ts
```

---

## Configuration System

### Four-Level Inheritance

```
ENV VARS (highest priority - via ${VAR} interpolation)
    ↓
local.json (gitignored, developer overrides)
    ↓
sites/<site>/env/<env>.json (environment-specific)
    ↓
sites/<site>/config.json (site defaults)
    ↓
framework/defaults.json (framework defaults)
```

### Minimal Schema (Starting Point)

```typescript
interface SiteConfig {
  baseUrl: string;
  credentials?: {
    username: string;
    password: string;
  };
  timeouts: {
    navigation: number;
    action: number;
    assertion: number;
  };
  diagnostics?: {
    screenshot: 'off' | 'on' | 'only-on-failure';
    trace: 'off' | 'on' | 'retain-on-failure';
    video: 'off' | 'on' | 'retain-on-failure';
  };
}
```

### Environment Variable Interpolation

Supports bash-style syntax with defaults:

```json
{
  "baseUrl": "${BASE_URL:-https://localhost:3000}",
  "credentials": {
    "username": "${TEST_USER:-testuser}",
    "password": "${TEST_PASS}"
  }
}
```

- Explicit `${VAR}` interpolation only (no magic mapping)
- Supports `${VAR:-default}` syntax
- Missing required vars (no default) fail fast at startup

### Config Resolution

```typescript
const config = await ConfigLoader.resolve({
  site: 'acme',
  env: 'staging',
});
```

---

## Component Composition Model

Three patterns working together: decorators, injection, and builders.

### Decorators for Static Structure

```typescript
@Component.define()
class CartComponent extends BaseComponent {
  static readonly selectors = {
    itemRow: '[data-testid="cart-item"]',
    removeButton: '[data-testid="remove"]',
    quantity: '[data-testid="qty-input"]',
  } as const;

  @Component('[data-testid="cart-item"]', { multiple: true })
  readonly items!: ComponentCollection<CartItemComponent>;
}
```

### Injection for Scoping

```typescript
class BaseComponent {
  constructor(
    protected readonly locator: Locator,
    protected readonly config: SiteConfig
  ) {}

  protected get selectors() {
    return this.config.resolveSelectors(this.constructor);
  }
}
```

### Builder for Runtime Flexibility

```typescript
const customCart = CartComponent.builder()
  .override('itemRow', '[data-testid="cart-item-v2"]')
  .with('promoInput', PromoComponent, '[data-testid="promo"]')
  .build();
```

### Selector Overrides (TypeScript, Not JSON)

```typescript
// sites/acme/components/CartComponent.overrides.ts
import { CartComponent } from '@framework/components';

export const selectorOverrides = {
  itemRow: '.acme-cart-row',
} satisfies Partial<typeof CartComponent.selectors>;
```

---

## Component Collections

Collections support both object methods and array-like access via Proxy.

### API

```typescript
// Counting
await cart.items.count();

// Indexed access (both work)
await cart.items[0].remove();
await cart.items.nth(0).remove();

// First/last
await cart.items.first().remove();
await cart.items.last().setQuantity(5);

// Filtering
cart.items.filter({ hasText: 'Widget' });
cart.items.filter({ has: page.locator('.sale-badge') });

// Iteration
for (const item of await cart.items) {
  await expect(item).toBeVisible();
}

// Spread/destructuring
const [first, second] = await cart.items;
```

### Implementation

```typescript
class ComponentCollection<T extends BaseComponent> {
  constructor(
    private readonly locator: Locator,
    private readonly ComponentClass: ComponentConstructor<T>
  ) {
    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.nth(parseInt(prop, 10));
        }
        return Reflect.get(target, prop);
      }
    });
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const count = await this.count();
    for (let i = 0; i < count; i++) {
      yield this.nth(i);
    }
  }

  nth(index: number): T { /* ... */ }
  async count(): Promise<number> { /* ... */ }
}

type ArrayAccessible<T> = ComponentCollection<T> & { [index: number]: T };
```

---

## Page Objects

Pages are component containers with route awareness.

```typescript
@Page('/checkout')
class CheckoutPage extends BasePage {
  @Component('[data-testid="cart"]')
  readonly cart!: CartComponent;

  @Component('[data-testid="shipping-form"]')
  readonly shipping!: ShippingFormComponent;

  @Component('[data-testid="payment"]')
  readonly payment!: PaymentComponent;

  @Component('[data-testid="nav"]')
  readonly nav!: NavComponent;
}
```

### BasePage

```typescript
class BasePage {
  constructor(
    protected readonly page: Page,
    protected readonly config: SiteConfig
  ) {}

  async goto(): Promise<this> {
    await this.page.goto(this.config.baseUrl + this.route);
    await this.waitForReady();
    return this;
  }

  protected get route(): string {
    return Reflect.getMetadata('page:route', this.constructor);
  }

  protected async waitForReady(): Promise<void> {
    // Default: wait for network idle; override for custom conditions
  }
}
```

### Usage

```typescript
test('complete checkout flow', async ({ page }) => {
  const checkout = await new CheckoutPage(page, config).goto();

  await checkout.cart.items[0].setQuantity(2);
  await checkout.shipping.fill(testAddress);
  await checkout.payment.complete(testCard);

  await expect(checkout).toShowConfirmation();
});
```

---

## Interaction Model

Hybrid approach: simple methods for single actions, fluent chains for flows.

### Simple Methods

```typescript
class CartItemComponent extends BaseComponent {
  async remove(): Promise<void> {
    await this.locator.locator(this.selectors.removeButton).click();
  }

  async setQuantity(qty: number): Promise<void> {
    await this.locator.locator(this.selectors.quantity).fill(String(qty));
  }

  async getPrice(): Promise<number> {
    const text = await this.locator.locator(this.selectors.price).textContent();
    return parseFloat(text?.replace('$', '') ?? '0');
  }
}
```

### Fluent Chains

```typescript
class CheckoutPage extends BasePage {
  async fillShipping(address: Address): Promise<CheckoutFlow> {
    await this.shipping.fill(address);
    return new CheckoutFlow(this);
  }
}

class CheckoutFlow {
  constructor(private readonly page: CheckoutPage) {}

  async selectShippingMethod(method: string): Promise<this> {
    await this.page.shipping.selectMethod(method);
    return this;
  }

  async applyCoupon(code: string): Promise<this> {
    await this.page.locator('[data-testid="coupon"]').fill(code);
    await this.page.locator('[data-testid="apply-coupon"]').click();
    return this;
  }

  async proceedToPayment(): Promise<PaymentComponent> {
    await this.page.locator('[data-testid="continue"]').click();
    return this.page.payment;
  }
}
```

### Test Reads Like Intent

```typescript
// Single await, multi-step flow
await checkout
  .fillShipping(address)
  .selectShippingMethod('express')
  .applyCoupon('SAVE20')
  .proceedToPayment();

// Or individual actions when needed
await cart.items[0].setQuantity(3);
await cart.items[1].remove();
```

---

## Waiting Strategy

Layered approach: trust Playwright, add component contracts, allow explicit waits.

### Layer 1: Playwright Auto-Wait (Default)

```typescript
await button.click();  // Waits for visible, enabled, stable
await input.fill('x'); // Waits for editable
```

### Layer 2: Component Ready Contracts

```typescript
@Component.define({
  readyWhen: async (locator) => {
    await locator.locator('.spinner').waitFor({ state: 'hidden' });
  }
})
class DataTableComponent extends BaseComponent {}

// Or declarative shorthand
@Component.define({ readySelector: '.loaded', readyState: 'visible' })
class DashboardWidget extends BaseComponent {}
```

### Layer 3: Explicit Fluent Waits

```typescript
await checkout
  .fillShipping(address)
  .waitFor.priceToUpdate()
  .waitFor.shippingOptionsToLoad()
  .selectShippingMethod('express')
  .proceedToPayment();
```

---

## Assertion Integration

Extended Playwright `expect` with component-aware matchers.

### Registration

```typescript
import { expect as baseExpect } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveItemCount(component: CartComponent, expected: number) {
    const actual = await component.items.count();
    return {
      pass: actual === expected,
      message: () => `Expected cart to have ${expected} items, got ${actual}`,
    };
  },

  async toBeInState(component: BaseComponent, state: string) {
    const hasState = await component.locator
      .getAttribute('data-state')
      .then(s => s === state);
    return {
      pass: hasState,
      message: () => `Expected component to be in state "${state}"`,
    };
  },
});
```

### Usage

```typescript
import { expect } from '@framework/expect';

await expect(cart).toHaveItemCount(3);
await expect(checkout.shipping).toBeFilled();
await expect(nav).toBeInState('authenticated');
await expect(cart.items).toHaveCount(3);
await expect(cart.items[0]).toContainText('Widget');
```

### Type Declarations

```typescript
interface ComponentMatchers<T extends BaseComponent> {
  toHaveItemCount(count: number): Promise<void>;
  toBeInState(state: string): Promise<void>;
  toBeFilled(): Promise<void>;
  toShowError(message?: string): Promise<void>;
}

declare module '@playwright/test' {
  interface Matchers<R> extends ComponentMatchers<BaseComponent> {}
}
```

---

## Test Data

Three tools: inline, fixtures, factories.

### Inline (Simple Values)

```typescript
await shipping.fill({
  street: '123 Main St',
  city: 'Boston',
  zip: '02101',
});
```

### Fixtures (Reusable Snapshots)

```typescript
// sites/acme/data/fixtures/addresses.ts
export const addresses = {
  valid: {
    street: '123 Main St',
    city: 'Boston',
    zip: '02101',
  },
  international: {
    street: '10 Downing St',
    city: 'London',
    country: 'UK',
    postal: 'SW1A 2AA',
  },
} as const;

// In test
import { addresses } from '../data/fixtures/addresses';
await shipping.fill(addresses.valid);
```

### Factories (Complex/Dynamic Entities)

```typescript
class Factory<T> {
  constructor(private defaults: T) {}

  build(overrides?: Partial<T>): T {
    return { ...this.defaults, ...overrides };
  }
}

export const UserFactory = new Factory({
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free',
});

// In test
const premiumUser = UserFactory.build({ tier: 'premium' });
```

---

## Site/Environment Targeting

Directory-driven site selection, environment as runtime flag.

### Playwright Config

```typescript
import { defineConfig } from '@playwright/test';
import { ConfigLoader } from './framework/config';

const site = process.env.SITE;
const env = process.env.ENV || 'staging';

export default defineConfig({
  testDir: site ? `./sites/${site}/tests` : './sites',

  use: {
    baseURL: ConfigLoader.resolve({ site, env }).baseUrl,
  },

  projects: discoverSites().map(siteName => ({
    name: siteName,
    testDir: `./sites/${siteName}/tests`,
    use: {
      ...ConfigLoader.resolve({ site: siteName, env }),
    },
  })),
});
```

### Running Tests

```bash
# Single site, specific env
SITE=acme ENV=staging npx playwright test

# Single site, default env
SITE=acme npx playwright test

# All sites (via projects)
npx playwright test

# Specific test file
SITE=acme ENV=prod npx playwright test checkout.spec.ts
```

### Test Access to Config

```typescript
import { test } from '@framework/test';
import { CheckoutPage } from '../pages/CheckoutPage';

test('complete checkout', async ({ page, config }) => {
  const checkout = await new CheckoutPage(page, config).goto();
  // ...
});
```

---

## Diagnostics

Layered failure capture: Playwright defaults, site overrides, component-aware context.

### Site-Level Config

```json
{
  "diagnostics": {
    "screenshot": "only-on-failure",
    "trace": "retain-on-failure",
    "video": "off"
  }
}
```

### Component-Aware Capture

```typescript
export async function captureComponentState(
  component: BaseComponent
): Promise<ComponentDiagnostics> {
  return {
    componentName: component.constructor.name,
    selector: component.rootSelector,
    boundingBox: await component.locator.boundingBox(),
    isVisible: await component.locator.isVisible(),
    innerHTML: await component.locator.innerHTML(),
    attributes: await component.locator.evaluate(el =>
      Object.fromEntries([...el.attributes].map(a => [a.name, a.value]))
    ),
  };
}
```

### Custom Test Wrapper

```typescript
import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);

    if (testInfo.status === 'failed') {
      const components = getActiveComponents(page);
      for (const component of components) {
        const state = await captureComponentState(component);
        await testInfo.attach(`component-${component.constructor.name}`, {
          body: JSON.stringify(state, null, 2),
          contentType: 'application/json',
        });
      }
    }
  },
});
```

### Failure Output

```
FAILED: expect(cart).toHaveItemCount(3)
────────────────────────────────────────
Component: CartComponent
Selector:  [data-testid="cart"]
Visible:   true
BoundingBox: { x: 100, y: 200, width: 400, height: 300 }

Attributes:
  data-testid: cart
  class: cart cart--empty
  data-state: empty

Inner HTML:
<div class="cart__content">
  <span class="cart__empty-message">Your cart is empty</span>
</div>

Attachments:
  - screenshot.png
  - trace.zip
  - component-CartComponent.json
```

---

## Documentation & AI Support

Dual-audience docs: Obsidian for humans, structured frontmatter + CLAUDE.md + skills for LLMs.

### Document Format

```markdown
---
purpose: guide
topics: [components, composition, decorators]
related:
  - "[[page-objects]]"
  - "[[architecture]]"
see-also:
  - framework/core/BaseComponent.ts
  - framework/decorators/Component.ts
---

# Writing Components

Components are the building blocks of [[page-objects]]...
```

### CLAUDE.md Files

Root-level and per-site context files for AI agents:

```markdown
<!-- CLAUDE.md (root) -->
# Playwright Testing Framework

This is a multi-site page object framework with:
- Decorator-based component composition
- 4-level configuration inheritance
- Fluent interaction chains
- Extended Playwright assertions

## Quick Start
- Add a site: see .claude/skills/add-site.md
- Add a component: see .claude/skills/add-component.md
```

```markdown
<!-- sites/acme/CLAUDE.md -->
# Acme Site

E-commerce site with standard checkout flow.

## Quirks
- Cart uses legacy `.acme-cart-row` selectors (see component overrides)
- Payment form requires 500ms debounce on card input
```

### Skills

```markdown
<!-- .claude/skills/add-component.md -->
---
description: Create a new component with decorator, selectors, and methods
---

# Add Component

1. Determine if shared (framework/components/) or site-specific (sites/<site>/components/)
2. Create component file extending BaseComponent
3. Add static selectors object
4. Add @Component.define() decorator
5. Add child components with @Component() decorators
6. Add interaction methods
7. If overriding shared component, create <Component>.overrides.ts
```

---

## Future Considerations (Out of Scope for v1)

- **Declarative test data injection** - `@TestData` decorators with API provisioning
- **Component testing** - Playwright component testing for Vue/React (requires source access)
- **Visual regression** - Screenshot comparison integration
- **API mocking** - Playwright route interception helpers

---

## Decision Summary

| Area | Decision |
|------|----------|
| Structure | `framework/` + `sites/<site>/` + shared `docs/` |
| Config | 4-level inheritance + `${VAR:-default}` interpolation |
| Composition | Decorators + builders + injection |
| Selectors | TypeScript with site overrides (no JSON) |
| Collections | Array-accessible + iterable via Proxy |
| Interactions | Simple methods + fluent chains |
| Waiting | Playwright auto-wait → component contracts → explicit |
| Assertions | Extended Playwright `expect` with component matchers |
| Test data | Inline + fixtures + factories |
| Targeting | Directory-driven sites, env as runtime flag |
| Diagnostics | Layered capture with component state |
| Docs | Obsidian-compatible + frontmatter + CLAUDE.md + skills |
