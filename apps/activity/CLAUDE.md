# Activity Service

User and guild activity event tracking service using TimescaleDB for time-series data.

## Tech Stack

- NestJS with Fastify
- PostgreSQL 17 (TimescaleDB) on port 5435
- Prisma ORM
- RabbitMQ for event consumption
- Redis for caching

## Commands

```bash
pnpm dev                    # Start with hot reload
pnpm activity:migrate:dev   # Run migrations
pnpm activity:generate      # Regenerate Prisma client
pnpm activity:studio        # Open Prisma Studio
```

## Key Files

- `src/activities/activities.controller.ts` - REST endpoints for activity logs
- `src/activities/activities-events.service.ts` - RabbitMQ event handlers
- `prisma/schema.prisma` - TimescaleDB hypertable schema (7-day retention)

## API Endpoints

All routes require Bearer token authentication.

- `GET /guilds/:guildId/activity-logs` - Query guild activities
- `GET /guilds/:guildId/users/:userId/activity-logs` - Query user activities
- Suggestion endpoints for autocomplete (actors, worlds, clans)

## Database Notes

Activity table uses TimescaleDB hypertable with 1-day chunks and 7-day retention. Composite key: `id + createdAt` for time-series optimization.
