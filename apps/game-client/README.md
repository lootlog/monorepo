# @lootlog/game-client

React userscript client for the in-game Margonem experience.

## Overview

- Built with Vite and `vite-plugin-monkey` to inject Lootlog UI into supported Margonem domains.
- Combines timers, notifications, chat, quick access tools, party finder, NPC detection, and settings into a single overlay.
- Uses React Query, Socket.IO, Zustand, and shared workspace packages such as `@lootlog/types` and `@lootlog/socket-parser`.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/game-client dev
```

## Key Scripts

- `pnpm --filter @lootlog/game-client build`
- `pnpm --filter @lootlog/game-client preview`
- `pnpm --filter @lootlog/game-client test`
- `pnpm --filter @lootlog/game-client test:coverage`

## Notes

- `build` also copies the userscript entrypoint after the Vite bundle is created.
- Vite configuration lives in `vite.config.ts`, including the userscript match and exclude rules.
