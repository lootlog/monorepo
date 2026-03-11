# @lootlog/nest-shared

Shared NestJS primitives used across backend services.

## Overview

- Centralizes common decorators, guards, and middleware used by multiple NestJS apps.
- Keeps cross-service auth and request metadata concerns in one workspace package.
- Reduces duplication between API, gateway, activity, and other Nest-based services.

## Exports

- `LoggerMiddleware`
- `AuthGuard`
- `DiscordId`
- `UserId`
- `GuildId`
- `RequiredPermissions`
- `REQUIRED_PERMISSIONS_KEY`

## Development

Run commands from the monorepo root:

```bash
pnpm --filter @lootlog/nest-shared build
```

## Notes

- Public exports are defined in `src/index.ts`.
- New shared NestJS primitives should be added here only when they are reused by more than one service.
