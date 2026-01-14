---
purpose: pattern
topics: [components, shared, reuse, inheritance]
related:
  - "[[components]]"
  - "[[page-objects]]"
---

# Shared Components Pattern

Patterns for reusing components across multiple pages or sites.

## Cross-Page Components

Components that appear on multiple pages (navigation, footer).

### Option 1: Base Page Class

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
      this.config
    );
  }

  async logout(): Promise<void> {
    await this.navBar.logout();
  }
}

// sites/mysite/pages/DashboardPage.ts
@Page('/dashboard')
export class DashboardPage extends AuthenticatedPage {
  // Inherits navBar and footer
  // Add page-specific components
}

@Page('/products')
export class ProductsPage extends AuthenticatedPage {
  // Also inherits navBar and footer
}
```

### Option 2: Composition

```typescript
// sites/mysite/pages/DashboardPage.ts
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

// sites/mysite/pages/ProductsPage.ts
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

**Trade-offs:**
- Inheritance: Less duplication, but creates hierarchy
- Composition: More explicit, works with any page

## Cross-Site Components

Components shared between different sites.

### Framework-Level Components

Place truly generic components in the framework:

```typescript
// framework/components/ModalComponent.ts
export class ModalComponent extends BaseComponent {
  static readonly selectors = {
    closeButton: '[data-testid="modal-close"]',
    title: '[data-testid="modal-title"]',
    content: '[data-testid="modal-content"]',
  } as const;

  async close(): Promise<void> {
    await this.locator
      .locator(ModalComponent.selectors.closeButton)
      .click();
  }
}
```

### Site-Specific Overrides

Override selectors for site-specific DOM:

```typescript
// sites/mysite/components/ModalComponent.ts
import { ModalComponent as BaseModal } from '@framework/components/index.js';

export class ModalComponent extends BaseModal {
  // Override selectors for this site's DOM
  static override readonly selectors = {
    ...BaseModal.selectors,
    closeButton: '.modal-close-btn',  // Different selector
  } as const;
}
```

## Component Configuration

Pass site-specific configuration to components:

```typescript
export class DataTableComponent extends BaseComponent {
  async waitForLoad(): Promise<void> {
    // Use timeout from config
    await this.locator.locator('.loading')
      .waitFor({
        state: 'hidden',
        timeout: this.config.timeouts.action
      });
  }
}
```

## When to Share

### DO Share

- Navigation bars/menus
- Footers
- Modal dialogs
- Common form patterns
- Loading spinners

### DON'T Share

- Page-specific content sections
- Site-specific business logic
- Components with vastly different DOM

## Best Practices

1. Start specific, generalize later
2. Only move to framework if truly generic
3. Prefer composition over inheritance
4. Document shared component contracts
