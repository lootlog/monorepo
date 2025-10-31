# API Service - Architecture & Documentation

**Version**: 1.0.0
**Framework**: NestJS 11 with Fastify
**Database**: PostgreSQL 17 with Prisma ORM
**Last Updated**: 2025-10-31

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Module Structure](#module-structure)
4. [Authentication & Authorization](#authentication--authorization)
5. [Database Access Patterns](#database-access-patterns)
6. [Caching Strategy](#caching-strategy)
7. [Inter-Service Communication](#inter-service-communication)
8. [API Endpoints](#api-endpoints)
9. [Best Practices](#best-practices)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

---

## Overview

The **API Service** is the core backend service for the Lootlog application. It manages:

- **Guilds**: Discord server configurations and settings
- **Members**: Guild member management with role-based permissions
- **Roles**: Custom roles with granular permissions
- **Loots**: Game loot tracking and submissions
- **Timers**: Boss/NPC respawn timers with world tracking
- **Players**: Player statistics and indexing
- **NPCs**: NPC data and categorization
- **Notifications**: In-app notifications system
- **User Preferences**: User settings and configurations

### Technology Stack

- **Runtime**: Node.js >= 20
- **Framework**: NestJS 11 with Fastify adapter
- **ORM**: Prisma 6.18.0
- **Database**: PostgreSQL 17 (port 5433)
- **Cache**: Redis with ioredis
- **Message Queue**: RabbitMQ 4 (AMQP)
- **Validation**: class-validator + class-transformer
- **Logging**: Winston with Axiom integration
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         External Clients                        │
│                    (Web, Game Client, Mobile)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                         API Service (NestJS)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Guards     │  │ Interceptors │  │  Middleware  │         │
│  │  - AuthGuard │  │  - MemberSync│  │  - Logger    │         │
│  │  - Permissions│  │  - Serializer│  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Guilds     │  │    Loots     │  │   Timers     │         │
│  │   Module     │  │    Module    │  │   Module     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐         │
│  │   Members    │  │    Roles     │  │    NPCs      │         │
│  │   Module     │  │    Module    │  │   Module     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Shared Services                        │  │
│  │  - PrismaService  - RedisService  - AuthService         │  │
│  │  - DiscordService - RabbitMQ      - LoggerService       │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────┬──────────────────────┬─────────┘
         │                      │                      │
    ┌────▼────┐            ┌────▼─────┐          ┌────▼────┐
    │PostgreSQL│           │  Redis   │          │RabbitMQ │
    │  (5433) │            │  (6379)  │          │ (5672)  │
    └─────────┘            └──────────┘          └─────────┘
         │                                             │
         │                                             │ Publish Events
    ┌────▼──────────────────────────────────────────▼─────┐
    │           External Services                          │
    │  - Auth Service (JWT/Discord OAuth)                  │
    │  - Discord Bot (consumes events)                     │
    │  - Search Service (Meilisearch indexing)             │
    │  - Gateway (Socket.IO real-time updates)             │
    └──────────────────────────────────────────────────────┘
```

### Request Flow

```
1. Client Request
   ↓
2. LoggerMiddleware (logs request start)
   ↓
3. AuthGuard (validates x-auth-discord-id, x-auth-user-id headers)
   ↓
4. PermissionsGuard (checks guild permissions from DB/cache)
   ↓
5. ValidationPipe (validates DTO with class-validator)
   ↓
6. Controller Method
   ↓
7. Service Layer (business logic)
   ↓
8. PrismaService / Redis / External APIs
   ↓
9. ClassSerializerInterceptor (serializes response)
   ↓
10. Response to Client
```

---

## Module Structure

### Core Modules

#### 1. **Guilds Module** (`src/guilds/`)

**Purpose**: Manages Discord guild (server) data and configurations.

**Key Files**:
- `guilds.service.ts` (558 lines) - Core business logic
- `guilds.controller.ts` - REST API endpoints
- `guilds-internal.controller.ts` - Internal service-to-service endpoints
- `guilds.module.ts` - Module configuration

**Responsibilities**:
- CRUD operations for guilds
- Permission resolution for users
- Vanity URL management
- Guild configuration (loot filters, timer settings)

**Database Tables**:
- `Guild` (id, name, icon, ownerId, vanityUrl, active)

**Dependencies**:
- `MembersService` (circular - uses forwardRef)
- `RolesService`
- `LootlogConfigService` (circular - uses forwardRef)
- `DiscordService`
- `UsersService` (circular - uses forwardRef)

**Caching**:
- Guild data: 300s (prod) / 10s (local)
- Permissions: 300s with pattern-based invalidation

**Key Methods**:
```typescript
// Get all guilds for a user
async getUserGuilds(discordId: string, userId: string, source?: string): Promise<Guild[]>

// Get guild by ID or vanity URL with caching
async getGuildById(idOrVanityURL: string): Promise<Guild>

// Get user's permissions for a guild
async getGuildPermissions(options: {
  discordId: string;
  userId: string;
  guildId: string;
}): Promise<{ permissions: Permission[]; guild: Guild; roles: Role[]; member: Member }>
```

**API Endpoints**:
```
GET    /guilds/@me                  - Get user's guilds
GET    /guilds/@me/permissions      - Get guilds with permissions
GET    /guilds/@me/manageable       - Get guilds user can manage
GET    /guilds/:guildId             - Get guild by ID
PATCH  /guilds/:guildId/config      - Update guild config
GET    /guilds/:guildId/config      - Get guild config
GET    /guilds/:guildId/worlds      - Get worlds with timers
GET    /guilds/:guildId/permissions - Get user's permissions
```

#### 2. **Members Module** (`src/members/`)

**Purpose**: Manages guild members and their data synchronization with Discord.

**Key Files**:
- `members.service.ts` (500 lines)
- `members.controller.ts`

**Responsibilities**:
- Member CRUD operations
- Discord API synchronization
- Stale data handling
- Bulk refresh jobs (rate-limited)

**Database Tables**:
- `Member` (id, userId, guildId, type, name, avatar, banner, active, globalUserId)
- `MemberRefreshJob` (id, guildId, requestedBy, status, totalMembers, processedMembers)

**Caching Strategy**:
```typescript
// Two-tier caching:
// 1. Standard cache: 5 minutes (production) / 1 minute (local)
// 2. Refresh cache: 30 seconds (used when refresh=true)
// 3. Stale cache: 5 minutes (fallback on errors)

const cacheTtl = refresh
  ? getRefreshPermissionsTtl(env)  // 30s
  : getMemberCacheTtl(env);        // 300s
```

**Stale Data Handling**:
When Discord API fails or is unavailable:
1. Returns cached member data with `isStale: true` flag
2. Sets `staleWarning` message for client
3. Deactivates members on 404 or 401 errors

**Key Methods**:
```typescript
// Get member with caching and fallback logic
async getGuildMemberById(options: {
  discordId: string;
  guildId: string;
  userId: string;
  refresh?: boolean;
  standalone?: boolean;
  skipTtlCheck?: boolean;
}): Promise<MemberWithRoles | null>

// Create bulk refresh job (rate-limited)
async createBulkRefreshJob(guildId: string, requestedBy: string): Promise<MemberRefreshJob>
```

**API Endpoints**:
```
GET    /guilds/:guildId/members              - Get all members
GET    /guilds/:guildId/members/@me/refresh  - Refresh current user
POST   /guilds/:guildId/members/refresh      - Bulk refresh (admin)
GET    /guilds/:guildId/members/refresh/latest - Get latest job
PATCH  /guilds/:guildId/members/:memberId/deactivate - Deactivate member
```

#### 3. **Loots Module** (`src/loots/`)

**Purpose**: Tracks game loot drops from bosses/NPCs.

**Key Files**:
- `loots.service.ts` (732 lines)
- `loots.controller.ts`
- `dto/create-loot.dto.ts` - Complex nested validation

**Responsibilities**:
- Loot submission from game client
- Loot filtering based on guild configs
- Loot share tracking (Colossus loot distribution)
- Comments on loots
- Pagination with cursor-based approach

**Database Tables**:
- `Loot` (id, uniqueId, items, world, source, location, players, npcs, lootShare)
- `LootSubmission` (id, lootId, guildId, memberId) - Junction table
- `LootComment` (id, lootId, memberId, guildId, content)

**Unique Loot ID**:
```typescript
// Deterministic hash based on loot items + world
createUniqueLootId(loots: CreateLootDto['loots'], world: string): string {
  const string = [...loots]
    .sort((a, b) => a.hid.localeCompare(b.hid))
    .map((loot) => loot.hid)
    .join('') + world;
  return createHash('sha256').update(string).digest('hex');
}
```

**Guild Config Filtering**:
```typescript
// Each guild has LootlogConfig that specifies:
// - Which NPC types to track (HERO, TITAN, COLOSSUS, etc.)
// - Which rarities to accept (UNIQUE, HEROIC, LEGENDARY, UPGRADED)

// Example: Guild only wants LEGENDARY+ items from TITAN bosses
{
  npcs: [
    {
      npcType: "TITAN",
      allowedRarities: ["LEGENDARY", "UPGRADED"]
    }
  ]
}
```

**Loot Share Parsing**:
```typescript
// For Colossus kills, parses loot distribution message:
// "Player1: item1, item2\nPlayer2: item3"

const LOOT_SHARE_MSG_REGEX = /([^:]+):\s*([^\n]+)/g;
const LOOT_SHARE_ITEM_REGEX = /([a-z0-9]+)/gi;

// Maps to: { playerId: [itemHid1, itemHid2] }
```

**Complex Query Example**:
```typescript
// Raw SQL with Prisma for performance
// Filters loots by: guild, world, NPCs, players, rarities, level ranges
const loots = await this.prisma.$queryRaw<LootQueryResult[]>(Prisma.sql`
  SELECT DISTINCT ON (l."id") l.*,
    (SELECT COUNT(*) FROM "LootComment" lc
     WHERE lc."lootId" = l."id" AND lc."guildId" = ${guild.id})
    AS "commentsCount"
  FROM "Loot" l
  INNER JOIN "LootSubmission" s ON s."lootId" = l."id"
  WHERE s."guildId" = ${guild.id}
    AND l."world" = ${world}
    ${playersCondition}
    ${npcsCondition}
    ${npcTypesCondition}
    ${raritiesCondition}
    ${cursorCondition}
    ${levelRangesCondition}
  ORDER BY l."id" DESC
  LIMIT ${limit};
`);
```

**API Endpoints**:
```
GET    /guilds/:guildId/loots              - Fetch loots with filters
POST   /loots                              - Submit loot from game
GET    /guilds/:guildId/loots/:lootId/comments - Get comments
POST   /guilds/:guildId/loots/:lootId/comments - Add comment
DELETE /guilds/:guildId/loots/:lootId     - Delete loot (admin)
PATCH  /loots/:id                          - Update loot share
```

#### 4. **Timers Module** (`src/timers/`)

**Purpose**: Manages boss/NPC respawn timers with world tracking.

**Key Files**:
- `timers.service.ts` (562 lines)
- `timers.controller.ts`
- `utils/validate-spawn-times.ts`

**Responsibilities**:
- Timer creation from game client
- Manual timer creation
- Timer reset
- Timer deletion
- Distributed locking (Redis) to prevent race conditions
- Deduplication within 10-second window

**Database Tables**:
- `Timer` (composite PK: guildId, world, npcId)

**Composite Primary Key**:
```prisma
model Timer {
  createdById             Int
  guildId                 String
  npcId                   Int
  world                   String
  minSpawnTime            DateTime
  maxSpawnTime            DateTime
  latestRespBaseSeconds   Int
  latestRespawnRandomness Int
  wasReset                Boolean  @default(false)

  @@id(name: "timerId", [guildId, world, npcId])
}
```

**Distributed Locking**:
```typescript
// Three-layer protection against race conditions:

// 1. Deduplication lock (10s)
const dedupKey = `timer:dedup:${userId}:${npcId}:${world}:${guildId}`;
const dedupLockKey = `${dedupKey}:lock`;

// 2. Timer creation lock (5s)
const lockKey = `timer:lock:${guildId}:${world}:${npcId}`;

// 3. Cache result for 10s to prevent duplicate submissions
await redis.set(dedupKey, JSON.stringify(timer), 10);
```

**Respawn Calculation**:
```typescript
// Calculates min/max spawn times with randomness
calculateRespawnTime(
  respBaseSeconds: number,
  respawnRandomness = 10,  // Default 10% variance
  now: Date
) {
  const respMs = respBaseSeconds * 1000;
  const multiplier = respawnRandomness / 100;
  const variance = Math.round(respMs * multiplier);

  return {
    minSpawnTime: new Date(now.getTime() + respMs - variance),
    maxSpawnTime: new Date(now.getTime() + respMs + variance),
  };
}

// Example: Boss with 3600s respawn, 10% randomness
// minSpawnTime = now + 3600s - 360s = now + 3240s (54 min)
// maxSpawnTime = now + 3600s + 360s = now + 3960s (66 min)
```

**Timer Filtering by Permissions**:
```typescript
// Users with LOOTLOG_READ_TIMERS_TITANS can see Titan timers
// Users with LOOTLOG_READ_TIMERS_HEROES can see Hero timers
// Users with lvlRange [100, 200] only see timers for NPCs lvl 100-200

filterTimersByPermissions(
  timers: Timer[],
  administrativeUser: boolean,
  roles: Role[]
): Timer[] {
  if (administrativeUser) return timers;

  return timers.filter((timer) => {
    const npc = parseNpc(timer.npc);
    return canViewNpcTimer(npc, roles);
  });
}
```

**API Endpoints**:
```
POST   /guilds/:guildId/timers           - Create timer from game
POST   /guilds/:guildId/timers/manual    - Create manual timer
GET    /guilds/:guildId/timers           - Get guild timers
GET    /timers                           - Get all user timers
PATCH  /guilds/:guildId/timers/:npcId/reset - Reset timer
DELETE /guilds/:guildId/timers/:npcId   - Delete timer
GET    /guilds/:guildId/timers/search   - Search NPCs with timer data
```

#### 5. **Roles Module** (`src/roles/`)

**Purpose**: Custom role management with granular permissions.

**Key Features**:
- 13 granular permissions (OWNER, ADMIN, LOOTLOG_MANAGE, etc.)
- Level range filtering (e.g., role sees loots from NPCs lvl 100-200)
- Role hierarchy by position
- Bulk operations for role sync

**Permissions Enum**:
```typescript
enum Permission {
  OWNER                         // Full access
  ADMIN                         // Administrative access
  LOOTLOG_MANAGE                // Manage loot configs
  LOOTLOG_READ                  // Read loots/timers
  LOOTLOG_WRITE                 // Submit loots/timers
  LOOTLOG_READ_TIMERS_TITANS    // View Titan timers
  LOOTLOG_READ_LOOTS_TITANS     // View Titan loots
  LOOTLOG_READ_TIMERS_HEROES    // View Hero timers
  LOOTLOG_READ_LOOTS_HEROES     // View Hero loots
  LOOTLOG_CHAT_READ             // Read guild chat
  LOOTLOG_CHAT_WRITE            // Send guild messages
  LOOTLOG_NOTIFICATIONS_SEND    // Send notifications
  LOOTLOG_NOTIFICATIONS_READ    // Read notifications
}
```

**Level Range Filtering**:
```typescript
// Role can restrict visibility by NPC level
model Role {
  lvlRangeFrom  Int?  @default(0)
  lvlRangeTo    Int?  @default(500)
}

// Used in SQL queries to filter loots/timers
WHERE (npc->>'lvl')::int >= role.lvlRangeFrom
  AND (npc->>'lvl')::int <= role.lvlRangeTo
```

### Supporting Modules

#### 6. **Discord Module** (`src/discord/`)

**Purpose**: Integrates with Discord REST API.

**Key Features**:
- OAuth2 token management via Auth Service
- Rate limiting with Redis
- Distributed locking (Redlock) for concurrent requests
- Stale data fallback on rate limits
- Required scopes validation

**Rate Limiting**:
```typescript
// Prevents hammering Discord API
private async checkRateLimitForUser(userId: string, resource: string): Promise<boolean>

// Sets rate limit from Discord's Retry-After header
private async setRateLimitForUser(userId: string, resource: string, retryAfter: number)
```

**Redlock Pattern**:
```typescript
// Ensures only one request per resource at a time
const lock = await this.redlock.acquire([lockKey], 6000);
try {
  // Make Discord API request
} finally {
  await lock.release();
}
```

**Stale Data Strategy**:
```typescript
// Three-tier caching:
// 1. Fresh data: cached for TTL (10s local / 300s prod)
// 2. Stale data: cached for 300s, returned on rate limits
// 3. Error cache: empty result cached for 60s on errors
```

#### 7. **Auth Module** (`src/auth/`)

**Purpose**: Integrates with Auth Service for token management.

**Key Features**:
- Fetches Discord OAuth tokens from Auth Service
- Validates token scopes
- Caches tokens in Redis
- Error handling for expired/invalid tokens

**Token Flow**:
```
1. API needs Discord token for user
   ↓
2. AuthService.getIdpToken(userId)
   ↓
3. Check Redis cache
   ↓
4. If miss, POST to Auth Service /auth/idp-token
   ↓
5. Validate required scopes
   ↓
6. Cache token for 300s
   ↓
7. Return token to caller
```

**Required Scopes**:
```typescript
private readonly requiredScopes = [
  'guilds.members.read',
  'guilds',
  'identify',
  'email',
];
```

#### 8. **Users Module** (`src/users/`)

**Purpose**: User preferences and settings.

**Database Tables**:
- `UserSettings` (userId, guildsOrder, theme, colorMode)
- `UserCharactersLootlogSettings` (userId, accountId, characterId, collectLootWhitelistGuildIds, addTimersWhitelistGuildIds)

**Guild Ordering**:
```typescript
// Users can customize guild display order
model UserSettings {
  guildsOrder  String[]  @default([])  // Array of guild IDs
}
```

---

## Authentication & Authorization

### Traefik Forward Auth Architecture

The API service operates behind **Traefik** reverse proxy with **Forward Auth middleware**. This is a standard microservices pattern where authentication is centralized at the API gateway level.

#### Architecture Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP Request with JWT/Cookie
       │
┌──────▼────────────────────────────────────────────────┐
│                    Traefik                             │
│  ┌──────────────────────────────────────────────┐     │
│  │         Forward Auth Middleware              │     │
│  │                                               │     │
│  │  1. Extract JWT/Cookie from request          │     │
│  │  2. Send to Auth Service for validation      │     │
│  │  3. Auth Service validates JWT/session       │     │
│  │  4. Returns user info (discordId, userId)    │     │
│  │  5. Traefik injects headers:                 │     │
│  │     - x-auth-discord-id                      │     │
│  │     - x-auth-user-id                         │     │
│  └──────────────────────────────────────────────┘     │
└──────┬────────────────────────────────────────────────┘
       │ Request with validated headers
       │
┌──────▼──────────────────────────────────────┐
│             API Service (NestJS)            │
│  ┌────────────────────────────────────┐     │
│  │       AuthGuard                    │     │
│  │  - Validates presence of headers   │     │
│  │  - Trusts headers from Traefik     │     │
│  │  - No JWT validation needed        │     │
│  └────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```

#### AuthGuard Implementation

```typescript
// AuthGuard - src/shared/guards/auth.guard.ts
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

**Why This Is Secure**:
1. ✅ API service is **not exposed directly** to the internet
2. ✅ All requests **must go through Traefik**
3. ✅ Traefik validates JWT/cookies via Auth Service
4. ✅ Only authenticated requests reach the API service
5. ✅ Network policies prevent direct access to API service

**Security Requirements**:
- API service must **not** be accessible except through Traefik
- Network policies/firewall rules must enforce this
- Traefik must be properly configured with Forward Auth
- Auth Service must properly validate JWTs/sessions

#### Traefik Configuration Example

Traefik handles multiple security concerns at the gateway level:

```yaml
# traefik/dynamic/middlewares.yml
http:
  middlewares:
    # Forward Authentication
    auth-forward:
      forwardAuth:
        address: "http://auth-service:3000/auth/verify"
        authResponseHeaders:
          - "x-auth-discord-id"
          - "x-auth-user-id"
          - "x-auth-email"
          - "x-auth-role"
        trustForwardHeader: false

    # CORS Configuration
    cors-headers:
      headers:
        accessControlAllowOriginList:
          - "https://lootlog.com"
          - "https://app.lootlog.com"
          - "https://*.lootlog.com"
        accessControlAllowMethods:
          - "GET"
          - "POST"
          - "PUT"
          - "PATCH"
          - "DELETE"
          - "OPTIONS"
        accessControlAllowHeaders:
          - "Content-Type"
          - "Authorization"
        accessControlAllowCredentials: true
        accessControlMaxAge: 3600

    # Rate Limiting
    rate-limit:
      rateLimit:
        average: 100        # Average requests per second
        burst: 200          # Burst capacity
        period: 1m          # Time window

    # Stricter rate limit for sensitive endpoints
    rate-limit-strict:
      rateLimit:
        average: 10
        burst: 20
        period: 1m

# traefik/dynamic/routers.yml
http:
  routers:
    api-service:
      rule: "Host(`api.lootlog.com`)"
      service: api-service
      middlewares:
        - auth-forward      # Authentication
        - cors-headers      # CORS
        - rate-limit        # Rate limiting
      tls:
        certResolver: letsencrypt

    # Example: Stricter rate limit for sensitive endpoint
    api-service-bulk-refresh:
      rule: "Host(`api.lootlog.com`) && PathPrefix(`/guilds/{guildId}/members/refresh`)"
      service: api-service
      middlewares:
        - auth-forward
        - cors-headers
        - rate-limit-strict  # Stricter limits
      priority: 100           # Higher priority than general rule
      tls:
        certResolver: letsencrypt
```

**Benefits of Gateway-Level Security**:
1. ✅ Single point of configuration
2. ✅ Consistent security across all services
3. ✅ No code changes needed in services
4. ✅ Easier to audit and maintain
5. ✅ Better performance (handled at edge)

#### Optional: Additional Security Layer

For defense in depth, you can optionally validate that requests come from Traefik:

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Optional: Validate request comes from Traefik
    const forwardedFor = request.headers['x-forwarded-for'];
    const traefikIp = this.configService.get('TRAEFIK_IP');

    if (traefikIp && !this.isFromTraefik(forwardedFor, traefikIp)) {
      throw new UnauthorizedException('Direct access not allowed');
    }

    const discordId = request.headers['x-auth-discord-id'];
    const userId = request.headers['x-auth-user-id'];

    if (!discordId || !userId) {
      throw new UnauthorizedException();
    }

    request.userId = userId;
    request.discordId = discordId;

    return true;
  }

  private isFromTraefik(forwardedFor: string, traefikIp: string): boolean {
    // Validate X-Forwarded-For header
    return forwardedFor?.includes(traefikIp);
  }
}
```

### Authorization Flow

```typescript
// PermissionsGuard - src/shared/permissions/permissions.guard.ts
@Injectable()
export class PermissionsGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;  // No permissions required
    }

    // 2. Extract user and guild from request
    const { userId, discordId, params: { guildId } } = request;

    // 3. Check Redis cache for permissions
    const cacheKey = getPermissionsCacheKey(userId, guildId);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      const data = JSON.parse(cached);
      const hasPermission = requiredPermissions.some(p =>
        data.permissions.includes(p)
      );
      return hasPermission;
    }

    // 4. Fetch from database
    const { permissions, guild, roles, member } =
      await this.guildsService.getGuildPermissions({
        discordId, userId, guildId
      });

    // 5. Check permission
    const hasPermission = requiredPermissions.some(p =>
      permissions.includes(p)
    );

    // 6. Cache for 300s
    await this.redisService.set(cacheKey, JSON.stringify({
      permissions, guild, roles, member
    }), 300);

    // 7. Attach to request for use in controller
    request.permissions = permissions;
    request.guild = guild;
    request.roles = roles;
    request.member = member;

    return hasPermission;
  }
}
```

### Permission Resolution

```typescript
// GuildsService.getGuildPermissions
async getGuildPermissions(options: {
  discordId: string;
  userId: string;
  guildId: string;
}) {
  const guild = await this.getGuildByIdInternal(guildId);
  const member = await this.membersService.getGuildMemberById({
    userId, discordId, guildId: guild.id
  });

  if (!member || !member.active) {
    throw new ForbiddenException();
  }

  // Guild owner has ALL permissions
  const isOwner = guild.ownerId === discordId;

  const permissions = isOwner
    ? Object.values(Permission)  // All permissions
    : member.roles.reduce((acc, role) => {
        return acc.concat(role.permissions);
      }, []);

  const uniquePermissions = Array.from(new Set(permissions));

  return { permissions: uniquePermissions, guild, roles: member.roles, member };
}
```

### Usage in Controllers

```typescript
@Permissions(Permission.LOOTLOG_READ)
@UseGuards(AuthGuard, PermissionsGuard)
@Get('/guilds/:guildId/loots')
async fetchLoots(
  @GuildData() guild: Guild,           // Injected by PermissionsGuard
  @MemberPermissions() permissions: Permission[],
  @MemberRoles() roles: Role[],
  @DiscordId() discordId: string,      // From AuthGuard
  @UserId() userId: string,
) {
  // Controller logic with guaranteed permissions
}
```

---

## Database Access Patterns

### Prisma ORM

**Configuration**:
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRESQL_CONNECTION_URI")
}
```

**Connection**:
```typescript
// PrismaService - src/db/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Query Patterns

#### 1. **Simple CRUD**

```typescript
// Create
const guild = await this.prisma.guild.create({
  data: {
    id: guildId,
    name: 'Guild Name',
    ownerId: discordId,
  },
});

// Read
const guild = await this.prisma.guild.findUnique({
  where: { id: guildId },
});

// Update
await this.prisma.guild.update({
  where: { id: guildId },
  data: { name: 'New Name' },
});

// Delete (soft)
await this.prisma.guild.update({
  where: { id: guildId },
  data: { active: false },
});
```

#### 2. **Relations & Includes**

```typescript
// Include related data
const timer = await this.prisma.timer.findUnique({
  where: { timerId: { guildId, world, npcId } },
  include: {
    member: true,  // Join with Member table
    guild: true,
  },
});

// Select specific fields
const roles = await this.prisma.role.findMany({
  where: { guildId },
  select: {
    id: true,
    name: true,
    permissions: true,
  },
});
```

#### 3. **Upsert Pattern**

```typescript
// Create or update
const member = await this.prisma.member.upsert({
  where: { memberId: { userId: discordId, guildId } },
  update: {
    name: 'Updated Name',
    avatar: 'new-avatar-url',
    active: true,
  },
  create: {
    userId: discordId,
    guild: { connect: { id: guildId } },
    name: 'New Member',
    active: true,
  },
  include: { roles: true },
});
```

#### 4. **Transactions**

```typescript
// Multiple operations as atomic unit
await this.prisma.$transaction(async (tx) => {
  await tx.lootlogConfigNpc.deleteMany({
    where: { lootlogConfigId: guildId },
  });

  await tx.lootlogConfig.deleteMany({
    where: { id: guildId },
  });

  await tx.guild.update({
    where: { id: guildId },
    data: { active: false },
  });
});
```

#### 5. **Raw SQL Queries**

```typescript
// For complex queries with dynamic conditions
const loots = await this.prisma.$queryRaw<LootQueryResult[]>(Prisma.sql`
  SELECT DISTINCT ON (l."id") l.*,
    (SELECT COUNT(*) FROM "LootComment" lc
     WHERE lc."lootId" = l."id" AND lc."guildId" = ${guild.id})
    AS "commentsCount"
  FROM "Loot" l
  INNER JOIN "LootSubmission" s ON s."lootId" = l."id"
  WHERE s."guildId" = ${guild.id}
    AND l."world" = ${world}
    ${Prisma.raw(additionalConditions)}
  ORDER BY l."id" DESC
  LIMIT ${limit};
`);
```

**⚠️ Security**: Always use `Prisma.sql` with template literals for parameterization. Never use `Prisma.raw` with user input.

### Indexing Strategy

```prisma
// Composite indexes for common queries
model Timer {
  @@id(name: "timerId", [guildId, world, npcId])
  @@index([npcId, guildId])
  @@index([guildId, maxSpawnTime])
  @@index([world, guildId])
  @@index([createdById])
}

model Member {
  @@unique(name: "memberId", [userId, guildId])
  @@index([id, guildId])
}

model Role {
  @@unique([id, guildId])
  @@index([id, guildId])
}
```

---

## Caching Strategy

### Redis Configuration

```typescript
// RedisModule - src/lib/redis/redis.module.ts
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const config = configService.get<RedisConfig>('redis');
        return new Redis({
          host: config.host,
          port: config.port,
          password: config.password,
          username: config.username,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => Math.min(times * 50, 2000),
        });
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [RedisService, REDIS_CLIENT],
})
export class RedisModule {}
```

### Caching Patterns

#### 1. **Simple Key-Value Cache**

```typescript
// Cache guild data
const cacheKey = `guild:${guildId}`;
const cached = await this.redisService.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
await this.redisService.set(cacheKey, JSON.stringify(guild), 300); // 5 minutes

return guild;
```

#### 2. **Pattern-Based Invalidation**

```typescript
// Invalidate all permission caches for a guild
await this.redisService.deleteByPattern(`permissions:*:${guildId}`);

// RedisService.deleteByPattern implementation
async deleteByPattern(pattern: string): Promise<number> {
  const keys = await this.client.keys(pattern);
  if (keys.length === 0) return 0;

  return await this.client.del(...keys);
}
```

#### 3. **SetNX for Distributed Locking**

```typescript
// Atomic set if not exists
const lockKey = `timer:lock:${guildId}:${world}:${npcId}`;
const lockValue = randomUUID();
const acquired = await this.redis.setNX(lockKey, lockValue, 5); // 5 seconds

if (!acquired) {
  throw new ConflictException('Resource locked');
}

try {
  // Critical section
} finally {
  // Release lock only if we own it
  const currentValue = await this.redis.get(lockKey);
  if (currentValue === lockValue) {
    await this.redis.del(lockKey);
  }
}
```

#### 4. **Redlock for Distributed Locking**

```typescript
// Redlock - more robust for distributed systems
const lock = await this.redlock.acquire([lockKey], 6000);

try {
  // Critical section
  await performOperation();
} finally {
  await lock.release();
}
```

### Cache Keys Convention

```typescript
// Consistent naming for cache keys
export const getGuildCacheKey = (guildId: string) => `guild:${guildId}`;
export const getPermissionsCacheKey = (userId: string, guildId: string) =>
  `permissions:${userId}:${guildId}`;
export const getMemberCacheKey = (discordId: string, guildId: string) =>
  `member:${discordId}:${guildId}`;
export const getAuthTokenCacheKey = (userId: string) => `auth:token:${userId}`;
export const getUserLootlogConfigCacheKey = (userId: string, accountId: string, characterId: string) =>
  `user:${userId}:lootlog-config:${accountId}:${characterId}`;
```

### Cache TTLs

```typescript
// Environment-based TTLs
export const GUILD_CACHE_TTL_SECONDS = 300;              // 5 minutes
export const PERMISSIONS_CACHE_TTL_SECONDS = 300;        // 5 minutes
export const AUTH_TOKEN_CACHE_TTL_SECONDS = 300;         // 5 minutes
export const MEMBER_CACHE_TTL_SECONDS_PROD = 300;        // 5 minutes
export const MEMBER_CACHE_TTL_SECONDS_LOCAL = 60;        // 1 minute
export const MEMBER_CACHE_SOFT_TTL = 3 * 60 * 1000;      // 3 minutes (stale check)
```

---

## Inter-Service Communication

### RabbitMQ Events

**Configuration**:
```typescript
// rabbitmq.config.ts
export const DEFAULT_EXCHANGE_NAME = 'lootlog.topic';

export default registerAs('rabbitmq', () => ({
  uri: process.env.RABBITMQ_URI,
  exchanges: [
    {
      name: DEFAULT_EXCHANGE_NAME,
      type: 'topic',
    },
  ],
}));
```

**Routing Keys**:
```typescript
enum RoutingKey {
  GUILDS_TIMERS_UPDATE = 'guilds.timers.update',
  GUILDS_TIMERS_DELETE = 'guilds.timers.delete',
  GUILDS_MEMBERS_UPDATE = 'guilds.members.update',
  GUILDS_MEMBERS_REFRESH = 'guilds.members.refresh',
  GUILDS_MEMBERS_BULK_REFRESH = 'guilds.members.bulk-refresh',
}
```

**Publishing Events**:
```typescript
// Publish timer update
await this.amqpConnection.publish(
  DEFAULT_EXCHANGE_NAME,
  RoutingKey.GUILDS_TIMERS_UPDATE,
  {
    guildId: timer.guildId,
    world: timer.world,
    npcId: timer.npcId,
    minSpawnTime: timer.minSpawnTime,
    maxSpawnTime: timer.maxSpawnTime,
  }
);
```

**Who Consumes Events**:
- **Discord Bot**: Listens to timer updates to sync Discord slash commands
- **Gateway Service**: Listens to all events to broadcast via Socket.IO
- **Search Service**: Listens to loot/player/NPC updates for Meilisearch indexing

### HTTP Integration

#### Auth Service Integration

```typescript
// AuthService.getIdpToken
async getIdpToken(userId: string): Promise<{ accessToken: string; scopes: string[] }> {
  const url = `${this.authServiceUrl}/auth/idp-token`;
  const response = await this.httpService.post(url, { userId }).toPromise();

  if ('error' in response.data) {
    throw new TokenExpiredError();
  }

  return response.data;
}
```

#### Discord API Integration

```typescript
// DiscordService.getUserGuilds
async getUserGuilds(userId: string): Promise<APIGuild[]> {
  const rest = await this.getRestClient(userId);  // Gets token from Auth Service
  const guilds = await rest.get(Routes.userGuilds()) as APIGuild[];
  return guilds;
}
```

---

## API Endpoints

### Swagger Documentation

Available at: `http://localhost:4003/api/docs`

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Lootlog API')
  .setDescription('The Lootlog API documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Endpoint Summary

#### Guilds
```
GET    /guilds/@me                           - Get user guilds
GET    /guilds/@me/permissions                - Get guilds with permissions
GET    /guilds/@me/manageable                 - Get manageable guilds
GET    /guilds/:guildId                       - Get guild by ID
PATCH  /guilds/:guildId/config                - Update guild config
GET    /guilds/:guildId/config                - Get guild config
GET    /guilds/:guildId/worlds                - Get worlds
GET    /guilds/:guildId/permissions           - Get permissions
```

#### Members
```
GET    /guilds/:guildId/members               - Get all members
GET    /guilds/:guildId/members/@me/refresh   - Refresh self
POST   /guilds/:guildId/members/refresh       - Bulk refresh (admin)
GET    /guilds/:guildId/members/refresh/latest - Latest refresh job
PATCH  /guilds/:guildId/members/:id/deactivate - Deactivate member
```

#### Loots
```
GET    /guilds/:guildId/loots                 - Fetch loots
POST   /loots                                  - Submit loot
GET    /guilds/:guildId/loots/:id/comments    - Get comments
POST   /guilds/:guildId/loots/:id/comments    - Add comment
DELETE /guilds/:guildId/loots/:id             - Delete loot
PATCH  /loots/:id                              - Update loot share
```

#### Timers
```
POST   /guilds/:guildId/timers                - Create timer
POST   /guilds/:guildId/timers/manual         - Create manual timer
GET    /guilds/:guildId/timers                - Get timers
GET    /timers                                 - Get all user timers
PATCH  /guilds/:guildId/timers/:npcId/reset   - Reset timer
DELETE /guilds/:guildId/timers/:npcId         - Delete timer
GET    /guilds/:guildId/timers/search         - Search NPCs
```

#### Roles
```
GET    /guilds/:guildId/roles                 - Get roles
POST   /guilds/:guildId/roles                 - Create role
PATCH  /guilds/:guildId/roles/:roleId         - Update role
DELETE /guilds/:guildId/roles/:roleId         - Delete role
PATCH  /guilds/:guildId/roles/:roleId/permissions - Update permissions
```

---

## Best Practices

### 1. **DTO Validation**

Always use `class-validator` decorators:

```typescript
export class CreateLootDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => LootDto)
  loots: LootDto[];

  @IsNotEmpty()
  @IsString()
  world: string;

  @IsNotEmpty()
  @IsEnum(LootSource)
  source: LootSource;
}
```

Enable in `main.ts`:
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,        // Auto-transform to DTO instances
    whitelist: true,        // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
  }),
);
```

### 2. **Error Handling**

Use NestJS built-in exceptions:

```typescript
// Bad
throw new Error('Not found');

// Good
throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
```

Enum for error keys:
```typescript
export enum ErrorKey {
  GUILD_NOT_FOUND = 'GUILD_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}
```

### 3. **Logging**

Use Winston logger with context:

```typescript
this.logger.log({
  level: 'info',
  message: 'Timer created',
  guildId,
  npcId,
  world,
  userId,
});

// Error logging with stack trace
this.logger.log({
  level: 'error',
  message: 'Failed to create timer',
  stack: error.stack,
  context: { guildId, npcId },
});
```

### 4. **Dependency Injection**

Avoid circular dependencies with `forwardRef`:

```typescript
// GuildsService needs MembersService
// MembersService needs GuildsService

@Injectable()
export class GuildsService {
  constructor(
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
  ) {}
}
```

### 5. **Entity Serialization**

Use `class-transformer` for response serialization:

```typescript
export class GuildEntity {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  icon: string;

  // ownerId is excluded (not decorated with @Expose)
}

// In controller
return plainToInstance(GuildEntity, guild);
```

Enable globally:
```typescript
app.useGlobalInterceptors(
  new ClassSerializerInterceptor(app.get(Reflector), {
    excludeExtraneousValues: true,
  }),
);
```

### 6. **Testing**

Use Jest with testcontainers for integration tests:

```typescript
describe('LootsService', () => {
  let service: LootsService;
  let prisma: PrismaService;
  let container: StartedPostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();

    const module = await Test.createTestingModule({
      providers: [
        LootsService,
        {
          provide: PrismaService,
          useFactory: () => {
            return new PrismaClient({
              datasources: {
                db: { url: container.getConnectionUri() },
              },
            });
          },
        },
      ],
    }).compile();

    service = module.get(LootsService);
    prisma = module.get(PrismaService);
  });

  it('should create loot', async () => {
    const loot = await service.createLoot(discordId, userId, createLootDto);
    expect(loot).toBeDefined();
  });
});
```

---

## Common Patterns

### 1. **Pagination with Cursor**

```typescript
interface FetchLootsParams {
  cursor?: number;  // Last loot ID
  limit?: number;
}

async fetchLoots({ cursor = null, limit = 20 }: FetchLootsParams) {
  const loots = await this.prisma.loot.findMany({
    where: {
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit,
  });

  return loots;
}
```

### 2. **Soft Delete**

```typescript
// Never hard delete
await this.prisma.guild.delete({ where: { id } });  // ❌

// Always soft delete
await this.prisma.guild.update({
  where: { id },
  data: { active: false },  // ✅
});

// Query with soft delete
await this.prisma.guild.findMany({
  where: { active: true },  // Only active records
});
```

### 3. **Optimistic Locking**

```typescript
// Use updatedAt for versioning
const current = await this.prisma.guild.findUnique({
  where: { id },
  select: { updatedAt: true },
});

const updated = await this.prisma.guild.update({
  where: {
    id,
    updatedAt: current.updatedAt,  // Only update if not changed
  },
  data: { name: 'New Name' },
});
```

### 4. **Retry Pattern**

```typescript
async withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### 1. **AuthGuard Not Working**

**Symptom**: All requests return 401 Unauthorized

**Cause**: Missing headers `x-auth-discord-id` or `x-auth-user-id`

**Solution**: Ensure your client sends these headers:
```typescript
headers: {
  'x-auth-discord-id': discordId,
  'x-auth-user-id': userId,
}
```

#### 2. **PermissionsGuard Returning 403**

**Symptom**: Request has valid auth but returns 403 Forbidden

**Causes**:
- User is not a member of the guild
- Member is deactivated (`active: false`)
- User lacks required permissions
- Permission cache is stale

**Debug**:
```bash
# Check member status
SELECT * FROM "Member" WHERE "userId" = 'discordId' AND "guildId" = 'guildId';

# Check roles and permissions
SELECT r.* FROM "Role" r
INNER JOIN "_MemberToRole" mr ON mr."B" = r.id
INNER JOIN "Member" m ON m.id = mr."A"
WHERE m."userId" = 'discordId' AND m."guildId" = 'guildId';

# Clear permission cache
redis-cli DEL "permissions:userId:guildId"
```

#### 3. **Timer Race Conditions**

**Symptom**: Duplicate timer errors or `TIMER_RACE_CONDITION` exception

**Cause**: Multiple clients submitting same timer simultaneously

**Solution**: Race condition protection is built-in with locks. If you see this error, the system is working correctly. The client should retry after a short delay.

#### 4. **Stale Member Data**

**Symptom**: Member data shows `isStale: true` in response

**Causes**:
- Discord API rate limiting
- Discord API temporary unavailability
- Auth service unavailable

**Solution**: This is expected behavior. The API serves cached data with a warning. The data will refresh automatically when Discord API is available.

#### 5. **N+1 Query Performance**

**Symptom**: Slow response times, many database queries

**Debug**:
```typescript
// Enable Prisma query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

**Solution**: Use `include` or batch queries:
```typescript
// Bad - N+1
for (const member of members) {
  const roles = await prisma.role.findMany({
    where: { id: { in: member.roleIds } },
  });
}

// Good - Single query
const members = await prisma.member.findMany({
  where: { guildId },
  include: { roles: true },
});
```

#### 6. **Redis Connection Issues**

**Symptom**: `Error: Connection is closed` or timeout errors

**Debug**:
```bash
# Check Redis connectivity
redis-cli -h localhost -p 6379 -a password PING

# Check active connections
redis-cli INFO clients
```

**Solution**: Increase retry configuration in RedisModule:
```typescript
new Redis({
  host: config.host,
  port: config.port,
  maxRetriesPerRequest: 5,  // Increase from 3
  retryStrategy: (times) => Math.min(times * 100, 3000),
});
```

#### 7. **RabbitMQ Message Loss**

**Symptom**: Events not received by consumers

**Debug**:
```bash
# Check RabbitMQ queues
rabbitmqctl list_queues

# Check bindings
rabbitmqctl list_bindings
```

**Solution**: Ensure durable exchanges and queues:
```typescript
@RabbitSubscribe({
  exchange: DEFAULT_EXCHANGE_NAME,
  routingKey: RoutingKey.GUILDS_TIMERS_UPDATE,
  queue: 'discord-bot.timers.update',
  queueOptions: {
    durable: true,  // Persist queue
  },
})
```

### Performance Optimization

#### 1. **Database Queries**

```bash
# Find slow queries in PostgreSQL
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;

# Check missing indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public';
```

#### 2. **Redis Memory Usage**

```bash
# Check memory usage
redis-cli INFO memory

# Find large keys
redis-cli --bigkeys

# Check key TTLs
redis-cli TTL "key:name"
```

#### 3. **Enable Query Logging**

```typescript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  log      = ["query", "info", "warn", "error"]
}

// Or in code
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'event' },
  ],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## Environment Variables

See `.env.sample` for all required variables:

```bash
# Service Configuration
PORT=4003
ENV=local

# PostgreSQL Database
POSTGRESQL_CONNECTION_URI=postgresql://user:password@localhost:5433/lootlog

# RabbitMQ Message Queue
RABBITMQ_URI=amqp://rabbitmq_user:rabbitmq_password@localhost:5672

# Redis Cache
REDIS_USERNAME=default
REDIS_PASSWORD=redis_password
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth Service
AUTH_SERVICE_URL=http://localhost/api/auth

# Axiom Logging (optional)
AXIOM_TOKEN=axiom_token_here
AXIOM_DATASET=axiom_dataset_here
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm api:generate

# Run migrations
pnpm api:migrate:dev

# Start in development mode
pnpm dev

# Build for production
pnpm build

# Start production
pnpm start

# Run tests
pnpm test

# Run linter
pnpm lint

# Open Prisma Studio
pnpm api:studio
```

---

## Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Fastify Documentation](https://www.fastify.io/)
- [Redis Documentation](https://redis.io/documentation)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)
- [Discord API Documentation](https://discord.com/developers/docs/intro)

---

**Last Updated**: 2025-10-31
**Maintained By**: Lootlog Development Team
