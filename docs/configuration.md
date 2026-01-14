---
purpose: guide
topics: [configuration, environment, settings, inheritance]
related:
  - "[[architecture]]"
  - "[[getting-started]]"
see-also:
  - framework/config/loader.ts
  - framework/config/types.ts
  - framework/config/interpolate.ts
---

# Configuration

The framework uses a 4-level configuration inheritance system with environment variable interpolation.

## Configuration Hierarchy

Configuration merges from most general to most specific:

```
framework/defaults.json     (1. Framework defaults)
         ↓
sites/<site>/config.json    (2. Site defaults)
         ↓
sites/<site>/env/<env>.json (3. Environment overrides)
         ↓
local.json                  (4. Local developer overrides)
         ↓
Environment variables       (${VAR:-default} interpolation)
```

Later layers override earlier layers. Deep merging is used for nested objects.

## Configuration Schema

```typescript
interface SiteConfig {
  baseUrl: string;              // Site base URL
  credentials?: {               // Optional login credentials
    username: string;
    password: string;
  };
  timeouts: {                   // Timeout settings
    navigation: number;         // Page navigation timeout (ms)
    action: number;             // Action timeout (ms)
    assertion: number;          // Assertion timeout (ms)
  };
  diagnostics?: {               // Failure capture settings
    screenshot: 'off' | 'on' | 'only-on-failure';
    trace: 'off' | 'on' | 'retain-on-failure';
    video: 'off' | 'on' | 'retain-on-failure';
  };
}
```

## Framework Defaults

`framework/defaults.json`:

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

## Site Configuration

`sites/<site>/config.json`:

```json
{
  "baseUrl": "https://mysite.example.com",
  "credentials": {
    "username": "${TEST_USER}",
    "password": "${TEST_PASS}"
  },
  "timeouts": {
    "navigation": 60000
  }
}
```

Only specify values that differ from framework defaults.

## Environment Configuration

`sites/<site>/env/staging.json`:

```json
{
  "baseUrl": "https://staging.mysite.example.com"
}
```

`sites/<site>/env/production.json`:

```json
{
  "baseUrl": "https://mysite.example.com",
  "diagnostics": {
    "video": "on"
  }
}
```

## Local Overrides

Create `local.json` in the project root (gitignored):

```json
{
  "baseUrl": "http://localhost:3000",
  "credentials": {
    "username": "dev@example.com",
    "password": "devpassword"
  }
}
```

This file is for personal development overrides and should never be committed.

## Environment Variable Interpolation

### Basic Syntax

```json
{
  "baseUrl": "${BASE_URL}"
}
```

If `BASE_URL` is not set, an error is thrown.

### Default Values

```json
{
  "baseUrl": "${BASE_URL:-https://localhost:3000}"
}
```

If `BASE_URL` is not set, uses `https://localhost:3000`.

### Nested Values

```json
{
  "credentials": {
    "username": "${TEST_USER:-testuser}",
    "password": "${TEST_PASS}"
  }
}
```

### Setting Environment Variables

```bash
# In shell
export BASE_URL=https://staging.example.com
export TEST_USER=admin@example.com
export TEST_PASS=secretpassword

# Inline with command
BASE_URL=https://prod.example.com SITE=mysite npm test

# From .env file (requires dotenv)
# Add to test setup if needed
```

## Using Configuration in Tests

### The Config Fixture

```typescript
import { test, expect } from '@framework/test.js';

test('uses config', async ({ page, config }) => {
  // Access configuration
  console.log(config.baseUrl);
  console.log(config.timeouts.navigation);

  // Navigate using config
  await page.goto(config.baseUrl + '/custom-path');
});
```

### In Page Objects

```typescript
export class MyPage extends BasePage {
  async login(): Promise<void> {
    // Use credentials from config
    const { username, password } = this.config.credentials!;
    await this.page.locator('[name="email"]').fill(username);
    await this.page.locator('[name="password"]').fill(password);
  }
}
```

## ConfigLoader API

### Basic Usage

```typescript
import { ConfigLoader } from '@framework/config/index.js';

const loader = new ConfigLoader();
const config = await loader.resolve({
  site: 'mysite',
  env: 'staging',
});
```

### Custom Paths

```typescript
const loader = new ConfigLoader({
  sitesDir: './custom/sites',
  frameworkDir: './custom/framework',
  localConfigPath: './custom-local.json',
});
```

## Merging Behavior

### Simple Values

Later values completely replace earlier values:

```json
// defaults.json
{ "baseUrl": "http://localhost:3000" }

// config.json
{ "baseUrl": "https://production.com" }

// Result
{ "baseUrl": "https://production.com" }
```

### Nested Objects

Nested objects are deep-merged:

```json
// defaults.json
{
  "timeouts": {
    "navigation": 30000,
    "action": 5000,
    "assertion": 5000
  }
}

// config.json
{
  "timeouts": {
    "navigation": 60000
  }
}

// Result
{
  "timeouts": {
    "navigation": 60000,
    "action": 5000,
    "assertion": 5000
  }
}
```

### Arrays

Arrays are replaced, not merged:

```json
// defaults.json
{ "browsers": ["chrome", "firefox"] }

// config.json
{ "browsers": ["webkit"] }

// Result
{ "browsers": ["webkit"] }
```

## Best Practices

### DO

- Keep secrets in environment variables
- Use `local.json` for personal overrides
- Set reasonable defaults in framework
- Document required environment variables

### DON'T

- Commit credentials to config files
- Use `local.json` for shared settings
- Override timeouts without reason
- Skip environment-specific configs

## Troubleshooting

### Missing Environment Variable

```
Error: Missing required environment variable: TEST_PASS
```

Either set the variable or add a default:

```json
"password": "${TEST_PASS:-defaultpass}"
```

### Site Config Not Found

```
Error: Site config not found: sites/mysite/config.json
```

Ensure the site directory and config.json exist.

### Unexpected Config Values

Debug by logging the resolved config:

```typescript
test('debug config', async ({ config }) => {
  console.log(JSON.stringify(config, null, 2));
});
```

## Validation

Configuration is validated at runtime using Zod schemas. Invalid configs fail fast with clear error messages, catching issues before tests run.

### Validation Error Example

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

### Common Validation Errors

| Error | Fix |
|-------|-----|
| Missing `baseUrl` | Add `baseUrl` to your site or environment config |
| Invalid URL format | Ensure `baseUrl` starts with `http://` or `https://` |
| Negative timeout | Timeouts must be positive numbers |
| Invalid mode | `screenshot`/`trace`/`video` must be one of the allowed values (`'off'`, `'on'`, `'only-on-failure'`, `'retain-on-failure'`) |
