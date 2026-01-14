# Zod Config Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Zod runtime validation to config loading so malformed configs fail fast with clear error messages.

**Architecture:** Replace manual TypeScript interfaces with Zod schemas. Derive types from schemas (single source of truth). Validate merged config after interpolation in ConfigLoader.

**Tech Stack:** Zod, Vitest

---

## Task 1: Add Zod Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install zod**

Run: `npm install zod`

**Step 2: Verify installation**

Run: `npm ls zod`
Expected: `zod@3.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add zod for config validation"
```

---

## Task 2: Create Zod Schemas

**Files:**
- Create: `framework/config/schemas.ts`
- Create: `framework/config/schemas.test.ts`

**Step 1: Write failing test for schema validation**

Create `framework/config/schemas.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { SiteConfigSchema } from './schemas.js';

describe('SiteConfigSchema', () => {
  it('should accept valid complete config', () => {
    const config = {
      baseUrl: 'https://example.com',
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

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should accept config with optional credentials', () => {
    const config = {
      baseUrl: 'https://example.com',
      credentials: {
        username: 'user',
        password: 'pass',
      },
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject missing baseUrl', () => {
    const config = {
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('baseUrl');
    }
  });

  it('should reject invalid baseUrl', () => {
    const config = {
      baseUrl: 'not-a-url',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject negative timeout', () => {
    const config = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: -1000,
        action: 5000,
        assertion: 5000,
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject invalid screenshot mode', () => {
    const config = {
      baseUrl: 'https://example.com',
      timeouts: {
        navigation: 30000,
        action: 5000,
        assertion: 5000,
      },
      diagnostics: {
        screenshot: 'invalid-mode',
        trace: 'off',
        video: 'off',
      },
    };

    const result = SiteConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- framework/config/schemas.test.ts`
Expected: FAIL - module './schemas.js' not found

**Step 3: Implement schemas**

Create `framework/config/schemas.ts`:

```typescript
import { z } from 'zod';

export const ScreenshotModeSchema = z.enum(['off', 'on', 'only-on-failure']);
export const TraceModeSchema = z.enum(['off', 'on', 'retain-on-failure']);
export const VideoModeSchema = z.enum(['off', 'on', 'retain-on-failure']);

export const DiagnosticsConfigSchema = z.object({
  screenshot: ScreenshotModeSchema,
  trace: TraceModeSchema,
  video: VideoModeSchema,
});

export const TimeoutsConfigSchema = z.object({
  navigation: z.number().positive(),
  action: z.number().positive(),
  assertion: z.number().positive(),
});

export const CredentialsConfigSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const SiteConfigSchema = z.object({
  baseUrl: z.string().url(),
  credentials: CredentialsConfigSchema.optional(),
  timeouts: TimeoutsConfigSchema,
  diagnostics: DiagnosticsConfigSchema.optional(),
});

export const ResolveOptionsSchema = z.object({
  site: z.string().min(1),
  env: z.string().optional(),
});
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- framework/config/schemas.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add framework/config/schemas.ts framework/config/schemas.test.ts
git commit -m "feat(config): add Zod schemas for config validation"
```

---

## Task 3: Update Types to Derive from Schemas

**Files:**
- Modify: `framework/config/types.ts`
- Modify: `framework/config/types.test.ts`

**Step 1: Update types.ts to use z.infer**

Replace `framework/config/types.ts` contents:

```typescript
import { z } from 'zod';
import {
  ScreenshotModeSchema,
  TraceModeSchema,
  VideoModeSchema,
  DiagnosticsConfigSchema,
  TimeoutsConfigSchema,
  CredentialsConfigSchema,
  SiteConfigSchema,
  ResolveOptionsSchema,
} from './schemas.js';

// Inferred types from schemas (single source of truth)
export type ScreenshotMode = z.infer<typeof ScreenshotModeSchema>;
export type TraceMode = z.infer<typeof TraceModeSchema>;
export type VideoMode = z.infer<typeof VideoModeSchema>;
export type DiagnosticsConfig = z.infer<typeof DiagnosticsConfigSchema>;
export type TimeoutsConfig = z.infer<typeof TimeoutsConfigSchema>;
export type CredentialsConfig = z.infer<typeof CredentialsConfigSchema>;
export type SiteConfig = z.infer<typeof SiteConfigSchema>;
export type ResolveOptions = z.infer<typeof ResolveOptionsSchema>;

// Re-export schemas for validation use
export {
  SiteConfigSchema,
  TimeoutsConfigSchema,
  DiagnosticsConfigSchema,
  CredentialsConfigSchema,
  ResolveOptionsSchema,
} from './schemas.js';
```

