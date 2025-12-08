# Margo Events Implementation Plan

## Overview

A guild event monitoring system for tracking member presence on event maps, detecting AFK status, and calculating points/rankings when event heroes are killed.

## Core Requirements

### 1. Map Status System (4 states)
| Status | Condition |
|--------|-----------|
| `ASSIGNED_PRESENT` | Assigned member is on the map |
| `ASSIGNED_ABSENT` | Assigned member exists but not on map |
| `UNASSIGNED` | No member assigned to this map |
| `WRONG_PLAYER` | Someone other than assigned member is on map |

### 2. Data Flow
```
game-client → API → RabbitMQ → Gateway → web dashboard
     ↓
  h.stasis (AFK detection)
     ↓
  Timer created (hero kill) → Points calculation
```

---

## Database Schema (API Service)

**File:** `apps/api/prisma/schema.prisma`

### New Models

```prisma
model Event {
  id          String   @id @default(cuid())
  guildId     String
  name        String
  world       String
  active      Boolean  @default(true)
  startsAt    DateTime?
  endsAt      DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  guild       Guild    @relation(fields: [guildId], references: [id])
  maps        EventMap[]
  heroNpcs    EventHeroNpc[]
  rankings    EventRanking[]

  @@index([guildId, active])
  @@index([world])
}

model EventMap {
  id            String   @id @default(cuid())
  eventId       String
  mapName       String
  assignedMemberId Int?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  event         Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  assignedMember Member?   @relation(fields: [assignedMemberId], references: [id])
  presenceLogs  EventPresenceLog[]

  @@unique([eventId, mapName])
  @@index([assignedMemberId])
}

model EventHeroNpc {
  id        String   @id @default(cuid())
  eventId   String
  npcId     Int
  npcName   String
  mapName   String
  createdAt DateTime @default(now())

  event     Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  kills     EventHeroKill[]

  @@unique([eventId, npcId])
  @@index([npcId])
}

model EventPresenceLog {
  id          String   @id @default(cuid())
  mapId       String
  memberId    Int
  isAfk       Boolean
  startedAt   DateTime @default(now())
  endedAt     DateTime?

  map         EventMap @relation(fields: [mapId], references: [id], onDelete: Cascade)
  member      Member        @relation(fields: [memberId], references: [id])

  @@index([mapId, memberId])
  @@index([startedAt, endedAt])
}

model EventHeroKill {
  id          String   @id @default(cuid())
  heroNpcId   String
  killedAt    DateTime @default(now())

  heroNpc     EventHeroNpc @relation(fields: [heroNpcId], references: [id], onDelete: Cascade)
  points      EventKillPoint[]

  @@index([heroNpcId])
  @@index([killedAt])
}

model EventKillPoint {
  id              String   @id @default(cuid())
  killId          String
  memberId        Int
  mapName         String
  points          Int
  timeOnMapSeconds Int
  afkPercentage   Float
  wasPresent      Boolean
  createdAt       DateTime @default(now())

  kill            EventHeroKill @relation(fields: [killId], references: [id], onDelete: Cascade)
  member          Member             @relation(fields: [memberId], references: [id])

  @@unique([killId, memberId, mapName])
  @@index([memberId])
}

model EventRanking {
  id          String   @id @default(cuid())
  eventId     String
  memberId    Int
  totalPoints Int      @default(0)
  totalKills  Int      @default(0)
  totalTimeSeconds Int @default(0)
  avgAfkPercentage Float @default(0)
  updatedAt   DateTime @updatedAt

  event       Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  member      Member     @relation(fields: [memberId], references: [id])

  @@unique([eventId, memberId])
  @@index([eventId, totalPoints(sort: Desc)])
}

model EventMapTemplate {
  id        String   @id @default(cuid())
  name      String
  world     String
  maps      String[] // Array of map names
  heroNpcs  Json     // Array of {npcId, npcName, mapName}
  createdAt DateTime @default(now())

  @@unique([name, world])
}
```

### Update Member Model
Add relations:
```prisma
model Member {
  // ... existing fields
  eventMapAssignments  EventMap[]
  eventPresenceLogs    EventPresenceLog[]
  eventKillPoints      EventKillPoint[]
  eventRankings        EventRanking[]
}
```

---

## API Implementation

**Location:** `apps/api/src/modules/events/`

