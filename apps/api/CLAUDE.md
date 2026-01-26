# API Service

Core NestJS backend managing guilds, members, loots, timers, and roles.

## Tech Stack

- NestJS 11 + Fastify
- Prisma ORM → PostgreSQL 17 (port 5433)
- Redis (caching, distributed locks)
- RabbitMQ (event publishing)

## Commands

```bash
pnpm dev                    # Start with hot reload
pnpm api:migrate:dev        # Create/apply migrations
pnpm api:generate           # Regenerate Prisma client
pnpm api:studio             # Open Prisma Studio
pnpm test                   # Run tests
```

## Module Structure

```
src/
├── guilds/          # Guild CRUD, permissions, configs
├── members/         # Member management, Discord sync
├── loots/           # Loot tracking, filtering, comments
├── timers/          # Boss respawn timers
├── roles/           # Role management, permissions
├── discord/         # Discord API integration
├── auth/            # Auth service integration
├── users/           # User preferences
└── shared/          # Guards, decorators, pipes
```

## Authentication

Runs behind Traefik with Forward Auth. AuthGuard reads headers injected by Traefik:
- `x-auth-discord-id`
- `x-auth-user-id`

PermissionsGuard checks guild-level permissions cached in Redis.

## Key Patterns

### Database

- **Prisma**: Schema at `prisma/schema.prisma`
- **Soft deletes**: Use `active: false`, never hard delete
- **Raw SQL**: For complex queries, use `Prisma.sql` template literals (never `Prisma.raw` with user input)

### Caching

- Redis TTL: 300s (prod), 60s (local)
- Cache keys: `guild:{id}`, `member:{discordId}:{guildId}`, `permissions:{userId}:{guildId}`
- Invalidation: Pattern-based via `deleteByPattern()`

### Events

Publishes to RabbitMQ exchange `lootlog.topic`:
- `guilds.timers.update/delete`
- `guilds.members.update/refresh`

Consumed by: Gateway (Socket.IO broadcast), Discord Bot, Search service

### Distributed Locking

Timer creation uses Redis locks to prevent race conditions:
1. Deduplication lock (10s)
2. Creation lock (5s)
3. Redlock for concurrent Discord API requests

## API Endpoints

Swagger: `http://localhost:4003/api/docs`

- `/guilds/*` - Guild management
- `/guilds/:guildId/members/*` - Member operations
- `/guilds/:guildId/loots/*` - Loot tracking
- `/guilds/:guildId/timers/*` - Timer management
- `/guilds/:guildId/roles/*` - Role management
