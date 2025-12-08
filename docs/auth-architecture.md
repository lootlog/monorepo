# Authentication & Authorization Architecture

## Traefik Forward Auth

The API service runs behind Traefik with Forward Auth middleware. Authentication happens at the gateway level.

```
Client → Traefik → Forward Auth (Auth Service validates JWT) → API Service
```

Traefik injects headers after validation:
- `x-auth-discord-id`
- `x-auth-user-id`
- `x-auth-email`
- `x-auth-role`

## AuthGuard

Validates presence of auth headers (trusts Traefik validation):

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const discordId = request.headers['x-auth-discord-id'];
    const userId = request.headers['x-auth-user-id'];

    if (!discordId || !userId) {
      throw new UnauthorizedException();
    }

    request.userId = userId;
    request.discordId = discordId;
    return true;
  }
}
```

## PermissionsGuard

Checks guild-level permissions:

1. Gets required permissions from `@Permissions()` decorator
2. Checks Redis cache for `permissions:{userId}:{guildId}`
3. On cache miss, fetches from DB via `GuildsService.getGuildPermissions()`
4. Caches result for 300s
5. Attaches permissions, guild, roles, member to request

## Permission Resolution

Guild owner gets all permissions. Other members get union of their roles' permissions.

```typescript
const permissions = isOwner
  ? Object.values(Permission)
  : member.roles.flatMap(role => role.permissions);
```

## Controller Usage

```typescript
@Permissions(Permission.LOOTLOG_READ)
@UseGuards(AuthGuard, PermissionsGuard)
@Get('/guilds/:guildId/loots')
async fetchLoots(
  @GuildData() guild: Guild,
  @MemberPermissions() permissions: Permission[],
  @MemberRoles() roles: Role[],
) {
  // Guaranteed to have LOOTLOG_READ permission
}
```

## Permissions Enum

```typescript
enum Permission {
  OWNER                         // Full access
  ADMIN                         // Administrative access
  LOOTLOG_MANAGE                // Manage configs
  LOOTLOG_READ                  // Read loots/timers
  LOOTLOG_WRITE                 // Submit loots/timers
  LOOTLOG_READ_TIMERS_TITANS    // View Titan timers
  LOOTLOG_READ_LOOTS_TITANS     // View Titan loots
  LOOTLOG_READ_TIMERS_HEROES    // View Hero timers
  LOOTLOG_READ_LOOTS_HEROES     // View Hero loots
  // ... more
}
```
