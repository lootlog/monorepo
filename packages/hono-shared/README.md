# @lootlog/hono-shared

Shared Hono primitives, auth helpers, and permission utilities for backend
services in this monorepo.

## What lives here

- `createServiceApp`
- `createOpenApiServiceApp`
- `createSafeHttpInstrumentationMiddleware`
- `registerOpenApiDocs`
- `createRequestLoggingMiddleware`
- `AppError` and common HTTP error classes
- `createJsonErrorHandler`
- `closeNodeServer`
- `registerGracefulShutdown`
- `userMetadataFromHeaders`
- `validateToken`
- `canViewNpcTimer`

## Intended usage

- `src/index.ts`: bootstrap, serve, shutdown
- `src/app.ts`: app factory, middleware, routes, docs, error handling
- domain modules: route groups, schemas, services, stores
- `src/auth`: shared auth middleware and JWT validation
- `src/permissions.ts`: permission-related helpers and subpath exports