**Step 2: Run existing type tests**

Run: `npm run test:unit -- framework/config/types.test.ts`
Expected: PASS (types are compatible)

**Step 3: Commit**

```bash
git add framework/config/types.ts
git commit -m "refactor(config): derive types from Zod schemas"
```

---

## Task 4: Add Validation to ConfigLoader

**Files:**
- Modify: `framework/config/loader.ts`
- Modify: `framework/config/loader.test.ts`

**Step 1: Write failing test for validation errors**

Add to `framework/config/loader.test.ts`:

```typescript
import { ZodError } from 'zod';

// Add these tests to the existing describe block:

it('should throw ZodError for invalid baseUrl', async () => {
  await fs.writeFile(
    path.join(testSitesDir, 'testsite', 'config.json'),
    JSON.stringify({
      baseUrl: 'not-a-valid-url',
      timeouts: { navigation: 30000, action: 5000, assertion: 5000 },
    })
  );

  const loader = new ConfigLoader({ sitesDir: testSitesDir });

  await expect(loader.resolve({ site: 'testsite' }))
    .rejects.toThrow(ZodError);
});

it('should throw ZodError for negative timeout', async () => {
  await fs.writeFile(
    path.join(testSitesDir, 'testsite', 'config.json'),
    JSON.stringify({
      baseUrl: 'https://example.com',
      timeouts: { navigation: -1, action: 5000, assertion: 5000 },
    })
  );

  const loader = new ConfigLoader({ sitesDir: testSitesDir });

  await expect(loader.resolve({ site: 'testsite' }))
    .rejects.toThrow(ZodError);
});

it('should throw ZodError for missing required field after merge', async () => {
  // Config with no baseUrl and no defaults providing it
  await fs.writeFile(
    path.join(testSitesDir, 'testsite', 'config.json'),
    JSON.stringify({
      timeouts: { navigation: 30000 },
    })
  );

  // Use a custom frameworkDir with no defaults
  const emptyDefaultsDir = path.join(testSitesDir, 'empty-framework');
  await fs.mkdir(emptyDefaultsDir, { recursive: true });
  await fs.writeFile(
    path.join(emptyDefaultsDir, 'defaults.json'),
    JSON.stringify({})
  );

  const loader = new ConfigLoader({
    sitesDir: testSitesDir,
    frameworkDir: emptyDefaultsDir,
  });

  await expect(loader.resolve({ site: 'testsite' }))
    .rejects.toThrow(ZodError);
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- framework/config/loader.test.ts`
Expected: FAIL - does not throw ZodError

**Step 3: Update loader.ts to validate with schema**

Update `framework/config/loader.ts`:

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SiteConfig, ResolveOptions, SiteConfigSchema } from './types.js';
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

    // Validate with Zod schema
    return SiteConfigSchema.parse(interpolated);
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

**Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- framework/config/loader.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add framework/config/loader.ts framework/config/loader.test.ts
git commit -m "feat(config): add Zod validation to ConfigLoader"
```

---

## Task 5: Update Config Index Export

**Files:**
- Modify: `framework/config/index.ts`

**Step 1: Export schemas from index**

Update `framework/config/index.ts`:

```typescript
export * from './types.js';
export * from './schemas.js';
export * from './interpolate.js';
export * from './loader.js';
```

**Step 2: Verify TypeScript compiles**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add framework/config/index.ts
git commit -m "chore(config): export schemas from config index"
```

---

## Task 6: Run All Tests

**Step 1: Run all unit tests**

Run: `npm run test:unit`
Expected: All tests pass

**Step 2: Verify TypeScript compilation**

Run: `npm run lint`
Expected: No errors

**Step 3: Final commit if needed**

```bash
git add .
git commit -m "chore: complete Zod config validation"
```

---

## Summary

This plan:
1. Adds Zod as a dependency
2. Creates schemas in `schemas.ts` (source of truth)
3. Derives types from schemas in `types.ts` (no duplication)
4. Validates in `loader.ts` after merge and interpolation
5. Maintains backward compatibility (same type exports)

**Error improvement example:**

Before:
```
TypeError: Cannot read property 'replace' of undefined
    at someTest.spec.ts:42
```

After:
```
ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["baseUrl"],
    "message": "Required"
  }
]
```