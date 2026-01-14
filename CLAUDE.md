# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Playwright E2E tests
npm test                              # Run all enabled sites
SITE=<name> npm test                  # Run specific site
SITE=<name> ENV=staging npm test      # Run with environment
npm test -- sites/<site>/tests/foo.spec.ts  # Run single test file
npm run test:ui                       # Playwright UI mode

# Unit tests (Vitest)
npm run test:unit                     # Run all unit tests
npx vitest run framework/config/      # Run tests in directory

# Type checking
npm run lint                          # TypeScript --noEmit
```

## Architecture

Multi-site Playwright page object framework with component composition.

**Layer model:**
- `framework/` - Shared core: BaseComponent, BasePage, ConfigLoader, test fixture
- `sites/<site>/` - Site implementations: components, pages, tests, config

**Component composition:** Pages contain components, components contain components. Each receives a scoped `Locator` and `SiteConfig`.

**Config inheritance:** `framework/defaults.json` → `sites/<site>/config.json` → `env/<env>.json` → `local.json` → `${ENV_VAR}` interpolation. Validated with Zod schemas.

**Test fixture:** Import `test` and `expect` from `@framework/test`. Fixture provides `config` with resolved site configuration.

## Key Patterns

**Component properties:** Use `declare` keyword (not `!`) to avoid TypeScript field initialization issues with decorators.

```typescript
@Component('[data-testid="header"]', { type: HeaderComponent })
declare readonly header: HeaderComponent;
```

**Selectors:** Define as `static readonly selectors` object for type safety.

**Site enable/disable:** Set `enabled: false` in site or env config to skip during test discovery.

## Skills

Use these skills for common tasks:

- `/add-site` - Create new site with config, directories, CLAUDE.md
- `/add-page` - Create page object with route and components
- `/add-component` - Create component with selectors and methods
- `/write-test` - Write Playwright test using the framework

## Documentation

See `docs/` for detailed guides:
- `architecture.md` - Framework design and layers
- `components.md` - Component patterns and BaseComponent API
- `page-objects.md` - Page patterns and BasePage API
- `configuration.md` - Config loader, inheritance, Zod validation
- `testing.md` - Test patterns and fixtures
- `patterns/` - Fluent chains, shared components
