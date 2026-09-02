# @lootlog/web

React dashboard for the main Lootlog web application.

## Overview

- Uses Vite, TanStack Router, and TanStack Query for the browser app shell and data layer.
- Contains dashboard features for guild management, loots, timers, battles, events, settings, and authenticated user flows.
- Depends on shared workspace packages such as `@lootlog/ui`, `@lootlog/schema`, and `@lootlog/client`.

## Development

Run commands from the monorepo root:

```bash
bun run --filter=@lootlog/web dev
```

The Vite dev and preview servers are configured for port `3000`.

## Key Scripts

- `bun run --filter=@lootlog/web build`
- `bun run --filter=@lootlog/web preview`
- `bun run --filter=@lootlog/web lint`

## Notes

- Routing is generated from the TanStack route tree in `src/routeTree.gen`.
- Frontend translations live in `src/i18n/`.
