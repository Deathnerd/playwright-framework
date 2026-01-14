import { expect as baseExpect } from '@playwright/test';
import { componentMatchers } from './matchers.js';

export const expect = baseExpect.extend(componentMatchers);
export * from './matchers.js';
