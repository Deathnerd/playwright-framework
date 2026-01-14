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
- Use `declare` keyword for component properties (not `!`)

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

## Important Notes

- Use `declare` keyword for component properties to avoid TypeScript field initialization issues
- Component types must be passed explicitly in `@Component` decorator options: `{ type: MyComponent }`
