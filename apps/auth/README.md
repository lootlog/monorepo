# @lootlog/auth

Bun and Effect-based authentication service for Lootlog.

## Overview

- Wraps Better Auth for session handling, JWT issuance, JWKS exposure, and provider integrations.
- Supports Discord OAuth as the only product sign-in method configured in
  `src/auth/better-auth.ts`.
- Exposes service-specific routes under `/auth/*` and delegates `/idp` and `/idp/*` directly to Better Auth's Web handler.
- Owns PostgreSQL and Redis clients through scoped Effect Layers and shuts them down with the process scope.

## Routes

- `/auth/verify` verifies the current session or bearer token and forwards user metadata through headers.
- `POST /auth/realtime-ticket` exchanges the current session for a 30-second,
  origin-bound, single-use WebSocket ticket. Ticket verification atomically
  consumes its SHA-256 Redis lookup and never falls back to JWT verification.
- `/auth/@me/scopes` returns Discord access scopes for the current user.
- `/auth/idp-token` returns a provider token for a specific user.
- `/idp/*` is handled directly by Better Auth.

## Development

Run commands from the monorepo root:

```bash
bun run db:auth:migrate:dev
bun run --filter=@lootlog/auth dev
```

## Key Scripts

- `bun run --filter=@lootlog/auth build`
- `bun run --filter=@lootlog/auth start`
- `bun run db:auth:generate`
- `bun run db:auth:migrate:dev`
- `bun run db:auth:migrate:init`
- `bun run db:auth:migrate:deploy`
- `bun run db:auth:studio`

## Notes

- Database access is configured with Drizzle and PostgreSQL in `src/database/drizzle.ts`.
- `db:migrate:dev` and `db:migrate:deploy` apply Drizzle migrations through the app migrator.
- The local migration runner preserves existing auth tables by initializing Drizzle migration tracking before applying pending migrations.
- Use `db:migrate:init` only when you need to initialize Drizzle migration tracking for an existing database that predates it.
- Observability is initialized at process startup in `src/instrumentation.ts`.
