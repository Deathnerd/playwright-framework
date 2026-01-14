---
description: Create a page object with route, components, and methods
---

# Add Page

## Steps

1. Create page file in `sites/<site>/pages/`
2. Add @Page decorator with route
3. Add @Component decorators for child components (use `declare` keyword)
4. Export from `index.ts`

## Template

```typescript
import { BasePage, Page, Component } from '@framework/core';
import { HeaderComponent } from '../components';

@Page('/my-route')
export class MyPage extends BasePage {
  @Component('[data-testid="header"]', { type: HeaderComponent })
  declare readonly header: HeaderComponent;
}
```
