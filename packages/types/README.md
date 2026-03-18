# @lootlog/types

Shared TypeScript contracts for Lootlog applications and packages.

## Overview

- Publishes shared enums and interfaces consumed by frontend and backend workspaces.
- Keeps permission models and user settings payloads aligned across services.
- Currently exports runtime environment, permission, timer-settings, and sound-settings types.

## Exports

- `Permission`
- timer settings payloads and related NPC type definitions
- sound settings payloads
- runtime environment enums

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/types build
```

## Notes

- Public exports are collected in `src/index.ts`.
- Add new contracts here only when they are shared across workspace boundaries.
