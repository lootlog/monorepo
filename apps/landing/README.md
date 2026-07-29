# @lootlog/landing

Next.js landing page and documentation site for Lootlog.

## Overview

- Serves the marketing homepage, legal pages, and MDX-backed documentation under `src/app/docs`.
- Uses `fumadocs` for docs rendering and `@lootlog/ui` for shared presentation primitives.
- Builds as a static export via Next.js configuration in `next.config.ts`.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/landing dev
```

The dev server runs on port `3003`.

## Key Scripts

- `pnpm --filter @lootlog/landing build`
- `pnpm --filter @lootlog/landing start`
- `pnpm --filter @lootlog/landing lint`
- `pnpm --filter @lootlog/landing typecheck`

## Notes

- `next.config.ts` enables static export and MDX page extensions.
- The app imports shared UI from `@lootlog/ui` instead of duplicating component code.
