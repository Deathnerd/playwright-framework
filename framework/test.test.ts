import { describe, it, expect } from 'vitest';
import { test as playwrightTest, expect as playwrightExpect } from './test.js';

describe('test fixture exports', () => {
  it('exports test function', () => {
    expect(playwrightTest).toBeDefined();
    expect(typeof playwrightTest).toBe('function');
  });

  it('exports expect function', () => {
    expect(playwrightExpect).toBeDefined();
    expect(typeof playwrightExpect).toBe('function');
  });

  it('test has extend method for fixtures', () => {
    expect(playwrightTest.extend).toBeDefined();
    expect(typeof playwrightTest.extend).toBe('function');
  });

  it('test has describe and it methods', () => {
    expect(playwrightTest.describe).toBeDefined();
    expect(playwrightTest.step).toBeDefined();
  });
});

describe('framework/index.ts exports', () => {
  it('re-exports test and expect from index', async () => {
    const framework = await import('./index.js');
    expect(framework.test).toBe(playwrightTest);
    expect(framework.expect).toBe(playwrightExpect);
  });
});
