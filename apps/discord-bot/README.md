# @lootlog/discord-bot

Discord integration service built with NestJS and Necord.

## Overview

- Boots the Lootlog bot client and handles Discord-driven workflows from the `bot` module.
- Integrates with RabbitMQ for cross-service communication and event-driven automation.
- Keeps a dedicated health check module alongside bot-specific configuration and event handlers.

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

- Discord and RabbitMQ configuration is wired through `src/config/*`.
- Production start imports the generated observability bootstrap from `dist/instrumentation.js`.