### Module Structure
```
events/
├── events.module.ts
├── events.controller.ts
├── events.service.ts
├── dto/
│   ├── create-event.dto.ts
│   ├── update-event.dto.ts
│   ├── assign-member.dto.ts
│   ├── update-presence.dto.ts
│   └── map-status.dto.ts
├── enums/
│   └── map-status.enum.ts
└── listeners/
    └── timer-created.listener.ts  # Points calculation on hero kill
```

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/guilds/:guildId/events` | Create event (with maps & heroes) |
| GET | `/guilds/:guildId/events` | List guild events |
| GET | `/guilds/:guildId/events/:eventId` | Get event details |
| PATCH | `/guilds/:guildId/events/:eventId` | Update event |
| DELETE | `/guilds/:guildId/events/:eventId` | Delete event |
| POST | `/guilds/:guildId/events/:eventId/maps/:mapId/assign` | Assign member to map |
| DELETE | `/guilds/:guildId/events/:eventId/maps/:mapId/assign` | Unassign member |
| POST | `/guilds/:guildId/events/:eventId/presence` | Update presence/AFK status |
| GET | `/guilds/:guildId/events/:eventId/ranking` | Get event ranking |
| GET | `/guilds/:guildId/events/templates` | Get map templates |

### Timer Created Listener (Points Calculation)

**File:** `apps/api/src/modules/events/listeners/timer-created.listener.ts`

When a timer is created for a hero NPC:
1. Find active events with this NPC in `EventHeroNpc`
2. Create `EventHeroKill` record
3. For each assigned map:
   - Calculate time on map from `EventPresenceLog`
   - Calculate AFK percentage from presence logs
   - **Award points: TBD - formula to be specified by team**
   - Create `EventKillPoint` records
4. Update `EventRanking` aggregates
5. Publish RabbitMQ event for real-time broadcast

> **Note:** Points calculation formula will be defined later after team consultation. The system will store all necessary data (time on map, AFK%, presence status) to support any formula.

---

## Gateway Events

**Files to modify:**
- `apps/gateway/src/gateway/enums/gateway-event.enum.ts`
- `apps/gateway/src/gateway/enums/routing-key.enum.ts`
- `apps/gateway/src/gateway-queue.handler.ts`
- `apps/gateway/src/gateway.service.ts`

### New Gateway Events
```typescript
enum GatewayEvent {
  // ... existing
  EVENT_PRESENCE_UPDATE = 'event:presence:update',
  EVENT_MAP_STATUS_UPDATE = 'event:map-status:update',
  EVENT_HERO_KILLED = 'event:hero:killed',
  EVENT_RANKING_UPDATE = 'event:ranking:update',
}
```

### New Routing Keys
```typescript
enum RoutingKey {
  // ... existing
  EVENT_PRESENCE_UPDATE = 'event.presence.update',
  EVENT_MAP_STATUS_UPDATE = 'event.map-status.update',
  EVENT_HERO_KILLED = 'event.hero.killed',
  EVENT_RANKING_UPDATE = 'event.ranking.update',
}
```

---

## Game Client Implementation

**Location:** `apps/game-client/src/features/events/`

### Structure
```
events/
├── hooks/
│   ├── use-event.ts           # Fetch active event for current world
│   ├── use-presence-tracker.ts      # Track & send presence updates
│   ├── use-afk-detector.ts          # Detect h.stasis changes
│   └── use-map-status-socket.ts     # Real-time map status updates
├── components/
│   ├── event-map-list.tsx           # List of maps with statuses
│   ├── map-status-badge.tsx         # Status indicator
│   ├── assign-map-button.tsx        # Self-assign button
│   └── event-ranking-widget.tsx     # Mini ranking display
└── utils/
    └── presence-utils.ts
```

### AFK Detection Handler

**File:** `apps/game-client/src/hooks/game-events/use-afk-handler.ts`

```typescript
// Add 'h' to RELEVANT_EVENT_KEYS in use-game-event-handlers.ts
// Create new handler for h.stasis detection

export const useAfkHandler = () => {
  const { mutate: updatePresence } = useUpdatePresence();
  const previousStasis = useRef<number | null>(null);

  const handleAfkEvent = useCallback((event: GameEvent) => {
    if (event.h?.stasis === undefined) return;

    const isAfk = event.h.stasis === 1;

    if (previousStasis.current !== event.h.stasis) {
      previousStasis.current = event.h.stasis;
      updatePresence({ isAfk, mapName: Game.map.name });
    }
  }, [updatePresence]);

  return { handleAfkEvent };
};
```

### Presence Tracker

Sends periodic presence updates + immediate AFK status changes to API:
- On map change: Send presence update
- On AFK status change: Send immediate update
- Periodic heartbeat: Every 30 seconds

---

## Web Dashboard Implementation

**Location:** `apps/web/src/features/events/`

### Structure
```
events/
├── pages/
│   ├── events-list.tsx              # List all guild events
│   ├── event-detail.tsx             # Single event view
│   └── event-create.tsx             # Create/edit event form
├── components/
│   ├── event-map-grid.tsx           # Map grid with status indicators
│   ├── map-status-card.tsx          # Individual map card
│   ├── member-assignment-modal.tsx  # Assign members to maps
│   ├── event-ranking-table.tsx      # Full ranking table
│   ├── live-presence-indicator.tsx  # Real-time presence dots
│   └── template-selector.tsx        # Select from map templates
├── hooks/
│   ├── use-event-socket.ts          # Socket subscriptions
│   ├── use-events-query.ts          # TanStack Query hooks
│   └── use-map-status.ts            # Computed map statuses
└── utils/
    └── status-utils.ts
