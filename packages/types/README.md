# Types

Shared TypeScript type definitions used across all Lootlog services.

## Overview

The Types package provides a centralized collection of TypeScript types, interfaces, and enums that are shared between frontend and backend services. This ensures type consistency and reduces duplication across the monorepo.

## Features

- **Shared Types** - Common types used across services
- **API Contracts** - Request/response type definitions
- **Domain Models** - Business entity types
- **Enums** - Shared enumeration values
- **Type Guards** - Runtime type checking utilities
- **Full Type Safety** - Compile-time type checking

## Type Categories

### Domain Types

- `User` - User account information
- `Guild` - Clan/guild data
- `Loot` - Loot item records
- `Battle` - Battle information
- `Warrior` - Warrior statistics
- `NPC` - Monster/boss data
- `Item` - Game item definitions
- `Timer` - Boss timer data

### API Types

- `CreateGuildDto` - Guild creation request
- `UpdateLootDto` - Loot update request
- `BattleResponse` - Battle data response
- `LoginRequest` - Authentication request
- `PaginatedResponse<T>` - Paginated results

### Event Types

- `GuildCreatedEvent` - RabbitMQ event types
- `LootAddedEvent` - Event payloads
- `TimerUpdatedEvent` - Real-time events

### Utility Types

- `ApiResponse<T>` - Standard API response wrapper
- `PaginationParams` - Pagination parameters
- `SortParams` - Sorting options

## Usage

```typescript
import type { User, Guild, Loot, CreateGuildDto } from "@lootlog/types";

// Backend
async function createGuild(dto: CreateGuildDto): Promise<Guild> {
  // ...
}

// Frontend
const user: User = await fetchUser();
const guilds: Guild[] = await fetchGuilds();
```

## Benefits

- **Type Safety** - Catch errors at compile time
- **IntelliSense** - Better IDE autocomplete
- **Consistency** - Same types across frontend/backend
- **Refactoring** - Easy to update types project-wide
- **Documentation** - Types serve as documentation

## Development

```bash
# From monorepo root
cd packages/types
pnpm build               # Build package

# Types are automatically available via workspace:*
```

## File Structure

```
packages/types/
├── src/
│   ├── models/          - Domain entity types
│   ├── dto/             - Data transfer objects
│   ├── events/          - RabbitMQ event types
│   ├── api/             - API request/response types
│   └── index.ts         - Main export file
```

## Adding New Types

1. Create type file in appropriate directory
2. Export from `index.ts`
3. Types are automatically available to all services
