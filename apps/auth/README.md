# @lootlog/auth

NestJS-based authentication service for Lootlog.

## Overview

- Wraps Better Auth for session handling, JWT issuance, JWKS exposure, and provider integrations.
- Supports Discord OAuth as the only product sign-in method configured in
  `src/auth/better-auth.ts`.
- Exposes service-specific routes under `/auth/*` and delegates Better Auth handlers under `/idp/*` through Nest/Fastify.

## Routes

- `/auth/verify` verifies the current session or bearer token and forwards user metadata through headers.
- `/auth/@me/scopes` returns Discord access scopes for the current user.
- `/auth/idp-token` returns a provider token for a specific user.
- `/idp/*` is handled directly by Better Auth.

## Development

Run commands from the monorepo root:

```bash
pnpm db:auth:migrate:dev
pnpm --filter @lootlog/auth dev
```

## Key Scripts

- `pnpm --filter @lootlog/auth build`
- `pnpm --filter @lootlog/auth start`
- `pnpm db:auth:generate`
- `pnpm db:auth:migrate:dev`
- `pnpm db:auth:migrate:init`
- `pnpm db:auth:migrate:deploy`
- `pnpm db:auth:studio`

## Notes

- Database access is configured with Drizzle and PostgreSQL in `src/database/drizzle.ts`.
- `db:migrate:dev` and `db:migrate:deploy` apply Drizzle migrations through the app migrator.
- The local migration runner preserves existing auth tables by initializing Drizzle migration tracking before applying pending migrations.
- Use `db:migrate:init` only when you need to initialize Drizzle migration tracking for an existing database that predates it.
- Observability is initialized at process startup in `src/instrumentation.ts`.
