# @lootlog/api-helpers

Shared auth and permission helpers for backend services.

## Overview

- Provides reusable helpers for validating Auth-issued JWTs.
- Keeps auth-adjacent logic out of individual apps.
- Ships an additional `permissions` subpath export for permission-related helpers.

## Exports

- `@lootlog/api-helpers/auth/verify-jwt`
- `@lootlog/api-helpers/permissions`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/api-helpers build
```

## Notes

- Public exports are built directly from their implementation files.
- Token verification is implemented with `jose` and expects either a JWKS object or a remote JWKS URL.
