# @lootlog/discord-bot

Discord integration service built with Bun, Effect, and discord.js.

## Overview

- Owns the scoped Discord client and registers Discord event handlers directly.
- Consumes notification commands and publishes delivery and synchronization events through RabbitMQ.
- Exposes the existing health and internal synchronization routes through Bun HTTP.

## Development

Run commands from the monorepo root:

```bash
bun run --filter @lootlog/discord-bot dev
```

## Source layout

- `src/bot` owns Discord delivery, synchronization, event handling, and RabbitMQ publishing.
- `src/http-api/contracts` owns the health and internal synchronization contracts.
- `src/bot-application.ts` wires the HTTP and RabbitMQ adapters; shared logging lives at `src/logger.ts`.

## Key Scripts

- `bun run --filter @lootlog/discord-bot build`
- `bun run --filter @lootlog/discord-bot start`
- `bun run --filter @lootlog/discord-bot lint`
- `bun run --filter @lootlog/discord-bot test`
- `bun run --filter @lootlog/discord-bot test:e2e`

## Notes

- Discord and RabbitMQ resources are wired as scoped Effect Layers.
- `BunRuntime.runMain` owns SIGINT/SIGTERM interruption and finalization.
