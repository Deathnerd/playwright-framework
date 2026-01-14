---
purpose: pattern
topics: [fluent, chaining, dsl, interactions]
related:
  - "[[page-objects]]"
  - "[[components]]"
---

# Fluent Chains Pattern

Fluent chains allow multi-step interactions in a readable, chainable API.

## When to Use

- Multi-step workflows (checkout, wizards)
- When steps must happen in sequence
- For improved test readability

## Implementation

### Basic Fluent Chain

```typescript
class CheckoutFlow {
  constructor(private readonly page: CheckoutPage) {}

  async fillShipping(address: Address): Promise<this> {
    await this.page.shipping.fill(address);
    return this;
  }

  async selectShippingMethod(method: string): Promise<this> {
    await this.page.shipping.selectMethod(method);
    return this;
  }

  async applyCoupon(code: string): Promise<this> {
    await this.page.couponInput.fill(code);
    await this.page.applyCouponButton.click();
    return this;
  }

  async proceedToPayment(): Promise<PaymentFlow> {
    await this.page.continueButton.click();
    return new PaymentFlow(this.page);
  }
}
```

### Page Method Entry Point

```typescript
@Page('/checkout')
export class CheckoutPage extends BasePage {
  async startCheckout(address: Address): Promise<CheckoutFlow> {
    await this.shipping.fill(address);
    return new CheckoutFlow(this);
  }
}
```

### Usage in Tests

```typescript
test('complete checkout', async ({ page, config }) => {
  const checkout = await new CheckoutPage(page, config).goto();

  await checkout
    .startCheckout(testAddress)
    .then(flow => flow.selectShippingMethod('express'))
    .then(flow => flow.applyCoupon('SAVE20'))
    .then(flow => flow.proceedToPayment())
    .then(payment => payment.complete(testCard));

  await expect(page).toHaveURL(/\/confirmation/);
});
```

## Transition Between Flows

```typescript
class ShippingFlow {
  async proceedToPayment(): Promise<PaymentFlow> {
    await this.page.continueButton.click();
    return new PaymentFlow(this.page);
  }
}

class PaymentFlow {
  async complete(card: CardInfo): Promise<ConfirmationPage> {
    await this.fillCard(card);
    await this.submitButton.click();
    return new ConfirmationPage(this.page.page, this.page.config);
  }
}
```

## Best Practices

1. Return `this` for same-page operations
2. Return new flow/page for transitions
3. Keep individual steps focused
4. Allow breaking out of chain when needed

## Anti-patterns

```typescript
// DON'T: Overly long chains
await flow.step1().step2().step3().step4().step5().step6();

// DO: Break up logically
await flow.step1().step2().step3();
await flow.step4().step5().step6();

// DON'T: Chains that hide what's happening
await checkout.doEverything();

// DO: Explicit steps
await checkout
  .fillShipping(address)
  .selectMethod('express')
  .proceedToPayment();
```
