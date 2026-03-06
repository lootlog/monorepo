# Auth Service

Authentication service handling Discord OAuth, JWT tokens, internal token exchange, and JWKS endpoints.

## Tech Stack

- Hono (lightweight web framework)
- Better-Auth
- PostgreSQL on port 5432
- Kysely (type-safe SQL)
- Redis for session storage

## Commands

```bash
pnpm dev                # Start dev server
pnpm auth:migrate:dev   # Run migrations
pnpm auth:migrate:prod  # Production migrations
```

## Key Files

- `src/lib/auth.ts` - Better-Auth configuration with Discord OAuth and JWT plugins
- `src/auth/auth.controller.ts` - API endpoints (/verify, /@me/scopes, /internal/idp-token)
- `src/config/app.config.ts` - Zod-validated environment config

## API Endpoints

- `POST/GET /idp/**` - Better-Auth handler (OAuth, registration, login)
- `GET /auth/verify` - Verify session or Bearer token
- `GET /auth/@me/scopes` - Get Discord OAuth scopes
- `POST /auth/internal/idp-token` - Retrieve Discord access token for trusted internal services

## Auth Flow

JWT tokens now use shorter-lived expiry and other services validate them via JWKS. Browser traffic still flows through `/auth/verify`, which signs forwarded auth headers for downstream services.
