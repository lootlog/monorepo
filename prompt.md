# Prompt: Implementacja Feature "Events" w Monorepo Lootlog

## Kontekst Projektu

Pracujesz w monorepo aplikacji **Lootlog** - full-stack systemu dla gry "Margonem". Stack technologiczny:

- **Monorepo:** Turborepo + pnpm workspaces
- **Backend:** NestJS (Fastify) w `apps/api`
- **Frontend:** React 19 + Vite + TanStack Router/Query w `apps/web`
- **Game Client:** React 19 + Vite + Socket.IO w `apps/game-client`
- **Gateway:** Socket.IO gateway w `apps/gateway`
- **Database:** PostgreSQL 17 + Prisma ORM
- **Message Queue:** RabbitMQ (pub/sub via `@golevelup/nestjs-rabbitmq`)
- **Cache:** Redis
- **Shared Types:** `packages/types`

---

## Cel Biznesowy

Zaimplementuj moduł **"Events"** - system koordynacji gildii do monitorowania respawnów herosów (potworów) na mapach. Administratorzy definiują herosów i mapy. Gracze rezerwują mapy i fizycznie na nich stoją w grze, aby zdobywać punkty.

---

## Wymagania Funkcjonalne

### 1. Database Schema (`apps/api/prisma/schema.prisma`)

Dodaj następujące modele:

```prisma
enum EventStatus {
  IDLE          // Event nieaktywny
  WINDOW_OPEN   // Okno zapisów otwarte (przed respawnem)
  ACTIVE        // Heros żyje, gracze pilnują map
  COOLDOWN      // Heros zabity, oczekiwanie na respawn
}

model GuildEvent {
  id        String        @id @default(cuid())
  guildId   String
  name      String
  status    EventStatus   @default(IDLE)
  config    Json?         // Konfiguracja punktacji (basePoints, multipliers)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  guild     Guild         @relation(fields: [guildId], references: [id])
  heroes    EventHero[]
  rankings  EventRanking[]

  @@index([guildId])
}

model EventHero {
  id              String    @id // gameId z gry
  name            String
  iconUrl         String?
  minRespawnTime  Int       // sekundy
  maxRespawnTime  Int       // sekundy
  lastKilledAt    DateTime?
  eventId         String

  event           GuildEvent        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  categories      LocationCategory[]

  @@index([eventId])
}

model LocationCategory {
  id      String   @id @default(cuid())
  name    String
  heroId  String

  hero    EventHero  @relation(fields: [heroId], references: [id], onDelete: Cascade)
  maps    GameMap[]

  @@index([heroId])
}

model GameMap {
  id              String   @id @default(cuid())
  mapId           String   // ID mapy z gry
  name            String
  categoryId      String
  assignedPlayers String[] // Lista odcisków palców (fingerprint) graczy przypisanych

  category        LocationCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([categoryId])
  @@index([mapId])
}

model EventRanking {
  id        String   @id @default(cuid())
  eventId   String
  odcisk    String   // Fingerprint gracza
  odciskNick String? // Nick gracza (opcjonalny, dla wyświetlania)
  points    Float    @default(0)
  updatedAt DateTime @updatedAt

  event     GuildEvent @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([eventId, odcisk])
  @@index([eventId])
}
```

Dodaj relację w istniejącym modelu `Guild`:
```prisma
model Guild {
  // ... istniejące pola
  events GuildEvent[]
}
```

---

### 2. API Backend (`apps/api/src/modules/events/`)

Stwórz moduł NestJS z następującą strukturą:

```
modules/events/
├── events.module.ts
├── events.controller.ts
├── events.service.ts
├── dto/
│   ├── create-event.dto.ts
│   ├── update-event.dto.ts
│   ├── create-hero.dto.ts
│   ├── create-category.dto.ts
│   ├── create-map.dto.ts
│   ├── assign-player.dto.ts
│   └── kill-hero.dto.ts
└── enum/
    └── error-key.enum.ts
```

#### Wymagane Endpointy:

**Event CRUD:**
- `POST /guilds/:guildId/events` - Tworzenie eventu
- `GET /guilds/:guildId/events` - Lista eventów gildii
- `GET /guilds/:guildId/events/:eventId` - Szczegóły eventu (z herosami, kategoriami, mapami)
- `PATCH /guilds/:guildId/events/:eventId` - Aktualizacja eventu
- `DELETE /guilds/:guildId/events/:eventId` - Usunięcie eventu

**Hero Management:**
- `POST /guilds/:guildId/events/:eventId/heroes` - Dodanie herosa
- `DELETE /guilds/:guildId/events/:eventId/heroes/:heroId` - Usunięcie herosa

**Category Management:**
- `POST /guilds/:guildId/events/:eventId/heroes/:heroId/categories` - Dodanie kategorii
- `DELETE /guilds/:guildId/events/:eventId/categories/:categoryId` - Usunięcie kategorii

