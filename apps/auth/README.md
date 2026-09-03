# @lootlog/auth

Bun and Effect-based authentication service for Lootlog.

## Overview

- Wraps Better Auth for session handling, JWT issuance, JWKS exposure, and provider integrations.
- Supports Discord OAuth as the only product sign-in method configured in
  `src/auth/provider/better-auth.ts`.
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
- `APP_URL` is the public auth-service root, for example
  `http://localhost/api/auth`. Better Auth is exposed below its `/idp` suffix;
  the HTTP boundary restores any public prefix removed by the reverse proxy
  before forwarding a request to Better Auth.

## Development

Run commands from the monorepo root:

```bash
bun run db:auth:migrate:dev
bun run --filter=@lootlog/auth dev
```

## Source layout

- `src/auth/provider` owns Better Auth and Discord OAuth configuration.
- `src/auth/storage` owns Redis-backed secondary storage and its fail-open policy.
- `src/auth/realtime` owns short-lived, single-use realtime tickets.
- `src/auth/auth-service.ts` is the application interface consumed by the HTTP adapter.
- `src/http-api/contracts`, `src/http`, and `src/database` remain explicit transport and persistence seams.

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
- `account.accountId` is the authoritative Discord account ID. `user.discordId`
  is the active Discord identity selected by the latest successful OAuth login;
  the internal `user.id` remains stable when another verified Discord account
  with the same email is linked.
- Only the verified Discord OAuth callback may update `user.discordId`. Public
  user updates cannot change it. Existing projections are repaired on the next
  successful login, never by a bulk heuristic.
- `db:migrate:dev` and `db:migrate:deploy` apply Drizzle migrations through the
  same fail-closed preflight as the production commands.
- Observability is initialized at process startup in `src/instrumentation.ts`.

## Better Auth 1.7 migration runbook

The committed policy is recorded in `better-auth-migration.json`. The migration
accepts only a fresh schema, the canonical Better Auth 1.6 schema, the exact
imported production 1.6 schema, or the canonical 1.7 schema. A partial or
unknown schema is blocked before migration tracking or application tables are
changed.

Run the read-only preflight first:

```bash
bun run --filter=@lootlog/auth auth:migrate:plan
```

The output contains only aggregate counts and schema diagnostics. A migratable
database reports `status: "ready"`; an already migrated database reports
`status: "up-to-date"`. Do not apply when the status is `blocked` or when any
integrity violation is present. For the production import captured during this
upgrade, the expected counts are 13,469 users, 13,479 accounts, and 82,208
sessions.

Before the production maintenance window:

1. Restore a recent production backup into an isolated PostgreSQL database.
2. Run `auth:migrate:plan`, apply with `auth:migrate:apply`, then run the plan
   again. It must report `better-auth-1.7`, `up-to-date`, no missing indexes,
   and unchanged stable IDs and account/session ownership.
3. Confirm known legacy timestamps still represent the same UTC instants.

During the maintenance window:

1. Stop every Better Auth 1.6 writer and keep traffic paused. Mixed 1.6/1.7
   writers are not supported.
2. Create and verify a restorable backup, then confirm the aggregate counts.
3. Run `auth:migrate:plan`, followed by:

   ```bash
   bun run --filter=@lootlog/auth auth:migrate:apply
   ```

4. Run the plan again and require `up-to-date`. Deploy all 1.7.2 instances
   together, smoke-test Discord login, account switching, JWT issuance, and
   provider-token lookup, then resume traffic.

Monitor aggregate `state_security_mismatch`, `account_not_linked`, account
ownership conflicts, and provider-token failures. An application rollback does
not run a down migration: the database remains the 1.7-compatible superset and
writers must not be restarted in a mixed-version state.
