# Discord Bot

Discord integration service that syncs guild events with Lootlog via RabbitMQ.

## Tech Stack

- NestJS with Necord (Discord.js wrapper)
- discord.js v14
- RabbitMQ for event publishing
- No database (event-driven only)

## Commands

```bash
pnpm dev        # Start with hot reload
pnpm build      # Build service
pnpm test       # Run tests
```

## Key Files

- `src/bot/bot.service.ts` - Core logic, publishes events to RabbitMQ
- `src/bot/bot-discord-events.handler.ts` - Discord event listeners (@On decorators)
- `src/bot/enums/routing-key.enum.ts` - RabbitMQ routing keys

## Events Handled

- Guild create/update/delete
- Role create/update/delete
- Member add/remove and role changes

## Architecture

Discord.js events → Necord decorators → BotService → RabbitMQ topic exchange. Purely event-driven messaging service with no persistent storage.