**Map Management:**
- `POST /guilds/:guildId/events/:eventId/categories/:categoryId/maps` - Dodanie mapy
- `DELETE /guilds/:guildId/events/:eventId/maps/:mapId` - Usunięcie mapy
- `POST /guilds/:guildId/events/:eventId/maps/:mapId/assign` - Przypisanie gracza do mapy
- `DELETE /guilds/:guildId/events/:eventId/maps/:mapId/assign` - Usunięcie przypisania

**Event Actions:**
- `POST /guilds/:guildId/events/:eventId/heroes/:heroId/kill` - Symulacja zabicia herosa
- `POST /guilds/:guildId/events/:eventId/activate` - Aktywacja eventu (IDLE → ACTIVE)
- `POST /guilds/:guildId/events/:eventId/open-window` - Otwarcie okna zapisów

**Rankings:**
- `GET /guilds/:guildId/events/:eventId/rankings` - Ranking graczy

#### Logika Kill Hero:

```typescript
async killHero(guildId: string, eventId: string, heroId: string) {
  // 1. Znajdź herosa i jego mapy
  // 2. Oblicz punkty dla przypisanych graczy (scoring)
  // 3. Zapisz punkty do EventRanking
  // 4. Wyczyść assignedPlayers na wszystkich mapach herosa
  // 5. Ustaw lastKilledAt na herosa
  // 6. Zmień status eventu na COOLDOWN
  // 7. Zaplanuj otwarcie WINDOW_OPEN (5 min przed minRespawnTime)
  // 8. Emit event przez RabbitMQ
}
```

#### Scoring Algorithm:

```typescript
function calculatePoints(
  config: EventConfig,
  assignedMapsCount: number,
  isNightShift: boolean // 02:00-06:00
): number {
  const basePoints = config.basePoints ?? 10;
  const mapMultiplier = 1 + (assignedMapsCount - 1) * 0.1; // +10% za każdą dodatkową mapę
  const nightBonus = isNightShift ? 1.5 : 1;

  return basePoints * mapMultiplier * nightBonus;
}
```

#### RabbitMQ Events (dodaj do `src/enum/routing-key.enum.ts`):

```typescript
// Events
GUILDS_EVENTS_UPDATE = 'guilds.events.update',
GUILDS_EVENTS_STATUS_CHANGE = 'guilds.events.status.change',
GUILDS_EVENTS_MAP_ASSIGN = 'guilds.events.map.assign',
```

---

### 3. Web UI (`apps/web/`)

#### Nowa strona: `src/routes/_authenticated/$guildId/events.tsx`

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { Events } from "@/features/events/events";

export const Route = createFileRoute("/_authenticated/$guildId/events")({
  component: Events,
});
```

#### Feature structure: `src/features/events/`

```
features/events/
├── events.tsx                    # Main component
├── components/
│   ├── event-header.tsx          # Nazwa eventu, status, akcje
│   ├── location-category-grid.tsx # Grid kategorii
│   ├── game-map-card.tsx         # Karta mapy z Traffic Light
│   ├── traffic-light.tsx         # Komponent statusu (zielony/żółty/czerwony)
│   ├── time-since-empty.tsx      # Licznik "czas bez opieki"
│   └── event-ranking.tsx         # Tabela rankingowa
└── hooks/
    ├── use-events.ts             # Query hook
    └── use-event-socket.ts       # Real-time updates
```

#### Traffic Light Logic:

```typescript
type MapStatus = "green" | "yellow" | "red";

function getMapStatus(
  map: GameMap,
  playersOnMap: PlayerPresence[],
  currentUserFingerprint: string
): MapStatus {
  const assignedOnMap = playersOnMap.some(p =>
    map.assignedPlayers.includes(p.odcisk)
  );

  if (assignedOnMap) return "green";      // Przypisany gracz jest na mapie
  if (playersOnMap.length > 0) return "yellow"; // Ktoś jest, ale nie przypisany
  return "red";                            // Mapa pusta
}
```

#### Real-time Integration:

Dodaj do `src/config/gateway.ts`:
```typescript
EVENTS_UPDATE = "events-update",
EVENTS_STATUS_CHANGE = "events-status-change",
EVENTS_MAP_ASSIGN = "events-map-assign",
```

Użyj wzorca z `features/reservations/` do nasłuchiwania eventów i invalidacji query.

---

### 4. Game Client (`apps/game-client/`)

#### Position Tracker Hook: `src/hooks/use-position-tracker.ts`

```typescript
import { useEffect, useRef } from "react";
import { useSocket } from "@/contexts/socket-context";
import { throttle } from "lodash-es";

interface Position {
  x: number;
  y: number;
  mapId: string;
}

