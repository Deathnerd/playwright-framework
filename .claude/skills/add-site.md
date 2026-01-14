---
description: Create a new site with config, directories, and CLAUDE.md
---

# Add Site

## Steps

1. Create site directory: `sites/<name>/`
2. Create `config.json` with baseUrl and timeouts
3. Create `env/staging.json` with staging baseUrl
4. Create directories: `components/`, `pages/`, `tests/`, `data/`
5. Create `CLAUDE.md` describing the site
6. Create index files for components and pages

## Checklist

- [ ] config.json has valid baseUrl
- [ ] env/staging.json exists
- [ ] CLAUDE.md describes site purpose
- [ ] TypeScript compiles: `npm run lint`
