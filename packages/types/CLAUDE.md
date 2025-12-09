# types

Shared TypeScript type definitions for all services.

## Exports

**Services:**
- `RuntimeEnvironment` - LOCAL, DEV, STAGING, PROD

**Timer Settings:**
- `NpcType` - NPC classifications (COMMON, ELITE, HERO, TITAN, etc.)
- `UserTimerSettings`, `UserGuildTimerSettings`, `TimersFilters`

**Sound Settings:**
- `UserSoundSettings`, `NpcTypeSoundConfig`

**Permissions:**
- `Permission` enum - 33 granular permissions
- `UserGuildPermissionsRole`, `UserGuildPermissionsDto`

## Usage

```typescript
import { Permission, NpcType, RuntimeEnvironment } from '@lootlog/types';
```

## Build

Uses pkgroll, exports CommonJS, ESM, and TypeScript declarations.