export function usePositionTracker() {
  const { socket, connected } = useSocket();
  const lastPosition = useRef<Position | null>(null);
  const lastMovementTime = useRef<number>(Date.now());
  const AFK_THRESHOLD = 5 * 60 * 1000; // 5 minut

  useEffect(() => {
    if (!connected) return;

    const emitPosition = throttle((pos: Position, isAfk: boolean) => {
      socket.emit("player-position-update", {
        ...pos,
        isAfk,
        timestamp: Date.now(),
      });
    }, 5000); // Max co 5 sekund

    const handleGamePosition = (event: CustomEvent<Position>) => {
      const { x, y, mapId } = event.detail;
      const now = Date.now();

      // Sprawdź czy pozycja się zmieniła
      if (
        lastPosition.current?.x !== x ||
        lastPosition.current?.y !== y ||
        lastPosition.current?.mapId !== mapId
      ) {
        lastMovementTime.current = now;
        lastPosition.current = { x, y, mapId };
      }

      const isAfk = now - lastMovementTime.current > AFK_THRESHOLD;
      emitPosition({ x, y, mapId }, isAfk);
    };

    // Nasłuchuj eventów z silnika gry
    window.addEventListener("game:position", handleGamePosition as EventListener);

    return () => {
      window.removeEventListener("game:position", handleGamePosition as EventListener);
      emitPosition.cancel();
    };
  }, [connected, socket]);
}
```

#### Events Window: `src/features/events-window/events-window.tsx`

Stwórz nowe okno używając istniejącego wzorca `DraggableWindow`:

```typescript
import { AnimatedWindow } from "@/components/animated-window";
import { DraggableWindow } from "@/components/draggable-window";
import { useWindowsStore } from "@/store/windows.store";

export function EventsWindow() {
  const { windows } = useWindowsStore();
  const windowState = windows.events;

  if (!windowState?.isOpen) return null;

  return (
    <AnimatedWindow isOpen={windowState.isOpen}>
      <DraggableWindow
        windowId="events"
        title="Event Maps"
        className="w-64"
      >
        <EventsWindowContent />
      </DraggableWindow>
    </AnimatedWindow>
  );
}

function EventsWindowContent() {
  // Wyświetl listę map przypisanego herosa
  // Traffic light dla każdej mapy
  // Quick Join button
}
```

Dodaj `"events"` do `WindowId` type w `src/store/windows.store.ts`.

---

### 5. Gateway Updates (`apps/gateway/`)

Dodaj obsługę nowych eventów:
- Konsumuj `guilds.events.*` z RabbitMQ
- Broadcastuj do klientów przez Socket.IO
- Obsłuż `player-position-update` od game-client

---

### 6. Shared Types (`packages/types/`)

```typescript
// src/events.ts
export interface GuildEvent {
  id: string;
  guildId: string;
  name: string;
  status: EventStatus;
  config: EventConfig | null;
  heroes: EventHero[];
  rankings?: EventRanking[];
}

export type EventStatus = "IDLE" | "WINDOW_OPEN" | "ACTIVE" | "COOLDOWN";

export interface EventConfig {
  basePoints: number;
  mapMultiplier: number;
  nightBonusMultiplier: number;
}

export interface EventHero {
  id: string;
  name: string;
  iconUrl: string | null;
  minRespawnTime: number;
  maxRespawnTime: number;
  lastKilledAt: string | null;
  categories: LocationCategory[];
}

export interface LocationCategory {
  id: string;
  name: string;
  maps: GameMap[];
}

export interface GameMap {
  id: string;
  mapId: string;
  name: string;
  assignedPlayers: string[];
}

export interface EventRanking {
  id: string;
  odcisk: string;
  odciskNick: string | null;
  points: number;
}

export interface PlayerPositionUpdate {
  odcisk: string;
  x: number;
  y: number;
  mapId: string;
  isAfk: boolean;
  timestamp: number;
}
```

---

## Wzorce do Naśladowania

1. **Struktura modułu API:** Wzoruj się na `apps/api/src/modules/timers/`
2. **Real-time w Web:** Wzoruj się na `apps/web/src/features/reservations/`
3. **Draggable Window:** Użyj `apps/game-client/src/components/draggable-window.tsx`
4. **Socket.IO:** Wzoruj się na `apps/game-client/src/lib/socket.ts`

---

## Kolejność Implementacji

1. **Database:** Schema + migracja (`pnpm api:migrate:dev`)
2. **Types:** Shared types w `packages/types`
3. **API:** Moduł events z CRUD i logiką
4. **Gateway:** Event handlers
5. **Web UI:** Strona + komponenty
6. **Game Client:** Position tracker + window

---

## Uwagi Implementacyjne

- Użyj Redlock dla operacji assign/kill (race conditions)
- Scoring wykonywany przy `killHero()`, nie jako scheduled job
- Traffic Light wymaga danych o obecności graczy z Gateway
- AFK detection: 5 minut bez ruchu
- Position emit throttled do max 1 req/5s
- Użyj `@Permissions()` decorator dla autoryzacji

---

## Testy

Napisz testy jednostkowe dla:
- `calculatePoints()` - różne scenariusze (nocna zmiana, wiele map)
- `killHero()` - status transitions, scoring
- `getMapStatus()` - wszystkie 3 stany

---

## Nie Implementuj

- Scheduled jobs dla scoring (event-driven zamiast tego)
- Modyfikacji istniejącego endpointu `/guilds/:guildId/timers`
- SSR w web (aplikacja jest SPA)
