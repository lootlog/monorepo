# nest-shared

Shared NestJS utilities for backend microservices.

## Exports

**Guards:**
- `AuthGuard` - Validates `x-auth-discord-id` and `x-auth-user-id` headers

**Decorators:**
- `@UserId()` - Extract user ID from request
- `@DiscordId()` - Extract Discord ID from request
- `@GuildId()` - Extract guild ID from URL params
- `@RequiredPermissions()` - Mark required permissions on handlers

**Middleware:**
- `LoggerMiddleware` - Winston HTTP request/response logging

## Usage

```typescript
import { AuthGuard, UserId, DiscordId, GuildId } from '@lootlog/nest-shared';

@UseGuards(AuthGuard)
@Get('guilds/:guildId')
async getGuild(@GuildId() guildId: string, @UserId() userId: string) {}
```

## Notes

No build step required - compiles with consuming app via direct TypeScript imports.
