---
description: Create a component with selectors, decorators, and methods
---

# Add Component

## Steps

1. Determine location: `framework/core/components/` (shared) or `sites/<site>/components/` (site-specific)
2. Create component file extending BaseComponent
3. Add static selectors object
4. Add child components with `@Component({ type: ChildClass })` decorator
5. Use `declare` keyword for component properties
6. Add interaction methods
7. Export from `index.ts`

## Template

```typescript
import { BaseComponent, Component } from '@framework/core';

export class MyComponent extends BaseComponent {
  static readonly selectors = {
    button: '[data-testid="my-button"]',
  } as const;

  @Component('[data-testid="child"]', { type: ChildComponent })
  declare readonly child: ChildComponent;

  async clickButton(): Promise<void> {
    await this.locator.locator(MyComponent.selectors.button).click();
  }
}
```
