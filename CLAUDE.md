# CLAUDE.md

## What is Lootlog

Guild loot tracking, battle logging, and Discord bot integration for the game "Margonem". Full-stack microservices monorepo.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS (Fastify), Hono
- **Frontend**: React 19, Vite, TanStack Router/Query
- **Databases**: PostgreSQL 17 (4 DBs), Redis, Meilisearch
- **Message Queue**: RabbitMQ 4
- **Node**: >= 20

## Quick Start

```bash
pnpm i                      # Install dependencies
pnpm env:generate           # Generate .env files with smart defaults
docker compose up -d        # Start infrastructure
pnpm api:migrate:dev        # Run migrations (also: auth, battlelog, activity)
pnpm dev                    # Start all services
```

## Essential Commands

```bash
pnpm dev                    # Start all services with hot reload
pnpm build                  # Build all
pnpm test                   # Run tests
pnpm lint                   # Lint code
```

### Database Commands

```bash
pnpm api:migrate:dev        # API service migrations (port 5433)
pnpm auth:migrate:dev       # Auth service migrations (port 5432)
pnpm battlelog:migrate:dev  # Battlelog migrations (port 5434)
pnpm activity:migrate:dev   # Activity migrations (port 5435)
pnpm api:generate           # Regenerate Prisma client after schema changes
pnpm api:studio             # Open Prisma Studio
```

## Architecture Overview

### Apps (`apps/*`)

| App | Purpose | Tech |
|-----|---------|------|
| `api` | Core backend (guilds, loots, timers) | NestJS, Prisma |
| `auth` | Authentication | Hono, Better-Auth |
| `gateway` | Real-time events | Socket.IO |
| `discord-bot` | Discord integration | NestJS, necord |
| `web` | Dashboard | React 19, Vite |
| `game-client` | In-game companion | React 19, Vite |

### Packages (`packages/*`)

- `ui` - Shared Radix UI + Tailwind components
- `types` - Shared TypeScript types
- `api-helpers` - JWT/JWKS utilities
- `nest-shared` - NestJS shared modules

### Four Databases

1. **Users DB** (5432) - Auth service, Kysely
2. **Lootlog DB** (5433) - API service, Prisma → `apps/api/prisma/schema.prisma`
3. **Battlelog DB** (5434) - Battlelog service, Prisma
4. **Activity DB** (5435) - Activity service, TimescaleDB

### Communication

- **Auth**: JWT via Auth service → JWKS validation in other services
- **Events**: RabbitMQ publish/subscribe between services
- **Real-time**: Socket.IO via Gateway service
- **Search**: Meilisearch with RabbitMQ-triggered indexing

## Development Notes

- React Compiler handles memoization - don't use `memo`/`useMemo`
- Web app is not SSR
- See `.oxlintrc.md` for linting rules
- Each app has its own `CLAUDE.md` with service-specific details

## Troubleshooting

```bash
docker compose ps           # Check containers
docker compose logs -f      # Follow logs
pnpm api:generate           # Fix "Prisma client not generated" errors
docker compose down && docker compose up -d  # Reset infrastructure
```

## Key Files

- `turbo.json` - Task pipeline
- `docker-compose.yml` - Infrastructure
- `apps/*/prisma/schema.prisma` - Database schemas
- Always use descriptive variable names.
- Avoid excessive comments.
- Please use i18n in /apps/web.