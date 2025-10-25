# API Helpers

Shared authentication utilities for validating JWT tokens across services.

## Overview

The API Helpers package provides reusable authentication and authorization utilities used by all backend services. It handles JWT validation using JWKS (JSON Web Key Set) from the Auth service.

## Features

- **JWT Validation** - Verify JWT tokens from Auth service
- **JWKS Integration** - Fetch and cache public keys
- **NestJS Guards** - Ready-to-use authentication guards
- **Hono Middleware** - Authentication middleware for Hono apps
- **Token Parsing** - Extract user claims from tokens
- **Type-Safe** - Full TypeScript support

## Usage

### NestJS Services (API, Battlelog, Discord Bot, Gateway)

```typescript
import { JwtAuthGuard } from '@lootlog/api-helpers';

@Controller('guilds')
@UseGuards(JwtAuthGuard)
export class GuildsController {
  @Get()
  findAll(@Request() req) {
    // req.user contains decoded JWT claims
    console.log(req.user.id);
  }
}
```

### Hono Services (Auth, Search)

```typescript
import { jwtMiddleware } from '@lootlog/api-helpers';

app.use('/api/*', jwtMiddleware());

app.get('/api/protected', (c) => {
  const user = c.get('user');
  return c.json({ userId: user.id });
});
```

## Exported Utilities

- `JwtAuthGuard` - NestJS guard for route protection
- `jwtMiddleware()` - Hono middleware for authentication
- `validateToken(token)` - Manual token validation
- `getJwks()` - Fetch JWKS from Auth service
- `extractUser(token)` - Extract user claims

## How It Works

1. Auth service generates JWT tokens signed with private key
2. Auth service exposes JWKS endpoint with public keys
3. API Helpers fetches and caches public keys
4. Services use API Helpers to validate incoming JWT tokens
5. User claims are extracted and made available to controllers

## Development

```bash
# From monorepo root
cd packages/api-helpers
pnpm build               # Build package

# Used by other services automatically via workspace:*
```

## Environment Variables

Services using this package need:
- `AUTH_SERVICE_URL` - URL to Auth service JWKS endpoint
