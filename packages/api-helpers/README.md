# @lootlog/api-helpers

Shared auth and request-context helpers for backend services.

## Overview

- Provides reusable helpers for validating Auth-issued JWTs and extracting user metadata from trusted headers.
- Supports the Hono services used in this monorepo and keeps auth-adjacent logic out of individual apps.
- Exposes permission-related helpers from the main package entrypoint.

## Exports

- `userMetadataFromHeaders`
- `validateToken`
- JWT verification types from `verify-jwt.types`
- `canViewNpcTimer`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/api-helpers build
```

## Notes

- Main exports are defined in `src/index.ts`.
- Token verification is implemented with `jose` and expects either a JWKS object or a remote JWKS URL.