```

### Map Status Computation

```typescript
type MapStatus = 'ASSIGNED_PRESENT' | 'ASSIGNED_ABSENT' | 'UNASSIGNED' | 'WRONG_PLAYER';

const computeMapStatus = (
  map: EventMap,
  onlinePlayers: OnlinePlayer[]
): MapStatus => {
  const playerOnMap = onlinePlayers.find(p => p.location?.map === map.mapName);

  if (!map.assignedMemberId) {
    return 'UNASSIGNED';
  }

  if (!playerOnMap) {
    return 'ASSIGNED_ABSENT';
  }

  if (playerOnMap.memberId === map.assignedMemberId) {
    return 'ASSIGNED_PRESENT';
  }

  return 'WRONG_PLAYER';
};
```

---

## i18n Translations

**File:** `apps/web/src/i18n/translations/events.json`

```json
{
  "events": {
    "title": "Event Monitor",
    "create": "Create Event",
    "edit": "Edit Event",
    "delete": "Delete Event",
    "active": "Active",
    "inactive": "Inactive",
    "maps": {
      "title": "Event Maps",
      "assign": "Assign Member",
      "unassign": "Unassign",
      "selfAssign": "Take This Map",
      "status": {
        "assignedPresent": "Monitoring",
        "assignedAbsent": "Away",
        "unassigned": "Unassigned",
        "wrongPlayer": "Wrong Player"
      }
    },
    "ranking": {
      "title": "Event Ranking",
      "points": "Points",
      "kills": "Kills",
      "time": "Time",
      "afk": "AFK %"
    },
    "heroes": {
      "title": "Event Heroes",
      "killed": "Hero Killed!",
      "pointsAwarded": "{{points}} points awarded"
    },
    "templates": {
      "title": "Map Templates",
      "select": "Select Template"
    }
  }
}
```

**Update config:** `apps/web/src/i18n/config.ts`
```typescript
import events from "./translations/events.json";

// Add to resources.pl.translation:
events,
```

---

## Implementation Order

### Phase 1: Database & API Foundation
1. Add Prisma schema models
2. Run migration: `pnpm api:migrate:dev`
3. Create `events` NestJS module
4. Implement CRUD endpoints
5. Add timer-created listener for points

### Phase 2: Real-Time Infrastructure
6. Add Gateway events and routing keys
7. Implement RabbitMQ handlers in gateway
8. Add Socket.IO broadcast logic

### Phase 3: Game Client
9. Create AFK detection handler (`h.stasis`)
10. Implement presence tracker hook
11. Build event map components
12. Add self-assign functionality

### Phase 4: Web Dashboard
13. Create events pages (list, detail, create)
14. Implement map grid with status indicators
15. Add member assignment modal
16. Build ranking table
17. Wire up Socket.IO for live updates

### Phase 5: Polish
18. Add i18n translations
19. Add map templates (predefined lists)
20. Test full flow: presence → kill → points → ranking

---

## Key Files to Modify

### API Service
- `apps/api/prisma/schema.prisma` - New models
- `apps/api/src/app.module.ts` - Import EventsModule
- `apps/api/src/modules/timers/timers.service.ts` - Emit event on timer create

### Gateway
- `apps/gateway/src/gateway/enums/gateway-event.enum.ts`
- `apps/gateway/src/gateway/enums/routing-key.enum.ts`
- `apps/gateway/src/gateway-queue.handler.ts`
- `apps/gateway/src/gateway.service.ts`

### Game Client
- `apps/game-client/src/hooks/game-events/use-game-event-handlers.ts` - Add `h` to keys
- `apps/game-client/src/config/gateway.ts` - New events

### Web Dashboard
- `apps/web/src/i18n/config.ts` - Add events translations
- `apps/web/src/i18n/translations/events.json` - New file
- `apps/web/src/routes/` - New event routes

### Shared Types
- `packages/types/src/` - Event types
