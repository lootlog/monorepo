# Battlelog Service

Battle statistics tracking and analytics for Margonem PvP matches.

## Tech Stack

- NestJS with Fastify
- PostgreSQL 17 on port 5434
- Prisma ORM
- RabbitMQ for events
- Redis for caching
- S3/R2 for object storage

## Commands

```bash
pnpm dev                      # Start with hot reload
pnpm battlelog:migrate:dev    # Run migrations
pnpm battlelog:generate       # Regenerate Prisma client
pnpm battlelog:studio         # Open Prisma Studio
```

## Key Files

- `src/battles/battles.controller.ts` - Battle CRUD endpoints
- `src/battles/battles.service.ts` - Core battle logic
- `src/battles/services/battle-analytics.service.ts` - Statistics calculations
- `prisma/schema.prisma` - Battle, BattleWarrior, UserCharacter models

## Database Models

- **Battle** - Match metadata, ratings, winner/loser
- **BattleWarrior** - Individual warrior stats (40+ fields: damage, crits, healing, etc.)
- **UserCharacter** - User's character metadata

## API Endpoints

- `POST /battles` - Create battle record
- `GET /battles/@me` - User's battles with pagination
- `GET /battles/@me/analytics` - Battle analytics
- `GET /battles/@me/statistics/*` - Win rate, streaks, rating growth
- `GET /battles/public/:battleId` - Public battle view
