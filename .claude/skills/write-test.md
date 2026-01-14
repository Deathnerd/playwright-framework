---
description: Write a Playwright test using the framework
---

# Write Test

## Steps

1. Create test file in `sites/<site>/tests/`
2. Import test and expect from framework
3. Use config fixture for site configuration
4. Create page instance with `new Page(page, config)`
5. Call `.goto()` to navigate

## Template

```typescript
import { test, expect } from '@framework/test';
import { MyPage } from '../pages';

test.describe('My Feature', () => {
  test('should do something', async ({ page, config }) => {
    const myPage = await new MyPage(page, config).goto();
    await myPage.doSomething();
    await expect(myPage.someComponent.locator).toBeVisible();
  });
});
```

## Running

```bash
SITE=<site> ENV=staging npm test -- <test-file>
```
