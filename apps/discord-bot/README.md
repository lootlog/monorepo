# @lootlog/discord-bot

Discord integration service built with Hono and discord.js.

## Overview

- Boots the Lootlog bot client and handles Discord-driven workflows from the `bot` module.
- Serves internal HTTP endpoints through Hono on Node.js.
- Integrates with RabbitMQ for cross-service communication and event-driven automation.

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/discord-bot dev
```

## Key Scripts

- `pnpm --filter @lootlog/discord-bot build`
- `pnpm --filter @lootlog/discord-bot start`
- `pnpm --filter @lootlog/discord-bot lint`
- `pnpm --filter @lootlog/discord-bot test`
- `pnpm --filter @lootlog/discord-bot test:e2e`

## Notes

- Discord, RabbitMQ, logging, and observability are wired through `src/config/*`.
- Production start runs `dist/index.js`, which initializes observability, Discord, RabbitMQ, and HTTP in a single process.
