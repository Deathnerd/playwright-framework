# Playwright Page Object Framework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-site, component-based page object framework for Playwright with strict TypeScript, composable components, and fluent DSL patterns.

**Architecture:** Decorator-based component composition with 4-level config inheritance. Pages contain components, components contain components. TypeScript-first with Proxy-based collections for array access. Extended Playwright assertions for component-aware matchers.

**Tech Stack:** Playwright, TypeScript (strict), reflect-metadata (decorators), Node.js

**Reference:** See `docs/plans/2026-01-13-playwright-framework-design.md` for full design rationale.

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `playwright.config.ts`
- Create: `framework/` directory structure
- Create: `sites/` directory structure

**Step 1: Initialize package.json**

```json
{
  "name": "playwright-framework",
  "version": "0.1.0",
  "description": "Multi-site page object framework for Playwright",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "reflect-metadata": "^0.2.1"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@framework/*": ["./framework/*"],
      "@sites/*": ["./sites/*"]
    }
  },
  "include": ["framework/**/*", "sites/**/*", "playwright.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create minimal playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './sites',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
});
```

**Step 4: Create directory structure**

Run:
```bash
mkdir -p framework/core framework/config framework/diagnostics framework/expect framework/data
mkdir -p sites/.gitkeep
```

Create placeholder files:
- `framework/core/index.ts` with `export {};`
- `framework/config/index.ts` with `export {};`
- `framework/index.ts` with `export {};`

**Step 5: Install dependencies**

Run: `npm install`
Expected: node_modules created, package-lock.json generated

**Step 6: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No errors

**Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold project structure with TypeScript and Playwright"
```

---

## Task 2: Configuration Types

**Files:**
- Create: `framework/config/types.ts`
- Create: `framework/config/types.test.ts`

**Step 1: Write type definition tests**

Create `framework/config/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { SiteConfig, DiagnosticsConfig, TimeoutsConfig } from './types.js';

describe('SiteConfig types', () => {
  it('should accept valid minimal config', () => {
    const config: SiteConfig = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
    };
    expect(config.baseUrl).toBe('https://example.com');
  });

  it('should accept config with all optional fields', () => {
    const config: SiteConfig = {
      baseUrl: 'https://example.com',
      credentials: {
        username: 'test',
        password: 'pass',
      },
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
      diagnostics: {
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
        video: 'off',
      },
    };
    expect(config.credentials?.username).toBe('test');
  });
});
```

**Step 2: Add vitest for type tests**

Update `package.json` devDependencies:
```json
"vitest": "^1.1.0"
```

Add script:
```json
"test:unit": "vitest run"
```

Run: `npm install`

**Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './types.js' not found

**Step 4: Create types.ts**

Create `framework/config/types.ts`:

```typescript
export type ScreenshotMode = 'off' | 'on' | 'only-on-failure';
export type TraceMode = 'off' | 'on' | 'retain-on-failure';
export type VideoMode = 'off' | 'on' | 'retain-on-failure';

export interface DiagnosticsConfig {
  screenshot: ScreenshotMode;
  trace: TraceMode;
  video: VideoMode;
}

export interface TimeoutsConfig {
  navigation: number;
  action: number;
  assertion: number;
}

export interface CredentialsConfig {
  username: string;
  password: string;
}

export interface SiteConfig {
  baseUrl: string;
  credentials?: CredentialsConfig;
  timeouts: TimeoutsConfig;
  diagnostics?: DiagnosticsConfig;
}

export interface ResolveOptions {
  site: string;
  env?: string;
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 6: Update config index**

Update `framework/config/index.ts`:
```typescript
export * from './types.js';
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat(config): add SiteConfig type definitions"
```

---

## Task 3: Environment Variable Interpolation

**Files:**
- Create: `framework/config/interpolate.ts`
- Create: `framework/config/interpolate.test.ts`

**Step 1: Write failing tests for interpolation**

Create `framework/config/interpolate.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { interpolateEnvVars } from './interpolate.js';

describe('interpolateEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should replace ${VAR} with environment value', () => {
    process.env.TEST_URL = 'https://test.example.com';
    const result = interpolateEnvVars({ baseUrl: '${TEST_URL}' });
    expect(result.baseUrl).toBe('https://test.example.com');
  });

  it('should use default value when env var is missing', () => {
    delete process.env.MISSING_VAR;
    const result = interpolateEnvVars({ baseUrl: '${MISSING_VAR:-https://default.com}' });
    expect(result.baseUrl).toBe('https://default.com');
  });

  it('should throw when required env var is missing', () => {
    delete process.env.REQUIRED_VAR;
    expect(() => interpolateEnvVars({ baseUrl: '${REQUIRED_VAR}' }))
      .toThrow('Missing required environment variable: REQUIRED_VAR');
  });

  it('should handle nested objects', () => {
    process.env.USER = 'testuser';
    process.env.PASS = 'secret';
    const result = interpolateEnvVars({
      credentials: {
        username: '${USER}',
        password: '${PASS}',
      },
    });
    expect(result.credentials.username).toBe('testuser');
    expect(result.credentials.password).toBe('secret');
  });

  it('should leave non-interpolated strings unchanged', () => {
    const result = interpolateEnvVars({ baseUrl: 'https://static.com' });
    expect(result.baseUrl).toBe('https://static.com');
  });

  it('should handle arrays', () => {
    process.env.ITEM = 'value';
    const result = interpolateEnvVars({ items: ['${ITEM}', 'static'] });
    expect(result.items).toEqual(['value', 'static']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './interpolate.js' not found

**Step 3: Implement interpolateEnvVars**

Create `framework/config/interpolate.ts`:

```typescript
const ENV_VAR_PATTERN = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

export class MissingEnvVarError extends Error {
  constructor(varName: string) {
    super(`Missing required environment variable: ${varName}`);
    this.name = 'MissingEnvVarError';
  }
}

function interpolateString(value: string): string {
  return value.replace(ENV_VAR_PATTERN, (match, varName: string, defaultValue?: string) => {
    const envValue = process.env[varName];
    if (envValue !== undefined) {
      return envValue;
    }
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new MissingEnvVarError(varName);
  });
}

export function interpolateEnvVars<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return interpolateString(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateEnvVars(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateEnvVars(value);
    }
    return result as T;
  }

