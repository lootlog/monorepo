# api-helpers

JWT authentication helpers and permission validation for microservices.

## Exports

**Authentication:**
- `validateToken()` - Verify JWT via JWKS URI or local keys
- `userMetadataFromHeaders` - Hono middleware for header extraction

**Permissions:**
- `canViewNpcTimer()` - Permission check for NPC timer visibility

## Usage

```typescript
import { validateToken, userMetadataFromHeaders } from '@lootlog/api-helpers';
import { canViewNpcTimer } from '@lootlog/api-helpers/permissions';
```

## Build

Uses pkgroll, exports both CommonJS and ESM.
