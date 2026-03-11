# Battlelog Service

NestJS service for tracking and analyzing battle statistics from Margonem.

## Overview

The Battlelog Service processes battle data from the game, tracks warrior performance, and provides comprehensive statistics and leaderboards.

## Features

- **Battle Logging** - Record detailed battle information
- **Warrior Statistics** - Track individual warrior performance
- **Character Analytics** - Analyze character builds and equipment
- **Leaderboards** - Rankings based on various metrics
- **Historical Data** - Long-term battle history
- **API Integration** - RESTful endpoints for battle data

## Tech Stack

- **NestJS** - Progressive Node.js framework
- **Fastify** - Fast HTTP server
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Battle data database (port 5434)
- **RabbitMQ** - Event-driven communication

## Database

Uses the `battle-log-db` PostgreSQL database for:

- Battle records
- Warrior statistics
- Character data
- Equipment tracking
- Performance metrics

Schema: `apps/battlelog-service/prisma/schema.prisma`

## API Endpoints

- `GET /api/battles` - List battles
- `GET /api/battles/:id` - Battle details
- `GET /api/warriors` - Warrior statistics
- `GET /api/warriors/:id` - Individual warrior stats
- `GET /api/leaderboards` - Various leaderboards
- `POST /api/battles` - Create battle record

## Development

```bash
# From monorepo root
pnpm battlelog:migrate:dev    # Run database migrations
pnpm battlelog:generate       # Generate Prisma client
pnpm battlelog:studio         # Open Prisma Studio
cd apps/battlelog-service
pnpm dev                      # Start development server

# Service runs on http://localhost:3034
```

## Environment Variables

See `.env.sample` for required configuration:

- Database connection
- RabbitMQ connection
- JWT configuration for authentication
