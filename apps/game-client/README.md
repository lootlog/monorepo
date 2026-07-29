# @lootlog/game-client

React userscript client for the in-game Margonem experience.

## Overview

- Built with Vite and `vite-plugin-monkey` to inject Lootlog UI into supported Margonem domains.
- Combines timers, notifications, chat, quick access tools, party finder, NPC detection, and settings into a single overlay.
- Uses React Query, Socket.IO, Zustand, and shared workspace packages such as `@lootlog/types` and `@lootlog/socket-parser`.

## Development

Runtime events, adapters, domain stores, and processor invariants are documented
in [docs/runtime-integration.md](docs/runtime-integration.md).

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/game-client dev
```

## Local Production Build

To build the fully minified client against the production Lootlog services and
serve it to Tampermonkey locally, run:

```bash
pnpm --filter @lootlog/game-client dev:local-prod
```

The command prints an installation URL for
`@lootlog/game-client-local`. Install that userscript once, disable the regular
`@lootlog/game-client` userscript, and reload the game while the command keeps
running. Re-run the command after code changes to rebuild the bundle.

The local loader fetches the bundle from `127.0.0.1:4173` and executes it in the
game page context. Installing `dist/@lootlog/game-client.user.js` directly is
not supported because Tampermonkey may execute it in an isolated context where
Margonem globals such as `window.Engine` and `window.g` are unavailable.

## Key Scripts

- `pnpm --filter @lootlog/game-client build`
- `pnpm --filter @lootlog/game-client dev:local-prod`
- `pnpm --filter @lootlog/game-client preview`
- `pnpm --filter @lootlog/game-client test`
- `pnpm --filter @lootlog/game-client test:coverage`

## Notes

- `build` also copies the userscript entrypoint after the Vite bundle is created.
- Vite configuration lives in `vite.config.ts`, including the userscript match and exclude rules.
