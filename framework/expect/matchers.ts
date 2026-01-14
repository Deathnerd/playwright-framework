import { expect as baseExpect } from '@playwright/test';
import { BaseComponent } from '../core/BaseComponent.js';
import { ComponentCollection } from '../core/ComponentCollection.js';

export interface ComponentMatchers<R = unknown> {
  toHaveItemCount(count: number): Promise<R>;
  toBeInState(state: string): Promise<R>;
}

export const componentMatchers = {
  async toHaveItemCount(
    collection: ComponentCollection<BaseComponent>,
    expected: number
  ) {
    const actual = await collection.count();
    const pass = actual === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected collection not to have ${expected} items`
          : `Expected collection to have ${expected} items, but got ${actual}`,
    };
  },

  async toBeInState(component: BaseComponent, expected: string) {
    const actual = await component.locator.getAttribute('data-state');
    const pass = actual === expected;
    return {
      pass,
      message: () =>
        pass
          ? `Expected component not to be in state "${expected}"`
          : `Expected component to be in state "${expected}", but got "${actual}"`,
    };
  },
};

declare module '@playwright/test' {
  interface Matchers<R> extends ComponentMatchers<R> {}
}