  return obj;
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Export from config index**

Update `framework/config/index.ts`:
```typescript
export * from './types.js';
export * from './interpolate.js';
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(config): add environment variable interpolation with defaults"
```

---

## Task 4: Config Loader

**Files:**
- Create: `framework/config/loader.ts`
- Create: `framework/config/loader.test.ts`
- Create: `framework/defaults.json`

**Step 1: Create framework defaults**

Create `framework/defaults.json`:

```json
{
  "baseUrl": "http://localhost:3000",
  "timeouts": {
    "navigation": 30000,
    "action": 5000,
    "assertion": 5000
  },
  "diagnostics": {
    "screenshot": "only-on-failure",
    "trace": "retain-on-failure",
    "video": "off"
  }
}
```

**Step 2: Write failing tests for ConfigLoader**

Create `framework/config/loader.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from './loader.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ConfigLoader', () => {
  const testSitesDir = path.join(__dirname, '__test_sites__');
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    // Create test site structure
    await fs.mkdir(path.join(testSitesDir, 'testsite', 'env'), { recursive: true });

    await fs.writeFile(
      path.join(testSitesDir, 'testsite', 'config.json'),
      JSON.stringify({
        baseUrl: 'https://testsite.com',
        timeouts: { navigation: 60000 },
      })
    );

    await fs.writeFile(
      path.join(testSitesDir, 'testsite', 'env', 'staging.json'),
      JSON.stringify({
        baseUrl: 'https://staging.testsite.com',
      })
    );
  });

  afterEach(async () => {
    process.env = originalEnv;
    await fs.rm(testSitesDir, { recursive: true, force: true });
  });

  it('should load framework defaults', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite' });

    expect(config.diagnostics?.screenshot).toBe('only-on-failure');
  });

  it('should merge site config over defaults', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite' });

    expect(config.baseUrl).toBe('https://testsite.com');
    expect(config.timeouts.navigation).toBe(60000);
    expect(config.timeouts.action).toBe(5000); // from defaults
  });

  it('should merge env config over site config', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite', env: 'staging' });

    expect(config.baseUrl).toBe('https://staging.testsite.com');
  });

  it('should interpolate environment variables', async () => {
    process.env.TEST_BASE_URL = 'https://env-override.com';

    await fs.writeFile(
      path.join(testSitesDir, 'testsite', 'config.json'),
      JSON.stringify({
        baseUrl: '${TEST_BASE_URL}',
      })
    );

    const loader = new ConfigLoader({ sitesDir: testSitesDir });
    const config = await loader.resolve({ site: 'testsite' });

    expect(config.baseUrl).toBe('https://env-override.com');
  });

  it('should throw for missing site', async () => {
    const loader = new ConfigLoader({ sitesDir: testSitesDir });

    await expect(loader.resolve({ site: 'nonexistent' }))
      .rejects.toThrow(/Site config not found/);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './loader.js' not found

**Step 4: Implement ConfigLoader**

Create `framework/config/loader.ts`:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SiteConfig, ResolveOptions } from './types.js';
import { interpolateEnvVars } from './interpolate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ConfigLoaderOptions {
  sitesDir?: string;
  frameworkDir?: string;
  localConfigPath?: string;
}

export class ConfigLoader {
  private readonly sitesDir: string;
  private readonly frameworkDir: string;
  private readonly localConfigPath: string;

  constructor(options: ConfigLoaderOptions = {}) {
    const rootDir = path.resolve(__dirname, '../..');
    this.sitesDir = options.sitesDir ?? path.join(rootDir, 'sites');
    this.frameworkDir = options.frameworkDir ?? path.join(rootDir, 'framework');
    this.localConfigPath = options.localConfigPath ?? path.join(rootDir, 'local.json');
  }

  async resolve(options: ResolveOptions): Promise<SiteConfig> {
    const { site, env } = options;

    // Layer 1: Framework defaults
    const defaults = await this.loadJson<Partial<SiteConfig>>(
      path.join(this.frameworkDir, 'defaults.json')
    );

    // Layer 2: Site config
    const siteConfigPath = path.join(this.sitesDir, site, 'config.json');
    const siteConfig = await this.loadJson<Partial<SiteConfig>>(siteConfigPath, true);

    // Layer 3: Environment config (optional)
    let envConfig: Partial<SiteConfig> = {};
    if (env) {
      const envConfigPath = path.join(this.sitesDir, site, 'env', `${env}.json`);
      envConfig = await this.loadJson<Partial<SiteConfig>>(envConfigPath);
    }

    // Layer 4: Local overrides (optional, gitignored)
    const localConfig = await this.loadJson<Partial<SiteConfig>>(this.localConfigPath);

    // Merge all layers
    const merged = this.deepMerge(defaults, siteConfig, envConfig, localConfig);

    // Interpolate environment variables
    const interpolated = interpolateEnvVars(merged);

    return interpolated as SiteConfig;
  }

  private async loadJson<T>(filePath: string, required = false): Promise<T> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        if (required) {
          throw new Error(`Site config not found: ${filePath}`);
        }
        return {} as T;
      }
      throw error;
    }
  }

  private deepMerge(...objects: Partial<SiteConfig>[]): Partial<SiteConfig> {
    const result: Record<string, unknown> = {};

    for (const obj of objects) {
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.deepMerge(
            (result[key] as Record<string, unknown>) ?? {},
            value as Record<string, unknown>
          );
        } else {
          result[key] = value;
        }
      }
    }

    return result as Partial<SiteConfig>;
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 6: Export from config index**

Update `framework/config/index.ts`:
```typescript
export * from './types.js';
export * from './interpolate.js';
export * from './loader.js';
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat(config): add ConfigLoader with 4-level inheritance"
```

---

## Task 5: BaseComponent Foundation

**Files:**
- Create: `framework/core/BaseComponent.ts`
- Create: `framework/core/BaseComponent.test.ts`
- Create: `framework/core/types.ts`

**Step 1: Create core types**

Create `framework/core/types.ts`:

```typescript
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

export interface ComponentConstructor<T extends BaseComponentInterface = BaseComponentInterface> {
  new (locator: Locator, config: SiteConfig): T;
  readonly selectors?: Record<string, string>;
}

export interface BaseComponentInterface {
  readonly locator: Locator;
  readonly config: SiteConfig;
}

export interface ComponentOptions {
  multiple?: boolean;
}

export interface ComponentDefineOptions {
  readyWhen?: (locator: Locator) => Promise<void>;
  readySelector?: string;
  readyState?: 'visible' | 'hidden' | 'attached' | 'detached';
}
```

**Step 2: Write failing tests for BaseComponent**

Create `framework/core/BaseComponent.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BaseComponent } from './BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

