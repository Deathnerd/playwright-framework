---
purpose: guide
topics: [architecture, framework, overview, structure]
related:
  - "[[components]]"
  - "[[page-objects]]"
  - "[[configuration]]"
see-also:
  - framework/core/BaseComponent.ts
  - framework/core/BasePage.ts
  - framework/config/loader.ts
---

# Architecture

This document describes the high-level architecture of the Playwright page object framework.

## Design Principles

1. **Multi-site support** - One framework, many sites with shared and site-specific code
2. **Component composition** - Pages contain components, components contain components
3. **Strict TypeScript** - No implicit any, null-safe, full type inference
4. **Configuration inheritance** - 4-level config with environment variable support
5. **Fluent patterns** - DSL-style APIs where appropriate

## Directory Structure

```
playwright-framework/
├── framework/           # Core framework code (shared)
│   ├── core/           # BaseComponent, BasePage, decorators
│   ├── config/         # Config loader, merger, types
│   ├── diagnostics/    # Failure capture, component state
│   ├── expect/         # Custom Playwright matchers
│   ├── data/           # Factory base for test data
│   └── test.ts         # Extended test fixture
├── sites/              # Site-specific implementations
│   └── <site-name>/
│       ├── config.json # Site configuration
│       ├── env/        # Environment overrides
│       ├── components/ # Site-specific components
│       ├── pages/      # Page objects
│       ├── data/       # Test data fixtures
│       └── tests/      # Test files
├── docs/               # Documentation
└── playwright.config.ts
```

## Layer Architecture

### Layer 1: Framework Core

The `framework/` directory contains shared code used by all sites:

- **BaseComponent** - Foundation for all components
- **BasePage** - Foundation for all page objects
- **ConfigLoader** - 4-level configuration resolution
- **Factory** - Test data generation
- **Custom matchers** - Extended Playwright assertions

### Layer 2: Site Implementation

Each `sites/<name>/` directory contains site-specific code:

- Components tailored to the site's DOM structure
- Page objects representing site pages
- Test data fixtures and factories
- Site-specific configuration

### Layer 3: Tests

Tests live in `sites/<site>/tests/` and use:

- Extended test fixture with `config` injection
- Page objects and components from the site
- Custom matchers for assertions

## Component Model

Components are the building blocks:

```
Page
├── NavBarComponent
│   ├── NavItemComponent[]
│   └── UserMenuComponent
├── ContentComponent
│   └── CardComponent[]
└── FooterComponent
```

Each component:
- Extends `BaseComponent`
- Receives a `Locator` scoped to its root element
- Receives `SiteConfig` for configuration access
- Optionally receives `Page` for page-level operations

## Configuration Flow

```
framework/defaults.json     (base defaults)
         ↓
sites/<site>/config.json    (site overrides)
         ↓
sites/<site>/env/<env>.json (environment overrides)
         ↓
local.json                  (developer overrides, gitignored)
         ↓
Environment variables       (${VAR:-default} interpolation)
```

## Test Execution Flow

```
1. Playwright loads config → discovers sites/projects
2. Test runner starts → loads site config via fixture
3. Test creates page object → page navigates to route
4. Page initializes components → components scope to locators
5. Test interacts via page/component methods
6. Assertions use custom matchers
7. On failure → diagnostics capture component state
```

## Key Design Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Components | Getter-based instantiation | Avoids decorator/Babel issues |
| Selectors | Static readonly object | Type-safe, refactorable |
| Config | 4-level inheritance | Flexibility without complexity |
| Collections | Proxy for array access | Natural `items[0]` syntax |
| Waiting | Playwright auto-wait first | Minimize explicit waits |

## Extension Points

1. **Add components** - Extend `BaseComponent`, add to site
2. **Add pages** - Extend `BasePage`, use `@Page` decorator
3. **Add matchers** - Extend Playwright expect
4. **Add config** - Merge into site's config.json
5. **Add sites** - Create new site directory with structure
