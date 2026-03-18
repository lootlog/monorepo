# @lootlog/ui

Shared React UI toolkit for Lootlog frontends.

## Overview

- Provides reusable components, hooks, helpers, styles, and battle-related i18n assets.
- Is consumed by multiple apps, including `web` and `landing`, through direct workspace imports.
- Uses Radix UI primitives and Tailwind CSS-based styling across the component set.

## Exports

- components under `@lootlog/ui/components/*`
- shared helpers under `@lootlog/ui/lib/*`
- hooks under `@lootlog/ui/hooks/*`
- styles via `@lootlog/ui/globals.css`
- battle UI translations via `@lootlog/ui/i18n/*`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/ui lint
```

## Notes

- Export paths are defined in `package.json`.
- This workspace currently has no dedicated build script because it is consumed directly inside the monorepo.
