# @lootlog/api-helpers

Shared auth and permission helpers for backend services.

## Overview

- Provides reusable helpers for validating Auth-issued JWTs.
- Keeps auth-adjacent and permission-related logic out of individual apps.
- Ships focused `auth` and `permissions` subpath exports.

## Exports

- `@lootlog/api-helpers/auth`
  - `validateToken`
  - JWT verification types from `verify-jwt.types`
- `@lootlog/api-helpers/permissions`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/api-helpers build
```

## Notes

- Public exports are defined as direct package subpaths.
- Token verification is implemented with `jose` and expects either a JWKS object or a remote JWKS URL.