// Mock locator
function createMockLocator(overrides: Partial<Locator> = {}): Locator {
  return {
    locator: vi.fn().mockReturnThis(),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue('test'),
    isVisible: vi.fn().mockResolvedValue(true),
    waitFor: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as Locator;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('BaseComponent', () => {
  it('should store locator and config', () => {
    const locator = createMockLocator();
    const component = new BaseComponent(locator, mockConfig);

    expect(component.locator).toBe(locator);
    expect(component.config).toBe(mockConfig);
  });

  it('should allow subclasses to define static selectors', () => {
    class TestComponent extends BaseComponent {
      static readonly selectors = {
        button: '[data-testid="btn"]',
        input: '[data-testid="input"]',
      } as const;
    }

    expect(TestComponent.selectors.button).toBe('[data-testid="btn"]');
  });

  it('should provide selector access in subclass', () => {
    class TestComponent extends BaseComponent {
      static readonly selectors = {
        button: '[data-testid="btn"]',
      } as const;

      get buttonSelector(): string {
        return TestComponent.selectors.button;
      }
    }

    const locator = createMockLocator();
    const component = new TestComponent(locator, mockConfig);

    expect(component.buttonSelector).toBe('[data-testid="btn"]');
  });

  it('should allow subclasses to use locator methods', async () => {
    const mockClick = vi.fn().mockResolvedValue(undefined);
    const innerLocator = createMockLocator({ click: mockClick });
    const locator = createMockLocator({
      locator: vi.fn().mockReturnValue(innerLocator),
    });

    class ButtonComponent extends BaseComponent {
      static readonly selectors = {
        submit: '[type="submit"]',
      } as const;

      async clickSubmit(): Promise<void> {
        await this.locator.locator(ButtonComponent.selectors.submit).click();
      }
    }

    const component = new ButtonComponent(locator, mockConfig);
    await component.clickSubmit();

    expect(locator.locator).toHaveBeenCalledWith('[type="submit"]');
    expect(mockClick).toHaveBeenCalled();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './BaseComponent.js' not found

**Step 4: Implement BaseComponent**

Create `framework/core/BaseComponent.ts`:

```typescript
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

export class BaseComponent {
  static readonly selectors: Record<string, string> = {};

  constructor(
    public readonly locator: Locator,
    public readonly config: SiteConfig
  ) {}
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 6: Export from core index**

Update `framework/core/index.ts`:
```typescript
export * from './types.js';
export * from './BaseComponent.js';
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat(core): add BaseComponent with locator and config"
```

---

## Task 6: Component Decorator

**Files:**
- Create: `framework/core/decorators.ts`
- Create: `framework/core/decorators.test.ts`

**Step 1: Write failing tests for decorators**

Create `framework/core/decorators.test.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { Component, getComponentMetadata } from './decorators.js';
import { BaseComponent } from './BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

function createMockLocator(): Locator {
  const self: Partial<Locator> = {
    locator: vi.fn().mockImplementation(() => self),
  };
  return self as Locator;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('@Component decorator', () => {
  it('should store metadata for decorated property', () => {
    class ChildComponent extends BaseComponent {}

    class ParentComponent extends BaseComponent {
      @Component('[data-testid="child"]')
      readonly child!: ChildComponent;
    }

    const metadata = getComponentMetadata(ParentComponent.prototype, 'child');
    expect(metadata).toBeDefined();
    expect(metadata?.selector).toBe('[data-testid="child"]');
    expect(metadata?.multiple).toBe(false);
  });

  it('should support multiple option', () => {
    class ItemComponent extends BaseComponent {}

    class ListComponent extends BaseComponent {
      @Component('[data-testid="item"]', { multiple: true })
      readonly items!: ItemComponent[];
    }

    const metadata = getComponentMetadata(ListComponent.prototype, 'items');
    expect(metadata?.multiple).toBe(true);
  });

  it('should get all component properties from class', () => {
    class HeaderComponent extends BaseComponent {}
    class FooterComponent extends BaseComponent {}

    class PageComponent extends BaseComponent {
      @Component('[data-testid="header"]')
      readonly header!: HeaderComponent;

      @Component('[data-testid="footer"]')
      readonly footer!: FooterComponent;
    }

    const allMetadata = getComponentMetadata(PageComponent.prototype);
    expect(Object.keys(allMetadata)).toHaveLength(2);
    expect(allMetadata.header.selector).toBe('[data-testid="header"]');
    expect(allMetadata.footer.selector).toBe('[data-testid="footer"]');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './decorators.js' not found

**Step 3: Implement decorators**

Create `framework/core/decorators.ts`:

```typescript
import 'reflect-metadata';
import type { ComponentOptions } from './types.js';

const COMPONENT_METADATA_KEY = Symbol('component:metadata');

export interface ComponentMetadata {
  selector: string;
  multiple: boolean;
  propertyKey: string;
}

export function Component(selector: string, options: ComponentOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const metadata: ComponentMetadata = {
      selector,
      multiple: options.multiple ?? false,
      propertyKey: String(propertyKey),
    };

    // Store metadata for this property
    const existingMetadata = Reflect.getMetadata(COMPONENT_METADATA_KEY, target) ?? {};
    existingMetadata[String(propertyKey)] = metadata;
    Reflect.defineMetadata(COMPONENT_METADATA_KEY, existingMetadata, target);
  };
}

export function getComponentMetadata(
  target: object,
  propertyKey?: string
): ComponentMetadata | Record<string, ComponentMetadata> | undefined {
  const allMetadata = Reflect.getMetadata(COMPONENT_METADATA_KEY, target) as
    | Record<string, ComponentMetadata>
    | undefined;

  if (propertyKey !== undefined) {
    return allMetadata?.[propertyKey];
  }

  return allMetadata ?? {};
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Export from core index**

Update `framework/core/index.ts`:
```typescript
export * from './types.js';
export * from './BaseComponent.js';
export * from './decorators.js';
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(core): add @Component decorator with metadata storage"
```

---

## Task 7: ComponentCollection

**Files:**
- Create: `framework/core/ComponentCollection.ts`
- Create: `framework/core/ComponentCollection.test.ts`

**Step 1: Write failing tests for ComponentCollection**

Create `framework/core/ComponentCollection.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ComponentCollection } from './ComponentCollection.js';
import { BaseComponent } from './BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

class TestItemComponent extends BaseComponent {
  async getText(): Promise<string> {
    return (await this.locator.textContent()) ?? '';
  }
}

function createMockLocator(count: number): Locator {
  const nthMocks: Locator[] = [];

  for (let i = 0; i < count; i++) {
    nthMocks.push({
      textContent: vi.fn().mockResolvedValue(`Item ${i}`),
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
    } as unknown as Locator);
  }

  return {
    count: vi.fn().mockResolvedValue(count),
    nth: vi.fn().mockImplementation((index: number) => nthMocks[index]),
    first: vi.fn().mockReturnValue(nthMocks[0]),
    last: vi.fn().mockReturnValue(nthMocks[count - 1]),
    filter: vi.fn().mockReturnThis(),
  } as unknown as Locator;
}

describe('ComponentCollection', () => {
  it('should return count of items', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    expect(await collection.count()).toBe(3);
  });

  it('should access item by index using nth()', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection.nth(1);
    expect(item).toBeInstanceOf(TestItemComponent);
    expect(await item.getText()).toBe('Item 1');
  });

  it('should access item by numeric index via Proxy', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection[0];
    expect(item).toBeInstanceOf(TestItemComponent);
    expect(await item.getText()).toBe('Item 0');
  });

  it('should access first item', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection.first();
    expect(await item.getText()).toBe('Item 0');
  });

  it('should access last item', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const item = collection.last();
    expect(await item.getText()).toBe('Item 2');
  });

  it('should be async iterable', async () => {
    const locator = createMockLocator(3);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const texts: string[] = [];
    for await (const item of collection) {
      texts.push(await item.getText());
    }

    expect(texts).toEqual(['Item 0', 'Item 1', 'Item 2']);
  });

  it('should support spread operator', async () => {
    const locator = createMockLocator(2);
    const collection = new ComponentCollection(locator, TestItemComponent, mockConfig);

    const items = await collection.all();
    expect(items).toHaveLength(2);
    expect(items[0]).toBeInstanceOf(TestItemComponent);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './ComponentCollection.js' not found

**Step 3: Implement ComponentCollection**

Create `framework/core/ComponentCollection.ts`:

```typescript
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';
import type { ComponentConstructor } from './types.js';
import { BaseComponent } from './BaseComponent.js';

export type ArrayAccessible<T extends BaseComponent> = ComponentCollection<T> & {
  [index: number]: T;
};

export class ComponentCollection<T extends BaseComponent> {
  constructor(
    private readonly locator: Locator,
    private readonly ComponentClass: ComponentConstructor<T>,
    private readonly config: SiteConfig
  ) {
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.nth(parseInt(prop, 10));
        }
        return Reflect.get(target, prop, receiver);
      },
    }) as ArrayAccessible<T>;
  }

  async count(): Promise<number> {
    return this.locator.count();
  }

  nth(index: number): T {
    return new this.ComponentClass(this.locator.nth(index), this.config);
  }

  first(): T {
    return new this.ComponentClass(this.locator.first(), this.config);
  }

  last(): T {
    return new this.ComponentClass(this.locator.last(), this.config);
  }

  filter(options: { hasText?: string | RegExp; has?: Locator }): ComponentCollection<T> {
    return new ComponentCollection(
      this.locator.filter(options),
      this.ComponentClass,
      this.config
    ) as ArrayAccessible<T> as ComponentCollection<T>;
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
    const count = await this.count();
    for (let i = 0; i < count; i++) {
      yield this.nth(i);
    }
  }

  async all(): Promise<T[]> {
    const items: T[] = [];
    for await (const item of this) {
      items.push(item);
    }
    return items;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Export from core index**

Update `framework/core/index.ts`:
```typescript
export * from './types.js';
export * from './BaseComponent.js';
export * from './decorators.js';
export * from './ComponentCollection.js';
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(core): add ComponentCollection with Proxy array access and async iteration"
```

---

## Task 8: BasePage

**Files:**
- Create: `framework/core/BasePage.ts`
- Create: `framework/core/BasePage.test.ts`

**Step 1: Write failing tests for BasePage**

Create `framework/core/BasePage.test.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { BasePage, Page as PageDecorator, getPageRoute } from './BasePage.js';
import type { Page } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

function createMockPage(): Page {
  return {
    goto: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://test.com/checkout'),
  } as unknown as Page;
}

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('BasePage', () => {
  it('should store page and config', () => {
    const page = createMockPage();
    const basePage = new BasePage(page, mockConfig);

    expect(basePage.page).toBe(page);
    expect(basePage.config).toBe(mockConfig);
  });

  it('should navigate to route via goto()', async () => {
    @PageDecorator('/checkout')
    class CheckoutPage extends BasePage {}

    const page = createMockPage();
    const checkoutPage = new CheckoutPage(page, mockConfig);

    await checkoutPage.goto();

    expect(page.goto).toHaveBeenCalledWith('https://test.com/checkout');
    expect(page.waitForLoadState).toHaveBeenCalledWith('networkidle');
  });

  it('should return this from goto() for chaining', async () => {
    @PageDecorator('/checkout')
    class CheckoutPage extends BasePage {}

    const page = createMockPage();
    const checkoutPage = new CheckoutPage(page, mockConfig);

    const result = await checkoutPage.goto();

    expect(result).toBe(checkoutPage);
  });

  it('should get route from @Page decorator', () => {
    @PageDecorator('/products')
    class ProductsPage extends BasePage {}

    const route = getPageRoute(ProductsPage);
    expect(route).toBe('/products');
  });

  it('should allow custom waitForReady override', async () => {
    const customWait = vi.fn().mockResolvedValue(undefined);

    @PageDecorator('/custom')
    class CustomPage extends BasePage {
      protected override async waitForReady(): Promise<void> {
        await customWait();
      }
    }

    const page = createMockPage();
    const customPage = new CustomPage(page, mockConfig);

    await customPage.goto();

    expect(customWait).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './BasePage.js' not found

**Step 3: Implement BasePage**

Create `framework/core/BasePage.ts`:

```typescript
import 'reflect-metadata';
import type { Page as PlaywrightPage } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

const PAGE_ROUTE_KEY = Symbol('page:route');

export function Page(route: string): ClassDecorator {
  return (target: Function): void => {
    Reflect.defineMetadata(PAGE_ROUTE_KEY, route, target);
  };
}

export function getPageRoute(target: Function): string | undefined {
  return Reflect.getMetadata(PAGE_ROUTE_KEY, target) as string | undefined;
}

export class BasePage {
  constructor(
    public readonly page: PlaywrightPage,
    public readonly config: SiteConfig
  ) {}

  async goto(): Promise<this> {
    const route = this.getRoute();
    const url = this.config.baseUrl + route;
    await this.page.goto(url);
    await this.waitForReady();
    return this;
  }

  protected getRoute(): string {
    const route = getPageRoute(this.constructor);
    if (!route) {
      throw new Error(`No @Page decorator found on ${this.constructor.name}`);
    }
    return route;
  }

  protected async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Export from core index**

Update `framework/core/index.ts`:
```typescript
export * from './types.js';
export * from './BaseComponent.js';
export * from './decorators.js';
export * from './ComponentCollection.js';
export * from './BasePage.js';
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(core): add BasePage with @Page decorator and route handling"
```

---

## Task 9: Component Initialization in BasePage

**Files:**
- Modify: `framework/core/BasePage.ts`
- Modify: `framework/core/BasePage.test.ts`

**Step 1: Add tests for component initialization**

Add to `framework/core/BasePage.test.ts`:

```typescript
import { Component, getComponentMetadata } from './decorators.js';
import { BaseComponent } from './BaseComponent.js';
import { ComponentCollection } from './ComponentCollection.js';

// Add these tests to the describe block:

describe('BasePage component initialization', () => {
  it('should initialize child components from @Component decorators', () => {
    class HeaderComponent extends BaseComponent {}

    @PageDecorator('/home')
    class HomePage extends BasePage {
      @Component('[data-testid="header"]')
      readonly header!: HeaderComponent;
    }

    const mockLocator = {
      locator: vi.fn().mockReturnValue({
        textContent: vi.fn().mockResolvedValue('Header'),
      }),
    };
    const page = createMockPage();
    (page as any).locator = vi.fn().mockReturnValue(mockLocator);

    const homePage = new HomePage(page, mockConfig);

    expect(homePage.header).toBeInstanceOf(HeaderComponent);
  });

  it('should initialize ComponentCollection for multiple components', () => {
    class ItemComponent extends BaseComponent {}

    @PageDecorator('/list')
    class ListPage extends BasePage {
      @Component('[data-testid="item"]', { multiple: true })
      readonly items!: ComponentCollection<ItemComponent>;
    }

    const mockLocator = {
      count: vi.fn().mockResolvedValue(3),
      nth: vi.fn().mockReturnValue({}),
    };
    const page = createMockPage();
    (page as any).locator = vi.fn().mockReturnValue(mockLocator);

    const listPage = new ListPage(page, mockConfig);

    expect(listPage.items).toBeInstanceOf(ComponentCollection);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - header/items not properly initialized

**Step 3: Update BasePage to initialize components**

Update `framework/core/BasePage.ts`:

```typescript
import 'reflect-metadata';
import type { Page as PlaywrightPage } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';
import { getComponentMetadata, type ComponentMetadata } from './decorators.js';
import { BaseComponent } from './BaseComponent.js';
import { ComponentCollection } from './ComponentCollection.js';

const PAGE_ROUTE_KEY = Symbol('page:route');

export function Page(route: string): ClassDecorator {
  return (target: Function): void => {
    Reflect.defineMetadata(PAGE_ROUTE_KEY, route, target);
  };
}

export function getPageRoute(target: Function): string | undefined {
  return Reflect.getMetadata(PAGE_ROUTE_KEY, target) as string | undefined;
}

export class BasePage {
  constructor(
    public readonly page: PlaywrightPage,
    public readonly config: SiteConfig
  ) {
    this.initializeComponents();
  }

  async goto(): Promise<this> {
    const route = this.getRoute();
    const url = this.config.baseUrl + route;
    await this.page.goto(url);
    await this.waitForReady();
    return this;
  }

  protected getRoute(): string {
    const route = getPageRoute(this.constructor);
    if (!route) {
      throw new Error(`No @Page decorator found on ${this.constructor.name}`);
    }
    return route;
  }

  protected async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  private initializeComponents(): void {
    const metadata = getComponentMetadata(Object.getPrototypeOf(this)) as Record<
      string,
      ComponentMetadata
    >;

    for (const [propertyKey, meta] of Object.entries(metadata)) {
      const locator = this.page.locator(meta.selector);

      // Get the component class from the type metadata
      const ComponentClass = Reflect.getMetadata(
        'design:type',
        Object.getPrototypeOf(this),
        propertyKey
      ) as typeof BaseComponent | undefined;

      if (!ComponentClass) {
        continue;
      }

      if (meta.multiple) {
        (this as any)[propertyKey] = new ComponentCollection(
          locator,
          ComponentClass as any,
          this.config
        );
      } else {
        (this as any)[propertyKey] = new ComponentClass(locator, this.config);
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat(core): add automatic component initialization in BasePage"
```

---

## Task 10: Custom Expect Matchers

**Files:**
- Create: `framework/expect/matchers.ts`
- Create: `framework/expect/matchers.test.ts`
- Create: `framework/expect/index.ts`

**Step 1: Write failing tests for custom matchers**

Create `framework/expect/matchers.test.ts`:

```typescript
import { describe, it, expect as vitestExpect, vi } from 'vitest';
import { expect } from './index.js';
import { BaseComponent } from '../core/BaseComponent.js';
import { ComponentCollection } from '../core/ComponentCollection.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('custom expect matchers', () => {
  describe('toHaveItemCount', () => {
    it('should pass when count matches', async () => {
      const locator = {
        count: vi.fn().mockResolvedValue(3),
        nth: vi.fn().mockReturnValue({}),
      } as unknown as Locator;

      class ItemComponent extends BaseComponent {}
      const collection = new ComponentCollection(locator, ItemComponent, mockConfig);

      await vitestExpect(
        expect(collection).toHaveItemCount(3)
      ).resolves.not.toThrow();
    });

    it('should fail when count does not match', async () => {
      const locator = {
        count: vi.fn().mockResolvedValue(2),
        nth: vi.fn().mockReturnValue({}),
      } as unknown as Locator;

      class ItemComponent extends BaseComponent {}
      const collection = new ComponentCollection(locator, ItemComponent, mockConfig);

      await vitestExpect(
        expect(collection).toHaveItemCount(3)
      ).rejects.toThrow(/Expected collection to have 3 items, but got 2/);
    });
  });

  describe('toBeInState', () => {
    it('should pass when state matches', async () => {
      const locator = {
        getAttribute: vi.fn().mockResolvedValue('loading'),
      } as unknown as Locator;

      const component = new BaseComponent(locator, mockConfig);

      await vitestExpect(
        expect(component).toBeInState('loading')
      ).resolves.not.toThrow();
    });

    it('should fail when state does not match', async () => {
      const locator = {
        getAttribute: vi.fn().mockResolvedValue('ready'),
      } as unknown as Locator;

      const component = new BaseComponent(locator, mockConfig);

      await vitestExpect(
        expect(component).toBeInState('loading')
      ).rejects.toThrow(/Expected component to be in state "loading", but got "ready"/);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './index.js' not found

**Step 3: Implement custom matchers**

Create `framework/expect/matchers.ts`:

```typescript
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
```

Create `framework/expect/index.ts`:

```typescript
import { expect as baseExpect } from '@playwright/test';
import { componentMatchers } from './matchers.js';

export const expect = baseExpect.extend(componentMatchers);

export * from './matchers.js';
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat(expect): add custom Playwright matchers for components"
```

---

## Task 11: Test Data Factory

**Files:**
- Create: `framework/data/Factory.ts`
- Create: `framework/data/Factory.test.ts`
- Create: `framework/data/index.ts`

**Step 1: Write failing tests for Factory**

Create `framework/data/Factory.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { Factory } from './Factory.js';

interface User {
  email: string;
  name: string;
  tier: 'free' | 'premium';
  active: boolean;
}

describe('Factory', () => {
  const userFactory = new Factory<User>({
    email: 'test@example.com',
    name: 'Test User',
    tier: 'free',
    active: true,
  });

  it('should create entity with defaults', () => {
    const user = userFactory.build();

    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    expect(user.tier).toBe('free');
    expect(user.active).toBe(true);
  });

  it('should override specific fields', () => {
    const user = userFactory.build({ tier: 'premium' });

    expect(user.email).toBe('test@example.com');
    expect(user.tier).toBe('premium');
  });

  it('should not mutate defaults', () => {
    userFactory.build({ name: 'Other User' });
    const user = userFactory.build();

    expect(user.name).toBe('Test User');
  });

  it('should create multiple entities', () => {
    const users = userFactory.buildMany(3);

    expect(users).toHaveLength(3);
    users.forEach((user) => {
      expect(user.email).toBe('test@example.com');
    });
  });

  it('should create multiple with overrides', () => {
    const users = userFactory.buildMany(2, { tier: 'premium' });

    expect(users).toHaveLength(2);
    users.forEach((user) => {
      expect(user.tier).toBe('premium');
    });
  });

  it('should support sequence for unique values', () => {
    const seqFactory = new Factory<User>({
      email: 'test@example.com',
      name: 'Test User',
      tier: 'free',
      active: true,
    }).withSequence((n) => ({
      email: `user${n}@example.com`,
    }));

    const user1 = seqFactory.build();
    const user2 = seqFactory.build();

    expect(user1.email).toBe('user1@example.com');
    expect(user2.email).toBe('user2@example.com');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './Factory.js' not found

**Step 3: Implement Factory**

Create `framework/data/Factory.ts`:

```typescript
export type SequenceFunction<T> = (n: number) => Partial<T>;

export class Factory<T extends object> {
  private sequence = 0;
  private sequenceFn?: SequenceFunction<T>;

  constructor(private readonly defaults: T) {}

  build(overrides: Partial<T> = {}): T {
    this.sequence++;
    const sequenceOverrides = this.sequenceFn ? this.sequenceFn(this.sequence) : {};
    return { ...this.defaults, ...sequenceOverrides, ...overrides };
  }

  buildMany(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  withSequence(fn: SequenceFunction<T>): Factory<T> {
    const newFactory = new Factory(this.defaults);
    newFactory.sequenceFn = fn;
    return newFactory;
  }
}
```

Create `framework/data/index.ts`:

```typescript
export * from './Factory.js';
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat(data): add Factory class for test data generation"
```

---

## Task 12: Diagnostics - Component State Capture

**Files:**
- Create: `framework/diagnostics/capture.ts`
- Create: `framework/diagnostics/capture.test.ts`
- Create: `framework/diagnostics/types.ts`
- Create: `framework/diagnostics/index.ts`

**Step 1: Create diagnostics types**

Create `framework/diagnostics/types.ts`:

```typescript
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ComponentDiagnostics {
  componentName: string;
  selector: string;
  boundingBox: BoundingBox | null;
  isVisible: boolean;
  innerHTML: string;
  attributes: Record<string, string>;
}
```

**Step 2: Write failing tests for capture**

Create `framework/diagnostics/capture.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { captureComponentState } from './capture.js';
import { BaseComponent } from '../core/BaseComponent.js';
import type { Locator } from '@playwright/test';
import type { SiteConfig } from '../config/types.js';

const mockConfig: SiteConfig = {
  baseUrl: 'https://test.com',
  timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
};

describe('captureComponentState', () => {
  it('should capture component diagnostics', async () => {
    const locator = {
      boundingBox: vi.fn().mockResolvedValue({ x: 100, y: 200, width: 300, height: 150 }),
      isVisible: vi.fn().mockResolvedValue(true),
      innerHTML: vi.fn().mockResolvedValue('<span>Content</span>'),
      evaluate: vi.fn().mockResolvedValue({ 'data-testid': 'cart', class: 'cart active' }),
    } as unknown as Locator;

    class CartComponent extends BaseComponent {
      static readonly selectors = {
        root: '[data-testid="cart"]',
      };

      get rootSelector(): string {
        return CartComponent.selectors.root;
      }
    }

    const component = new CartComponent(locator, mockConfig);
    (component as any).rootSelector = '[data-testid="cart"]';

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.componentName).toBe('CartComponent');
    expect(diagnostics.isVisible).toBe(true);
    expect(diagnostics.boundingBox).toEqual({ x: 100, y: 200, width: 300, height: 150 });
    expect(diagnostics.innerHTML).toBe('<span>Content</span>');
    expect(diagnostics.attributes['data-testid']).toBe('cart');
  });

  it('should handle null bounding box for hidden elements', async () => {
    const locator = {
      boundingBox: vi.fn().mockResolvedValue(null),
      isVisible: vi.fn().mockResolvedValue(false),
      innerHTML: vi.fn().mockResolvedValue(''),
      evaluate: vi.fn().mockResolvedValue({}),
    } as unknown as Locator;

    const component = new BaseComponent(locator, mockConfig);

    const diagnostics = await captureComponentState(component);

    expect(diagnostics.boundingBox).toBeNull();
    expect(diagnostics.isVisible).toBe(false);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './capture.js' not found

**Step 4: Implement captureComponentState**

Create `framework/diagnostics/capture.ts`:

```typescript
import type { BaseComponent } from '../core/BaseComponent.js';
import type { ComponentDiagnostics } from './types.js';

export async function captureComponentState(
  component: BaseComponent
): Promise<ComponentDiagnostics> {
  const locator = component.locator;

  const [boundingBox, isVisible, innerHTML, attributes] = await Promise.all([
    locator.boundingBox(),
    locator.isVisible(),
    locator.innerHTML(),
    locator.evaluate((el) =>
      Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]))
    ),
  ]);

  return {
    componentName: component.constructor.name,
    selector: (component as any).rootSelector ?? 'unknown',
    boundingBox,
    isVisible,
    innerHTML,
    attributes,
  };
}
```

Create `framework/diagnostics/index.ts`:

```typescript
export * from './types.js';
export * from './capture.js';
```

**Step 5: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 6: Commit**

```bash
git add .
git commit -m "feat(diagnostics): add component state capture for failure debugging"
```

---

## Task 13: Extended Test Fixture

**Files:**
- Create: `framework/test.ts`
- Create: `framework/test.test.ts`

**Step 1: Write failing tests for extended fixture**

Create `framework/test.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// These tests validate the structure of the test fixture
// Full integration testing requires Playwright test runner

describe('test fixture structure', () => {
  it('should export test with config fixture', async () => {
    const { test } = await import('./test.js');

    expect(test).toBeDefined();
    expect(typeof test).toBe('function');
    expect(test.extend).toBeDefined();
  });

  it('should export expect', async () => {
    const { expect } = await import('./test.js');

    expect(expect).toBeDefined();
    expect(expect.extend).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`
Expected: FAIL - module './test.js' not found

**Step 3: Implement extended test fixture**

Create `framework/test.ts`:

```typescript
import { test as base, expect as baseExpect } from '@playwright/test';
import { ConfigLoader } from './config/loader.js';
import type { SiteConfig } from './config/types.js';
import { captureComponentState } from './diagnostics/capture.js';
import { componentMatchers } from './expect/matchers.js';

export interface TestFixtures {
  config: SiteConfig;
}

export const test = base.extend<TestFixtures>({
  config: async ({}, use, testInfo) => {
    const site = process.env.SITE;
    const env = process.env.ENV ?? 'staging';

    if (!site) {
      throw new Error('SITE environment variable is required');
    }

    const loader = new ConfigLoader();
    const config = await loader.resolve({ site, env });

    await use(config);
  },

  page: async ({ page, config }, use, testInfo) => {
    // Set default timeouts from config
    page.setDefaultTimeout(config.timeouts.action);
    page.setDefaultNavigationTimeout(config.timeouts.navigation);

    await use(page);

    // Capture diagnostics on failure
    if (testInfo.status === 'failed') {
      // Component diagnostics would be captured here if components are tracked
      // For now, we attach basic page info
      await testInfo.attach('page-url', {
        body: page.url(),
        contentType: 'text/plain',
      });
    }
  },
});

export const expect = baseExpect.extend(componentMatchers);

export { type SiteConfig } from './config/types.js';
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`
Expected: PASS

**Step 5: Update framework index**

Update `framework/index.ts`:

```typescript
// Core
export * from './core/index.js';

// Config
export * from './config/index.js';

// Expect
export * from './expect/index.js';

// Data
export * from './data/index.js';

// Diagnostics
export * from './diagnostics/index.js';

// Test fixtures
export { test, expect } from './test.js';
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat(test): add extended Playwright test fixture with config injection"
```

---

## Task 14: Playwright Config Integration

**Files:**
- Modify: `playwright.config.ts`

**Step 1: Update Playwright config for multi-site support**

Replace `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const site = process.env.SITE;
const env = process.env.ENV ?? 'staging';

function discoverSites(): string[] {
  const sitesDir = path.join(__dirname, 'sites');
  if (!fs.existsSync(sitesDir)) {
    return [];
  }
  return fs.readdirSync(sitesDir).filter((name) => {
    const sitePath = path.join(sitesDir, name);
    return fs.statSync(sitePath).isDirectory() &&
           fs.existsSync(path.join(sitePath, 'config.json'));
  });
}

export default defineConfig({
  testDir: site ? `./sites/${site}/tests` : './sites',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list'],
  ],

  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: site
    ? [
        {
          name: site,
          testDir: `./sites/${site}/tests`,
          use: {
            ...devices['Desktop Chrome'],
          },
        },
      ]
    : discoverSites().map((siteName) => ({
        name: siteName,
        testDir: `./sites/${siteName}/tests`,
        use: {
          ...devices['Desktop Chrome'],
        },
      })),
});
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add .
git commit -m "feat(config): add multi-site Playwright config with project discovery"
```

---

## Task 15: Example Site - Scaffold

**Files:**
- Create: `sites/example/config.json`
- Create: `sites/example/env/staging.json`
- Create: `sites/example/CLAUDE.md`
- Create: `sites/example/components/` directory
- Create: `sites/example/pages/` directory
- Create: `sites/example/tests/` directory

**Step 1: Create example site config**

Create `sites/example/config.json`:

```json
{
  "baseUrl": "https://example.com",
  "timeouts": {
    "navigation": 30000,
    "action": 5000,
    "assertion": 5000
  }
}
```

Create `sites/example/env/staging.json`:

```json
{
  "baseUrl": "https://staging.example.com"
}
```

**Step 2: Create CLAUDE.md for AI context**

Create `sites/example/CLAUDE.md`:

```markdown
# Example Site

This is an example site demonstrating the framework patterns.

## Overview

- Simple e-commerce-style site for testing
- Uses standard data-testid selectors

## Components

- `HeaderComponent` - Site header with navigation
- `ProductCardComponent` - Product display card

## Pages

- `HomePage` - Landing page with product grid
```

**Step 3: Create directory structure**

Run:
```bash
mkdir -p sites/example/components sites/example/pages sites/example/tests sites/example/data
```

**Step 4: Commit**

```bash
git add .
git commit -m "feat(sites): add example site scaffold"
```

---

## Task 16: Example Component

**Files:**
- Create: `sites/example/components/HeaderComponent.ts`
- Create: `sites/example/components/index.ts`

**Step 1: Create HeaderComponent**

Create `sites/example/components/HeaderComponent.ts`:

```typescript
import { BaseComponent, Component } from '../../../framework/core/index.js';

export class NavItemComponent extends BaseComponent {
  async click(): Promise<void> {
    await this.locator.click();
  }

  async getText(): Promise<string> {
    return (await this.locator.textContent()) ?? '';
  }
}

export class HeaderComponent extends BaseComponent {
  static readonly selectors = {
    logo: '[data-testid="logo"]',
    navItem: '[data-testid="nav-item"]',
    searchInput: '[data-testid="search-input"]',
    cartButton: '[data-testid="cart-button"]',
  } as const;

  @Component('[data-testid="nav-item"]', { multiple: true })
  readonly navItems!: NavItemComponent[];

  async clickLogo(): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.logo).click();
  }

  async search(query: string): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.searchInput).fill(query);
    await this.locator.locator(HeaderComponent.selectors.searchInput).press('Enter');
  }

  async openCart(): Promise<void> {
    await this.locator.locator(HeaderComponent.selectors.cartButton).click();
  }
}
```

Create `sites/example/components/index.ts`:

```typescript
export * from './HeaderComponent.js';
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add .
git commit -m "feat(example): add HeaderComponent with navigation"
```

---

## Task 17: Example Page

**Files:**
- Create: `sites/example/pages/HomePage.ts`
- Create: `sites/example/pages/index.ts`

**Step 1: Create HomePage**

Create `sites/example/pages/HomePage.ts`:

```typescript
import { BasePage, Page, Component } from '../../../framework/core/index.js';
import { HeaderComponent } from '../components/index.js';

@Page('/')
export class HomePage extends BasePage {
  @Component('[data-testid="header"]')
  readonly header!: HeaderComponent;

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}
```

Create `sites/example/pages/index.ts`:

```typescript
export * from './HomePage.js';
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add .
git commit -m "feat(example): add HomePage with header component"
```

---

## Task 18: Example Test

**Files:**
- Create: `sites/example/tests/home.spec.ts`

**Step 1: Create example test**

Create `sites/example/tests/home.spec.ts`:

```typescript
import { test, expect } from '../../../framework/test.js';
import { HomePage } from '../pages/index.js';

test.describe('Home Page', () => {
  test('should load home page', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();

    await expect(page).toHaveTitle(/Example/);
  });

  test('should display header', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();

    await expect(homePage.header.locator).toBeVisible();
  });

  test('should navigate via header', async ({ page, config }) => {
    const homePage = await new HomePage(page, config).goto();

    await homePage.header.clickLogo();

    await expect(page).toHaveURL(config.baseUrl + '/');
  });
});
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add .
git commit -m "feat(example): add home page tests demonstrating framework usage"
```

---

## Task 19: Root CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create root CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# Playwright Page Object Framework

Multi-site, component-based page object framework for Playwright with strict TypeScript.

## Quick Start

```bash
# Run tests for a specific site
SITE=example ENV=staging npm test

# Run all site tests
npm test
```

## Project Structure

- `framework/` - Core framework code
  - `core/` - BaseComponent, BasePage, decorators
  - `config/` - Configuration loader with 4-level inheritance
  - `expect/` - Custom Playwright matchers
  - `data/` - Test data factories
  - `diagnostics/` - Failure capture utilities
- `sites/<site>/` - Site-specific code
  - `config.json` - Site configuration
  - `env/` - Environment overrides
  - `components/` - Site components
  - `pages/` - Page objects
  - `tests/` - Test files

## Key Patterns

### Components
- Extend `BaseComponent`
- Use `@Component` decorator for child components
- Define `static readonly selectors` for element selectors

### Pages
- Extend `BasePage`
- Use `@Page('/route')` decorator
- Components are auto-initialized from decorators

### Configuration
Inheritance: `framework/defaults.json` → `sites/<site>/config.json` → `env/<env>.json` → `local.json`

Supports `${VAR:-default}` interpolation.

## Adding a Site

1. Create `sites/<name>/config.json`
2. Create `sites/<name>/env/staging.json` (and other envs)
3. Add components in `sites/<name>/components/`
4. Add pages in `sites/<name>/pages/`
5. Add tests in `sites/<name>/tests/`
6. Create `sites/<name>/CLAUDE.md` for AI context

## Skills

See `.claude/skills/` for guided workflows:
- `add-site.md` - Create a new site
- `add-component.md` - Create a component
- `add-page.md` - Create a page object
- `write-test.md` - Write a test
```

**Step 2: Commit**

```bash
git add .
git commit -m "docs: add root CLAUDE.md with framework overview"
```

---

## Task 20: Skills for AI Workflows

**Files:**
- Create: `.claude/skills/add-site.md`
- Create: `.claude/skills/add-component.md`
- Create: `.claude/skills/add-page.md`
- Create: `.claude/skills/write-test.md`

**Step 1: Create add-site skill**

Create `.claude/skills/add-site.md`:

```markdown
---
description: Create a new site with config, directories, and CLAUDE.md
---

# Add Site

## Steps

1. Create site directory: `sites/<name>/`
2. Create `config.json` with:
   ```json
   {
     "baseUrl": "<site-url>",
     "timeouts": {
       "navigation": 30000,
       "action": 5000,
       "assertion": 5000
     }
   }
   ```
3. Create `env/staging.json` with staging baseUrl
4. Create directories: `components/`, `pages/`, `tests/`, `data/`
5. Create `CLAUDE.md` describing the site
6. Create index files for components and pages

## Checklist

- [ ] config.json has valid baseUrl
- [ ] env/staging.json exists
- [ ] CLAUDE.md describes site purpose and quirks
- [ ] TypeScript compiles: `npm run lint`
```

**Step 2: Create add-component skill**

Create `.claude/skills/add-component.md`:

```markdown
---
description: Create a component with selectors, decorators, and methods
---

# Add Component

## Steps

1. Determine location:
   - Shared: `framework/core/components/`
   - Site-specific: `sites/<site>/components/`

2. Create component file:
   ```typescript
   import { BaseComponent, Component } from '@framework/core';

   export class MyComponent extends BaseComponent {
     static readonly selectors = {
       button: '[data-testid="my-button"]',
     } as const;

     async clickButton(): Promise<void> {
       await this.locator.locator(MyComponent.selectors.button).click();
     }
   }
   ```

3. Add child components with `@Component` decorator if needed
4. Export from `index.ts`

## Checklist

- [ ] Extends BaseComponent
- [ ] Has static selectors object
- [ ] Methods are async and return Promise
- [ ] Exported from index.ts
- [ ] TypeScript compiles
```

**Step 3: Create add-page skill**

Create `.claude/skills/add-page.md`:

```markdown
---
description: Create a page object with route, components, and methods
---

# Add Page

## Steps

1. Create page file in `sites/<site>/pages/`:
   ```typescript
   import { BasePage, Page, Component } from '@framework/core';
   import { HeaderComponent } from '../components';

   @Page('/my-route')
   export class MyPage extends BasePage {
     @Component('[data-testid="header"]')
     readonly header!: HeaderComponent;

     async doSomething(): Promise<void> {
       // Page-specific actions
     }
   }
   ```

2. Add @Page decorator with route
3. Add @Component decorators for child components
4. Export from `index.ts`

## Checklist

- [ ] Extends BasePage
- [ ] Has @Page decorator with route
- [ ] Components use @Component decorator
- [ ] Exported from index.ts
- [ ] TypeScript compiles
```

**Step 4: Create write-test skill**

Create `.claude/skills/write-test.md`:

```markdown
---
description: Write a Playwright test using the framework
---

# Write Test

## Steps

1. Create test file in `sites/<site>/tests/`:
   ```typescript
   import { test, expect } from '@framework/test';
   import { MyPage } from '../pages';

   test.describe('My Feature', () => {
     test('should do something', async ({ page, config }) => {
       const myPage = await new MyPage(page, config).goto();

       await myPage.doSomething();

       await expect(myPage.someComponent).toBeVisible();
     });
   });
   ```

2. Use `config` fixture for site configuration
3. Create page instance with `new Page(page, config)`
4. Call `.goto()` to navigate
5. Use custom matchers from framework

## Running

```bash
SITE=<site> ENV=staging npm test -- <test-file>
```

## Checklist

- [ ] Imports test and expect from framework
- [ ] Uses config fixture
- [ ] Creates page instances correctly
- [ ] Has meaningful assertions
- [ ] Test passes: `SITE=<site> npm test`
```

**Step 5: Commit**

```bash
git add .
git commit -m "docs: add AI workflow skills for common tasks"
```

---

## Final Task: Verify Complete Setup

**Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 2: Verify TypeScript compilation**

Run: `npm run lint`
Expected: No errors

**Step 3: Verify Playwright can discover tests**

Run: `npx playwright test --list`
Expected: Lists tests from sites/example/tests/

**Step 4: Final commit**

```bash
git add .
git commit -m "chore: complete framework implementation"
```

---

## Summary

This plan implements:

1. **Project scaffold** with TypeScript, Playwright, and directory structure
2. **Configuration system** with 4-level inheritance and env var interpolation
3. **BaseComponent** with locator and config injection
4. **@Component decorator** for metadata storage
5. **ComponentCollection** with Proxy array access and async iteration
6. **BasePage** with @Page decorator and auto-component initialization
7. **Custom expect matchers** for component assertions
8. **Test data Factory** for generating test entities
9. **Diagnostics** for component state capture on failure
10. **Extended test fixture** with config injection
11. **Multi-site Playwright config** with project discovery
12. **Example site** demonstrating all patterns
13. **CLAUDE.md** and skills for AI-assisted development
