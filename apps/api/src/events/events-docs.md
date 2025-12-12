# Events Module - Dokumentacja Flow'ów i Ekspertyza

## Spis treści

1. [Wprowadzenie i architektura](#1-wprowadzenie-i-architektura)
2. [Flow'y Backend (API)](#2-flowy-backend-api)
3. [Flow'y Frontend (Web)](#3-flowy-frontend-web)
4. [Flow'y Game Client](#4-flowy-game-client)
5. [Flow'y Gateway](#5-flowy-gateway)
6. [Pełne scenariusze end-to-end](#6-pełne-scenariusze-end-to-end)
7. [Ekspertyza i ocena flow'ów](#7-ekspertyza-i-ocena-flowów)
8. [Appendix - Typy danych i interfejsy](#8-appendix---typy-danych-i-interfejsy)

---

## 1. Wprowadzenie i architektura

### 1.1 Cel modułu Events

Moduł Events służy do **śledzenia polowań na herosów gildyjnych** w grze Margonem. Umożliwia:
- Definiowanie eventów z listą herosów do śledzenia
- Przypisywanie członków gildii do map respawnu
- Automatyczne wykrywanie zabicia herosa i naliczanie punktów
- Śledzenie "coverage gaps" (luk w pokryciu map)
- Real-time aktualizacje dla wszystkich członków gildii

### 1.2 Diagram architektury

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Web Client)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ EventDetail │  │ HeroDetail  │  │ KillDetail  │  │ EventRankingPage    │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │            │
│         └────────────────┴────────────────┴─────────────────────┘            │
│                                    │                                         │
│                          ┌─────────┴─────────┐                              │
│                          │  React Query +    │                              │
│                          │  Socket.IO Client │                              │
│                          └─────────┬─────────┘                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
┌───────────────────────────────────┐   ┌────────────────────────────────────┐
│       API Service (NestJS)        │   │     Gateway Service (Socket.IO)    │
│  ┌─────────────────────────────┐  │   │  ┌──────────────────────────────┐  │
│  │      EventsController       │  │   │  │    GatewayService            │  │
│  └──────────────┬──────────────┘  │   │  │  - Permission filtering      │  │
│                 │                 │   │  │  - Room broadcasting         │  │
│  ┌──────────────┴──────────────┐  │   │  └──────────────┬───────────────┘  │
│  │      EventsService          │  │   │                 │                  │
│  │      (Facade/Orchestrator)  │  │   │  ┌──────────────┴───────────────┐  │
│  └──────────────┬──────────────┘  │   │  │ GatewayQueueHandler          │  │
│                 │                 │   │  │ - RabbitMQ consumer          │  │
│  ┌──────────────┼──────────────┐  │   │  └──────────────────────────────┘  │
│  │              │              │  │   └─────────────────┬──────────────────┘
│  ▼              ▼              ▼  │                     │
│ ┌────────┐ ┌─────────┐ ┌────────┐│                     │
│ │Kill    │ │Respawn  │ │Tracking││                     │
│ │Service │ │Service  │ │Service ││                     │
│ └───┬────┘ └────┬────┘ └───┬────┘│                     │
│     │           │          │     │                     │
│ ┌───┴───┐ ┌─────┴────┐ ┌───┴───┐ │                     │
│ │Points │ │Summary   │ │Emitter│◄├─────────────────────┘
│ │Service│ │Service   │ │Service│ │         RabbitMQ
│ └───────┘ └──────────┘ └───────┘ │
└───────────────────────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │   PostgreSQL    │
          │   (Prisma ORM)  │
          └─────────────────┘
                    │
┌───────────────────┴───────────────────┐
│           Game Client                  │
│  ┌──────────────────────────────────┐ │
│  │  useAfkHandler (AFK detection)   │ │
│  │  useMapChangeHandler (map track) │ │
│  └──────────────┬───────────────────┘ │
│                 │                      │
│         PRESENCE_UPDATE                │
│                 │                      │
└─────────────────┼──────────────────────┘
                  │
                  ▼
          Gateway WebSocket
```

### 1.3 Lista serwisów i odpowiedzialności

| Serwis | Plik | Odpowiedzialność |
|--------|------|------------------|
| **EventsService** | `events.service.ts` | Facade - orkiestracja wszystkich operacji |
| **EventKillService** | `services/event-kill.service.ts` | Detekcja i rejestracja zabić, historia, timeline |
| **EventRespawnService** | `services/event-respawn.service.ts` | Lifecycle okien respawnu (open/close/auto-close) |
| **EventTrackingService** | `services/event-tracking.service.ts` | Przypisania członków, presence tracking, coverage gaps |
| **EventPointsService** | `services/event-points.service.ts` | Kalkulacja punktów, multipliers, ranking |
| **EventSummaryService** | `services/event-summary.service.ts` | Agregacja danych, czyszczenie raw data |
| **EventEmitterService** | `services/event-emitter.service.ts` | Publikacja eventów do RabbitMQ |

---

## 2. Flow'y Backend (API)

### 2.1 Respawn Window Lifecycle

Okno respawnu to okres czasu między `minSpawnTime` a `maxSpawnTime`, kiedy heros może się odrodzić.

#### 2.1.1 Otwieranie okna (manual)

```
POST /guilds/:guildId/events/:eventId/heroes/:heroId/open-respawn-window
Body: { minSpawnTime: Date, maxSpawnTime: Date }
```

**Flow:**

```
1. EventRespawnService.openRespawnWindow()
   │
   ├─► 2. Walidacja herosa i eventu
   │
   ├─► 3. Wygenerowanie npcId (realny lub synthetic)
   │      └─► getSyntheticNpcId(heroId) → negative hash
   │
   ├─► 4. Upsert Timer w bazie danych
   │      └─► Utworzenie rekordu Timer z:
   │          - npcId (lub synthetic)
   │          - minSpawnTime, maxSpawnTime
   │          - windowOpenedAt = now()
   │          - npc JSON (name, icon, type)
   │
   ├─► 5. Schedule auto-close job (Bull Queue)
   │      └─► delay = maxSpawnTime - now
   │      └─► jobId = `respawn-close-${heroId}-${timestamp}`
   │
   ├─► 6. Otwarcie coverage gaps dla wszystkich map herosa
   │      └─► Dla każdej mapy:
   │          ├─► Brak przypisanych → openUnassignedGap()
   │          └─► Są przypisani → openUncoveredGap()
   │
   ├─► 7. Emit EVENT_RESPAWN_WINDOW_OPENED (RabbitMQ)
   │
   ├─► 8. Emit EVENT_MAP_STATUS_UPDATE dla każdej mapy
   │
   └─► 9. Emit GUILDS_TIMERS_UPDATE (timer data)
```

#### 2.1.2 Zamykanie okna (manual)

```
POST /guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window
Body: { createNewWindow?: boolean, newMinSpawnTime?: Date, newMaxSpawnTime?: Date }
```

**Flow:**

```
1. EventRespawnService.closeRespawnWindow()
   │
   ├─► 2. Pobranie timera przed usunięciem
   │
   ├─► 3. Wyczyszczenie wszystkich przypisań (set assignedMembers = [])
   │      └─► Emit EVENT_MAP_STATUS_UPDATE dla każdej mapy
   │
   ├─► 4. Zamknięcie wszystkich coverage gaps
   │      └─► trackingService.closeAllGapsForHero() [atomowa transakcja]
   │
   ├─► 5. Usunięcie Timer z bazy
   │
   ├─► 6. Anulowanie scheduled auto-close job
   │
   ├─► 7. Emit EVENT_RESPAWN_WINDOW_CLOSED
   │
   ├─► 8. [TYLKO MANUAL] Rejestracja "killa" dla punktów
   │      └─► killService.checkAndRecordEventHeroKill(..., isManualClose=true)
   │      └─► UWAGA: async bez await (fire-and-forget)
   │
   └─► 9. [OPCJONALNE] Utworzenie nowego okna
         └─► openRespawnWindow(newMinSpawnTime, newMaxSpawnTime)
```

#### 2.1.3 Auto-close (Bull Queue processor)

**Plik:** `respawn-window.processor.ts`

```
Bull Queue: "respawn-window-queue"
Job name: "auto-close-respawn-window"

1. RespawnWindowProcessor.handleAutoClose(job)
   │
   ├─► 2. Wywołanie closeRespawnWindow() z isAutoClose=true
   │
   └─► 3. Różnica vs manual close:
         ├─► NIE rejestruje killa (gracze nie dostają punktów)
         └─► Tworzy summary bez killId
```

**Kluczowa różnica:**
- **Manual close** → gracze dostają punkty za wysiłek
- **Auto-close** → okno wygasło, brak punktów

### 2.2 Kill Recording Flow

#### 2.2.1 Detekcja zabicia herosa

Zabicie herosa jest wykrywane przez **Timer Service** (zewnętrzny moduł), który przy aktualizacji timera wywołuje:

```
EventsService.checkAndRecordEventHeroKill(guildId, world, npcId, npcName, npcIcon, timerData)
```

**Flow detekcji:**

```
1. EventKillService.checkAndRecordEventHeroKill()
   │
   ├─► 2. findActiveEventHeroByNpc(guildId, world, npcId, npcName)
   │      │
   │      ├─► Próba dopasowania po npcId (priorytet)
   │      │
   │      └─► Próba dopasowania po npcName
   │          (tylko dla herosów bez npcId)
   │
   ├─► 3. Walidacja:
   │      ├─► Event musi być active=true
   │      ├─► Czas między startsAt i endsAt (jeśli ustawione)
   │      └─► Hero musi istnieć w evencie
   │
   ├─► 4. Aktualizacja npcId/npcIcon herosa (jeśli null)
   │
   └─► 5. recordHeroKill() [główna logika]
```

#### 2.2.2 Rejestracja killa (transakcja)

```
EventKillService.recordHeroKill(guildId, eventHero, event, timerData, isManualClose)
```

**Flow transakcji:**

```
TRANSACTION START
│
├─► 1. Utworzenie EventHeroKill
│      {
│        heroNpcId, killedAt,
│        minSpawnTimeAtKill, maxSpawnTimeAtKill,
│        timerCreatedById, isManualClose
│      }
│
├─► 2. Pobranie map herosa z przypisanymi członkami
│
├─► 3. Dla każdego przypisanego członka (jeśli autoCalculatePoints):
│      │
│      ├─► Pobranie presence stats (czas na mapie, AFK %)
│      │
│      ├─► Kalkulacja punktów:
│      │   points = basePointsPerKill * (time_mult * trackers_mult * maps_mult)
│      │
│      └─► Utworzenie EventKillPoint
│          {
│            killId, memberId, mapName,
│            basePoints, points, appliedMultiplier,
│            timeOnMapSeconds, afkPercentage, wasPresent
│          }
│
├─► 4. Wyczyszczenie przypisań (assignedMembers = [])
│
├─► 5. Zamknięcie historii przypisań (set unassignedAt)
│
└─► 6. Pobranie utworzonych EventKillPoint
│
TRANSACTION END
│
├─► 7. Aktualizacja EventRanking (jeśli autoCalculatePoints)
│      └─► pointsService.updateRankingAfterKill()
│
├─► 8. Zamknięcie wszystkich coverage gaps
│      └─► trackingService.closeAllGapsForHero()
│
├─► 9. Utworzenie summary i czyszczenie raw data
│      └─► summaryService.createWindowSummary()
│
├─► 10. Anulowanie scheduled auto-close job
│
├─► 11. Emit EVENT_HERO_KILLED
│
├─► 12. [NIE dla manual close] Emit EVENT_RESPAWN_WINDOW_CLOSED
│
├─► 13. [NIE dla manual close] Jeśli nowe spawn times:
│       ├─► Emit EVENT_RESPAWN_WINDOW_OPENED
│       └─► Schedule nowy auto-close job
│
└─► 14. Emit EVENT_MAP_STATUS_UPDATE dla każdej mapy
```

### 2.3 Presence Tracking Flow

#### 2.3.1 Obsługa zmiany obecności

**Źródło:** Game Client → Gateway → RabbitMQ → `EventsQueueHandler`

```
Queue: PRESENCE_COVERAGE_CHECK
Routing Key: presence.coverage.check

Message: {
  guildId: string,
  mapName: string,
  discordId: string,
  hasPlayer: boolean,
  isAfk?: boolean
}
```

**Flow:**

```
1. EventsQueueHandler.handlePlayerPresenceChange(data)
   │
   └─► 2. EventTrackingService.handlePlayerPresenceChange()
          │
          ├─► 3. Pobranie member po discordId
          │      └─► Jeśli nie znaleziono → skip (non-guild member)
          │
          ├─► 4. Znalezienie wszystkich event maps z daną mapName
          │      w aktywnych eventach tej gildii
          │
          └─► 5. Dla każdej mapy:
                 │
                 ├─► 6. Sprawdzenie czy respawn window jest aktywna
                 │      └─► hasActiveRespawnWindow() → jeśli nie → skip
                 │
                 ├─► 7. Aktualizacja presence logs (jeśli member w gildii):
                 │      │
                 │      ├─► hasPlayer=true:
                 │      │   └─► Zamknij stary log + utwórz nowy
                 │      │
                 │      └─► hasPlayer=false:
                 │          └─► Zamknij istniejący log
                 │
                 ├─► 8. Zarządzanie coverage gaps (jeśli są przypisani):
                 │      │
                 │      ├─► hasPlayer=true && !isAfk:
                 │      │   └─► closeUncoveredGap()
                 │      │
                 │      ├─► hasPlayer=true && isAfk:
                 │      │   └─► Sprawdź czy są inni non-AFK
                 │      │       └─► Jeśli nie → openUncoveredGap()
                 │      │
                 │      └─► hasPlayer=false:
                 │          └─► Sprawdź czy są inni non-AFK
                 │              └─► Jeśli nie → openUncoveredGap()
                 │
                 └─► 9. Emit EVENT_MAP_STATUS_UPDATE
```

#### 2.3.2 Typy coverage gaps

| Typ | Warunek | Znaczenie |
|-----|---------|-----------|
| **UNASSIGNED** | `assignedMembers.length === 0` | Mapa nie ma nikogo przypisanego |
| **UNCOVERED** | `assignedMembers.length > 0` ale nikt non-AFK na mapie | Mapa ma przypisanych, ale nikt nie pilnuje |

**Logika zarządzania:**

```
Przypisanie pierwszego członka:
  └─► closeUnassignedGap() + openUncoveredGap()

Odpisanie ostatniego członka:
  └─► openUnassignedGap() + closeUncoveredGap()

Gracz wchodzi na mapę (non-AFK):
  └─► closeUncoveredGap()

Gracz wychodzi / AFK (ostatni non-AFK):
  └─► openUncoveredGap()
```

### 2.4 Points & Ranking Flow

#### 2.4.1 Kalkulacja punktów

**Plik:** `services/event-points.service.ts`

```typescript
calculateMemberPoints(event, killTime, heroMapCount, assignedMembersCount) {
  // Bazowe punkty
  let points = event.basePointsPerKill; // domyślnie 100

  // Time-of-day multiplier
  const hour = killTime.getHours();
  const minute = killTime.getMinutes();
  const timeMult = findTimeMultiplier(event.timeOfDayMultipliers, hour, minute);

  // Trackers multiplier (ile osób pilnowało)
  const trackersMult = findTrackersMultiplier(event.trackersMultipliers, assignedMembersCount);

  // Maps count multiplier (ile map pilnował ten członek)
  const mapsMult = findMapsMultiplier(event.mapsCountMultipliers, heroMapCount);

  // Końcowy wynik
  points = Math.round(points * timeMult * trackersMult * mapsMult);

  return { points, appliedMultiplier: timeMult * trackersMult * mapsMult };
}
```

**Przykładowe multipliers:**

```typescript
// Time of Day
timeOfDayMultipliers: [
  { from: "06:00", to: "18:00", multiplier: 1.0 },   // Dzień
  { from: "18:00", to: "22:00", multiplier: 1.5 },   // Wieczór (więcej punktów)
  { from: "22:00", to: "06:00", multiplier: 0.8 }    // Noc (mniej punktów)
]

// Trackers (ile osób pilnowało)
trackersMultipliers: {
  "1": 0.8,   // Sam → 80%
  "2": 1.0,   // 2 osoby → 100%
  "5": 1.2    // 5+ osób → 120%
}

// Maps Count (ile map pilnował ten członek)
mapsCountMultipliers: {
  "1": 0.8,   // 1 mapa → 80%
  "3": 1.0,   // 3 mapy → 100%
  "5": 1.2    // 5+ map → 120%
}
```

#### 2.4.2 Aktualizacja rankingu

```
EventPointsService.updateRankingAfterKill(eventId, heroNpcName, killPoints[])
```

**Flow:**

```
Dla każdego killPoint:
│
├─► 1. Znajdź lub utwórz EventRanking dla (eventId, memberId, heroNpcName)
│
└─► 2. Aktualizuj:
       ├─► totalPoints += killPoint.points
       ├─► totalKills += 1
       ├─► totalTimeSeconds += killPoint.timeOnMapSeconds
       └─► avgAfkPercentage (rolling average)
```

#### 2.4.3 Edycja punktów (manual)

**Endpoint:** `PATCH /guilds/:guildId/events/:eventId/ranking/:rankingId`

```
1. Utworzenie EventPointsEditHistory (RANKING)
2. Aktualizacja EventRanking.totalPoints
3. Ustawienie pointsModified=true
```

### 2.5 Member Assignment Flow

#### 2.5.1 Przypisanie przez admina

```
POST /guilds/:guildId/events/:eventId/maps/:mapId/assign
Body: { memberId: number }
```

**Flow:**

```
1. EventTrackingService.assignMemberToMap()
   │
   ├─► 2. Walidacja mapy i uprawnień
   │
   ├─► 3. Sprawdzenie limitu przypisań (mapAssignmentCap)
   │
   ├─► 4. Connect member do mapy (M:M)
   │
   ├─► 5. Utworzenie EventMapAssignmentHistory
   │
   ├─► 6. Jeśli pierwszy członek:
   │      ├─► closeUnassignedGap()
   │      ├─► openUncoveredGap()
   │      └─► Publish PRESENCE_CHECK_REQUEST (sprawdź czy ktoś już na mapie)
   │
   └─► 7. Emit EVENT_MAP_STATUS_UPDATE
```

#### 2.5.2 Self-assign

```
POST /guilds/:guildId/events/:eventId/maps/:mapId/self-assign
```

Identyczny flow, ale `memberId` jest pobierane z kontekstu użytkownika.

#### 2.5.3 Odpisanie

```
DELETE /guilds/:guildId/events/:eventId/maps/:mapId/assign?memberId=X
```

**Flow:**

```
1. EventTrackingService.unassignMemberFromMap()
   │
   ├─► 2. Disconnect member(s) z mapy
   │
   ├─► 3. Zamknięcie assignment history (set unassignedAt)
   │
   ├─► 4. Jeśli brak przypisanych:
   │      ├─► openUnassignedGap()
   │      └─► closeUncoveredGap()
   │
   └─► 5. Emit EVENT_MAP_STATUS_UPDATE
```

---

## 3. Flow'y Frontend (Web)

### 3.1 Struktura komponentów

```
routes/
├── /$guildId/events.tsx
│   └─► Events (lista eventów)
│       └─► EventCreateDialog
│
├── /$guildId/events_.$eventId.tsx
│   └─► EventDetail (hub eventu)
│       ├─► HeroCard[] (dla każdego herosa)
│       ├─► EventRankingPreview
│       └─► RecentKillsPreview
│
├── /$guildId/events_.$eventId_.heroes_.$heroId.tsx
│   └─► HeroDetail (kontrola map)
│       ├─► EventMapGrid
│       │   └─► MapCard[] (z PlayerTile)
│       ├─► OpenRespawnWindowDialog
│       ├─► CloseRespawnWindowDialog
│       └─► PresenceStatsCard
│
├── /$guildId/events_.$eventId_.kills.tsx
│   └─► EventKillsHistory (historia zabić)
│
└── /$guildId/events_.$eventId_.heroes_.$heroId_.kills_.$killId.tsx
    └─► KillDetail (szczegóły zabicia)
        ├─► KillParticipantsCard
        ├─► KillMapsTimelineSection
        └─► MultipliersCard
```

### 3.2 Kluczowe hooki

#### Queries (pobieranie danych)

| Hook | Cel | Query Key |
|------|-----|-----------|
| `useEvents()` | Lista eventów | `["events", guildId, world, activeOnly]` |
| `useEvent()` | Szczegóły eventu | `["event", guildId, eventId]` |
| `useEventHeroTimers()` | Timery herosów | `["event-hero-timers", guildId, eventId, world]` |
| `useKillDetail()` | Szczegóły zabicia | `["kill-detail", guildId, eventId, heroId, killId]` |
| `useHeroRespawnConfig()` | Status okna | `["hero-respawn-config", guildId, eventId, heroId]` |
| `useHeroPresenceStats()` | Statystyki obecności | `["hero-presence-stats", eventId, heroId]` |

#### Mutations (zmiany)

| Hook | Cel |
|------|-----|
| `useOpenRespawnWindow()` | Otwarcie okna respawnu |
| `useCloseRespawnWindow()` | Zamknięcie okna respawnu |
| `useSelfAssignMember()` | Self-assign do mapy |
| `useAssignMember()` | Przypisanie członka (admin) |
| `useUpdatePoints()` | Edycja punktów rankingu |

### 3.3 Real-time Updates (Socket.IO)

**Plik:** `features/events/hooks/use-event-socket.ts`

```typescript
socket.on("EVENT_MAP_STATUS_UPDATE", (payload) => {
  queryClient.invalidateQueries(["event", guildId, eventId]);
  queryClient.invalidateQueries(["map-active-gap", guildId, eventId, payload.mapId]);
});

socket.on("EVENT_HERO_KILLED", (payload) => {
  queryClient.invalidateQueries(["event", guildId, eventId]);
  queryClient.invalidateQueries(["event-kill-history"]);
});

socket.on("EVENT_RESPAWN_WINDOW_OPENED", (payload) => {
  queryClient.invalidateQueries(["hero-respawn-config", guildId, eventId, payload.heroId]);
  queryClient.invalidateQueries(["event-hero-timers"]);
});

socket.on("EVENT_RESPAWN_WINDOW_CLOSED", (payload) => {
  queryClient.invalidateQueries(["hero-respawn-config", guildId, eventId, payload.heroId]);
  queryClient.invalidateQueries(["event-hero-timers"]);
});
```

### 3.4 Presence Updates

**Plik:** `features/events/hooks/use-event-presence.ts`

```typescript
// Pobranie początkowego stanu presence
socket.emit("PRESENCE_FETCH", { guildId }, (response) => {
  setPresenceData(response);
});

// Nasłuchiwanie zmian
socket.on("PRESENCE_UPDATE", (payload) => {
  setPresenceData((prev) => {
    // Aktualizacja Map<discordId, PlayerPresence[]>
  });
});
```

### 3.5 Window Status Hook

**Plik:** `features/events/hooks/use-window-status.ts`

Hook zarządza **client-side transitions** między stanami okna:

```
NONE → WAITING (jeśli now < minSpawnTime)
WAITING → OPEN (gdy minSpawnTime minie)
OPEN → NONE (gdy maxSpawnTime minie)
```

**Implementacja:**

```typescript
useEffect(() => {
  if (windowStatus === 'WAITING' && minSpawnTime) {
    const delay = minSpawnTime.getTime() - Date.now() + 100; // +100ms buffer
    const timeout = setTimeout(() => setWindowStatus('OPEN'), delay);
    return () => clearTimeout(timeout);
  }

  if (windowStatus === 'OPEN' && maxSpawnTime) {
    const delay = maxSpawnTime.getTime() - Date.now() + 100;
    const timeout = setTimeout(() => setWindowStatus('NONE'), delay);
    return () => clearTimeout(timeout);
  }
}, [windowStatus, minSpawnTime, maxSpawnTime]);
```

---

## 4. Flow'y Game Client

### 4.1 AFK Handler

**Plik:** `apps/game-client/src/hooks/game-events/use-afk-handler.ts`

**Cel:** Wykrywanie gdy gracz przechodzi w tryb AFK/aktywny

**Flow:**

```
1. Nasłuchiwanie GameEvent.h.stasis
   │
   ├─► stasis === 1 → AFK
   └─► stasis === 0 → Aktywny

2. Porównanie z previousStasis.current

3. Jeśli zmiana + socket connected + joinedGuilds.length > 0:
   │
   └─► socket.emit(GatewayEvent.PRESENCE_UPDATE, {
         isAfk: boolean,
         mapId: Game.map.id,
         mapName: Game.map.name
       })
```

### 4.2 Map Change Handler

**Plik:** `apps/game-client/src/hooks/game-events/use-map-change-handler.ts`

**Cel:** Wykrywanie zmiany mapy gracza

**Flow:**

```
1. Nasłuchiwanie GameEvent.town

2. Ekstrakcja mapId i mapName z eventu

3. Porównanie z previousMapId.current

4. Jeśli zmiana + socket connected + joinedGuilds.length > 0:
   │
   └─► socket.emit(GatewayEvent.PRESENCE_UPDATE, {
         mapId: number,
         mapName: string
       })
```

---

## 5. Flow'y Gateway

### 5.1 Obsługa Presence z Game Client

**Plik:** `apps/gateway/src/gateway/gateway.ts`

```
@SubscribeMessage(GatewayEvent.PRESENCE_UPDATE)
handlePresenceUpdate(client, payload)
│
├─► 1. Aktualizacja presence w pamięci (PresenceService)
│
├─► 2. Broadcast do innych klientów (PRESENCE_UPDATE)
│
└─► 3. Publikacja do RabbitMQ (PRESENCE_COVERAGE_CHECK)
       └─► Routing key: presence.coverage.check
       └─► Payload: { guildId, mapName, discordId, hasPlayer, isAfk }
```

### 5.2 Event Broadcasting (RabbitMQ → Socket.IO)

**Plik:** `apps/gateway/src/gateway/gateway-queue.handler.ts`

**Konsumowane eventy:**

| Routing Key | Handler | Socket Event |
|------------|---------|--------------|
| `event.map-status.update` | `handleEventMapStatusUpdate()` | `EVENT_MAP_STATUS_UPDATE` |
| `event.hero.killed` | `handleEventHeroKilled()` | `EVENT_HERO_KILLED` |
| `event.ranking.update` | `handleEventRankingUpdate()` | `EVENT_RANKING_UPDATE` |
| `event.respawn-window.opened` | `handleEventRespawnWindowOpened()` | `EVENT_RESPAWN_WINDOW_OPENED` |
| `event.respawn-window.closed` | `handleEventRespawnWindowClosed()` | `EVENT_RESPAWN_WINDOW_CLOSED` |

**Flow:**

```
RabbitMQ Message
│
├─► 1. @RabbitSubscribe() decorator
│
├─► 2. RetryService.handleRetryLogic()
│      └─► 3 retries z exponential backoff
│      └─► Dead Letter Queue po wyczerpaniu
│
└─► 3. GatewayService.handleEvent*()
       │
       ├─► 4. Budowanie room name: `{guildId}:events`
       │
       └─► 5. gateway.server.to(room).emit(event, data)
```

### 5.3 Room Structure

```
{guildId}:events
├─► EVENT_HERO_KILLED
├─► EVENT_RANKING_UPDATE
├─► EVENT_MAP_STATUS_UPDATE
├─► EVENT_RESPAWN_WINDOW_OPENED
└─► EVENT_RESPAWN_WINDOW_CLOSED

{guildId}:timers:base
{guildId}:timers:heroes
{guildId}:timers:titans
├─► TIMERS_CREATE
├─► TIMERS_DELETE
└─► TIMERS_UPDATE
```

---

## 6. Pełne scenariusze end-to-end

### 6.1 Scenariusz: Gracz wchodzi na mapę herosa

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. GAME CLIENT                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ useMapChangeHandler detects GameEvent.town                                   │
│ → socket.emit(PRESENCE_UPDATE, { mapId: 123, mapName: "Darkwood" })        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. GATEWAY (WebSocket)                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ handlePresenceUpdate()                                                       │
│ → Update presence in memory                                                 │
│ → Broadcast PRESENCE_UPDATE to web clients                                  │
│ → Publish to RabbitMQ: PRESENCE_COVERAGE_CHECK                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. API (RabbitMQ Consumer)                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ EventsQueueHandler.handlePlayerPresenceChange()                             │
│ → EventTrackingService.handlePlayerPresenceChange()                        │
│   → Check if respawn window active                                         │
│   → Create/update EventPresenceLog                                          │
│   → If player non-AFK: closeUncoveredGap()                                 │
│   → Emit EVENT_MAP_STATUS_UPDATE (RabbitMQ)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. GATEWAY (RabbitMQ Consumer)                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ handleEventMapStatusUpdate()                                                 │
│ → Broadcast EVENT_MAP_STATUS_UPDATE to room {guildId}:events               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. WEB CLIENT                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ useEventSocket receives EVENT_MAP_STATUS_UPDATE                             │
│ → queryClient.invalidateQueries(["event", guildId, eventId])               │
│ → UI refreshes: MapCard shows green status                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Scenariusz: Hero zostaje zabity (automatycznie)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. TIMER SERVICE (zewnętrzny moduł)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Wykrywa zabicie NPC (aktualizacja timera)                                    │
│ → Wywołuje EventsService.checkAndRecordEventHeroKill()                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. API - Kill Recording                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ EventKillService.recordHeroKill() [TRANSACTION]                             │
│ → Create EventHeroKill                                                       │
│ → Create EventKillPoint per member                                          │
│ → Clear map assignments                                                      │
│ → Update rankings                                                            │
│ → Close coverage gaps                                                        │
│ → Create summary                                                             │
│ → Cancel auto-close job                                                      │
│                                                                              │
│ Emit to RabbitMQ:                                                            │
│ → EVENT_HERO_KILLED                                                          │
│ → EVENT_RESPAWN_WINDOW_CLOSED                                                │
│ → EVENT_RESPAWN_WINDOW_OPENED (nowe okno)                                   │
│ → EVENT_MAP_STATUS_UPDATE (dla każdej mapy)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. GATEWAY                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ Konsumuje wszystkie eventy z RabbitMQ                                        │
│ → Broadcast do room {guildId}:events                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. WEB CLIENT                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Receives multiple events:                                                    │
│ → EVENT_HERO_KILLED: invalidate event + kill history                        │
│ → EVENT_RESPAWN_WINDOW_CLOSED: invalidate timers + respawn config           │
│ → EVENT_RESPAWN_WINDOW_OPENED: invalidate timers + respawn config           │
│ → EVENT_MAP_STATUS_UPDATE: invalidate event                                 │
│                                                                              │
│ UI Updates:                                                                  │
│ → Kill history shows new kill                                               │
│ → Rankings updated                                                           │
│ → Timer badge shows new window                                              │
│ → Map cards cleared (no assignments)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Scenariusz: Manual close respawn window

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. WEB CLIENT                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ User clicks "Zamknij okno" in CloseRespawnWindowDialog                      │
│ → useCloseRespawnWindow.mutateAsync({                                       │
│     eventId, heroId,                                                        │
│     createNewWindow: true,                                                  │
│     newMinSpawnTime, newMaxSpawnTime                                        │
│   })                                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. API                                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ POST /guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window  │
│                                                                              │
│ EventRespawnService.closeRespawnWindow()                                    │
│ → Clear assignments                                                         │
│ → Close gaps                                                                │
│ → Delete timer                                                              │
│ → Cancel auto-close job                                                     │
│ → Emit EVENT_RESPAWN_WINDOW_CLOSED                                          │
│                                                                              │
│ [ASYNC] killService.checkAndRecordEventHeroKill(..., isManualClose=true)   │
│ → Players get points even though hero wasn't killed                        │
│                                                                              │
│ openRespawnWindow() [jeśli createNewWindow=true]                           │
│ → Create new timer                                                          │
│ → Schedule auto-close                                                       │
│ → Open gaps                                                                 │
│ → Emit EVENT_RESPAWN_WINDOW_OPENED                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. WEB CLIENT                                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Mutation success:                                                            │
│ → Invalidate hero-respawn-config                                            │
│ → Invalidate event-hero-timers                                              │
│ → Invalidate event                                                          │
│                                                                              │
│ Socket events:                                                               │
│ → EVENT_RESPAWN_WINDOW_CLOSED + EVENT_RESPAWN_WINDOW_OPENED                │
│ → Additional query invalidations                                            │
│                                                                              │
│ UI Updates:                                                                  │
│ → Timer badge shows new window                                              │
│ → Map cards cleared                                                         │
│ → Rankings updated (jeśli manual close = points)                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Ekspertyza i ocena flow'ów

### 7.1 Co działa dobrze

#### 7.1.1 Separation of Concerns

Architektura serwisów jest bardzo czysta:

```
EventsService (Facade)
├── EventKillService      → odpowiedzialny TYLKO za kille
├── EventRespawnService   → odpowiedzialny TYLKO za okna respawnu
├── EventTrackingService  → odpowiedzialny TYLKO za przypisania i presence
├── EventPointsService    → odpowiedzialny TYLKO za punkty
├── EventSummaryService   → odpowiedzialny TYLKO za agregacje
└── EventEmitterService   → odpowiedzialny TYLKO za publikację eventów
```

**Ocena:** Każdy serwis ma jasno zdefiniowaną odpowiedzialność. Łatwo testować i modyfikować.

#### 7.1.2 Transakcyjność operacji krytycznych

```typescript
// event-kill.service.ts
const kill = await this.prisma.$transaction(async (tx) => {
  // 1. Create EventHeroKill
  // 2. Create EventKillPoint per member
  // 3. Clear assignments
  // 4. Close assignment history
  // 5. Fetch created points
});
```

**Ocena:** Atomowość zapewnia, że nie będzie częściowo zapisanego stanu (np. kill bez punktów).

#### 7.1.3 Atomowe zamykanie gaps

```typescript
// event-tracking.service.ts
async closeAllGapsForHero(heroNpcId: string): Promise<void> {
  await this.prisma.$transaction(
    openGaps.map((gap) => this.prisma.eventMapCoverageGap.update(...))
  );
}
```

**Ocena:** Zapobiega race conditions gdzie presence event mógłby otworzyć nowy gap podczas sekwencyjnego zamykania.

#### 7.1.4 Synthetic NPC ID

```typescript
function getSyntheticNpcId(heroId: string): number {
  let hash = 0;
  for (let i = 0; i < heroId.length; i++) {
    hash = ((hash << 5) - hash) + heroId.charCodeAt(i);
    hash |= 0;
  }
  return -Math.abs(hash || 1); // Zawsze ujemna liczba
}
```

**Ocena:** Eleganckie rozwiązanie problemu herosów bez realnego npcId z gry. Ujemne ID gwarantuje brak kolizji z prawdziwymi NPC.

#### 7.1.5 Summary Aggregation

Po zamknięciu okna respawnu, raw data (presence logs, coverage gaps) są agregowane do `EventRespawnWindowSummary`, a następnie usuwane:

```typescript
// event-summary.service.ts
async createWindowSummary() {
  // 1. Calculate stats from raw data
  // 2. Create summary with aggregated JSON
  // 3. DELETE EventPresenceLog records
  // 4. DELETE EventMapCoverageGap records
}
```

**Ocena:** Zapobiega nieograniczonemu wzrostowi danych. Summary zawiera wszystko potrzebne do wyświetlenia kill timeline.

#### 7.1.6 Retry Logic w RabbitMQ

```typescript
// gateway-queue.handler.ts
await this.retryService.handleRetryLogic(data, async () => {
  await this.gatewayService.handleEventHeroKilled(data);
});
```

**Ocena:** 3 retries z exponential backoff + Dead Letter Queue zapewnia resilience.

### 7.2 Potencjalne problemy

#### 7.2.1 Race Condition w Presence Tracking

**Problem:**

```
Thread 1: handlePlayerPresenceChange(player1, mapA, hasPlayer=true)
Thread 2: handlePlayerPresenceChange(player1, mapA, hasPlayer=false)
```

Jeśli oba wywołania wykonują się równocześnie, mogą stworzyć niespójny stan:
- Oba sprawdzają `getActiveNonAfkPlayersOnMap()` w tym samym momencie
- Oba widzą różne stany
- Końcowy wynik zależy od kolejności commit'ów

**Rekomendacja:** Dodać distributed lock per (guildId, mapName, discordId):

```typescript
async handlePlayerPresenceChange(...) {
  const lockKey = `presence:${guildId}:${mapName}:${discordId}`;
  await this.redisLock.acquire(lockKey, async () => {
    // ... obecna logika
  });
}
```

#### 7.2.2 Fire-and-Forget w Manual Close

**Problem:**

```typescript
// event-respawn.service.ts
if (!isAutoClose && timer) {
  this.killService
    .checkAndRecordEventHeroKill(..., true)
    .catch((err) => {
      this.logger.error({ message: 'Failed to record hero kill...' });
    });
}
```

Błędy są tylko logowane. Użytkownik nie wie, że punkty nie zostały naliczone.

**Rekomendacja:** Albo:
1. `await` i propaguj błąd do użytkownika
2. Użyj Bull Queue z retry (traktuj jak job)

#### 7.2.3 Brak Idempotentności

**Problem:** Powtórne wywołanie niektórych operacji może powodować duplikaty:

```typescript
// assignMemberToMap - wywołane 2x
await this.prisma.eventMapAssignmentHistory.create({
  data: { mapId, heroNpcId, memberId, assignedAt: new Date() }
});
```

Jeśli request zostanie ponowiony (np. timeout + retry), utworzy się duplikat historii.

**Rekomendacja:** Dodać idempotency key lub sprawdzać czy już istnieje:

```typescript
const existing = await this.prisma.eventMapAssignmentHistory.findFirst({
  where: { mapId, memberId, unassignedAt: null }
});
if (existing) return; // Already assigned
```

#### 7.2.4 Złożoność Coverage Gap Logic

**Problem:** Dwa typy gapów (UNASSIGNED/UNCOVERED) z różnymi regułami otwierania/zamykania:

| Akcja | UNASSIGNED | UNCOVERED |
|-------|------------|-----------|
| Pierwszy assign | close | open |
| Ostatni unassign | open | close |
| Gracz wchodzi (non-AFK) | - | close |
| Gracz wychodzi / wszyscy AFK | - | open |
| Kill recorded | close | close |
| Window opens | open (jeśli brak assign) | open (jeśli są assign) |

To jest trudne do śledzenia i może prowadzić do bugów przy edge cases.

**Rekomendacja:** Rozważyć uproszczenie do jednego typu "gap" z flagą `hasAssignedMembers`:

```typescript
interface CoverageGap {
  mapId: string;
  hasAssignedMembers: boolean;
  hasActivePresence: boolean;
  startedAt: Date;
}
```

#### 7.2.5 N+1 Query w Presence Handling

**Problem:**

```typescript
for (const map of eventMaps) {
  const hasActiveWindow = await this.hasActiveRespawnWindow(...);
  // ... więcej queries per map
}
```

Dla herosa z 10 mapami = 10 queries do sprawdzenia okna.

**Rekomendacja:** Batch fetch timers na początku:

```typescript
const heroIds = [...new Set(eventMaps.map(m => m.heroNpcId))];
const timers = await this.prisma.timer.findMany({
  where: { npcId: { in: heroIds.map(getSyntheticNpcId) } }
});
const timerMap = new Map(timers.map(t => [t.npcId, t]));

for (const map of eventMaps) {
  const hasActiveWindow = timerMap.has(getSyntheticNpcId(map.heroNpcId));
}
```

### 7.3 Rekomendacje do wdrożenia

#### 7.3.1 Krytyczne (wysoki priorytet)

1. **Distributed lock na presence updates**
   - Zapobiegnie race conditions
   - Użyć Redis lock z TTL 5s
   - Lock key: `presence:${guildId}:${mapName}:${discordId}`

2. **Await lub queue dla manual close kill recording**
   - Alternatywa A: `await` i zwróć błąd użytkownikowi
   - Alternatywa B: Bull Queue job z retry

#### 7.3.2 Ważne (średni priorytet)

3. **Idempotency dla przypisań**
   - Sprawdzać czy już istnieje przed utworzeniem
   - Lub dodać unique constraint + UPSERT

4. **Batch queries dla presence handling**
   - Fetch wszystkie potrzebne timers na początku
   - Użyć Map dla O(1) lookup

#### 7.3.3 Usprawnienia (niski priorytet)

5. **Monitoring dla auto-close jobs**
   - Dashboard z listą pending/failed jobs
   - Alerty dla failed jobs

6. **Uproszczenie coverage gap logic**
   - Jeden typ gap z flagami
   - Mniej edge cases do śledzenia

7. **Dead Letter Queue handling**
   - Dashboard do przeglądania DLQ
   - Możliwość re-queue'owania

---

## 8. Appendix - Typy danych i interfejsy

### 8.1 Kluczowe interfejsy (Backend)

```typescript
// interfaces/kill-timer-data.interface.ts
interface KillTimerData {
  minSpawnTime: Date;
  maxSpawnTime: Date;
  memberId: number;
  previousMinSpawnTime: Date | null;
  previousMaxSpawnTime: Date | null;
  windowOpenedAt: Date | null;
}

// interfaces/respawn-window.interface.ts
interface CloseRespawnWindowOptions {
  createNewWindow?: boolean;
  newMinSpawnTime?: Date;
  newMaxSpawnTime?: Date;
  isAutoClose?: boolean;
}

interface OpenRespawnWindowOptions {
  minSpawnTime: Date;
  maxSpawnTime: Date;
}
```

### 8.2 Event Payloads (RabbitMQ)

```typescript
// EVENT_HERO_KILLED
{
  guildId: string;
  eventId: string;
  killId: string;
}

// EVENT_RESPAWN_WINDOW_OPENED / CLOSED
{
  guildId: string;
  eventId: string;
  heroId: string;
}

// EVENT_MAP_STATUS_UPDATE
{
  guildId: string;
  eventId: string;
  mapId: string;
  mapName: string;
}

// EVENT_RANKING_UPDATE
{
  guildId: string;
  eventId: string;
  rankings: EventRanking[];
}

// PRESENCE_COVERAGE_CHECK
{
  guildId: string;
  mapName: string;
  discordId: string;
  hasPlayer: boolean;
  isAfk?: boolean;
}
```

### 8.3 Typy Frontend

```typescript
type WindowStatus = "OPEN" | "WAITING" | "NONE";

type MapStatus =
  | "ASSIGNED_PRESENT"   // Ktoś przypisany I obecny (zielony)
  | "ASSIGNED_ABSENT"    // Ktoś przypisany ale nieobecny (żółty)
  | "ASSIGNED_AFK"       // Ktoś przypisany ale AFK (pomarańczowy)
  | "UNASSIGNED";        // Nikt nie przypisany (czerwony)

type CoverageGapType = "UNASSIGNED" | "UNCOVERED";

interface PlayerPresence {
  world: string;
  name: string;
  characterId: string;
  accountId: string;
  mapId?: number;
  mapName?: string;
  isAfk: boolean;
  updatedAt: number;
  sessionId: string;
}
```

### 8.4 Database Schema (kluczowe modele)

```prisma
model Event {
  id                    String          @id @default(cuid())
  guildId               String
  name                  String
  world                 String
  active                Boolean         @default(true)
  startsAt              DateTime?
  endsAt                DateTime?
  basePointsPerKill     Int             @default(100)
  autoCalculatePoints   Boolean         @default(true)
  mapAssignmentCap      Int?
  timeOfDayMultipliers  Json?
  trackersMultipliers   Json?
  mapsCountMultipliers  Json?

  heroNpcs              EventHeroNpc[]
  rankings              EventRanking[]
}

model EventHeroNpc {
  id        String    @id @default(cuid())
  eventId   String
  npcId     Int?
  npcName   String
  npcIcon   String?

  event     Event     @relation(...)
  maps      EventMap[]
  kills     EventHeroKill[]
  locations EventMapLocation[]
}

model EventMap {
  id              String    @id @default(cuid())
  heroNpcId       String
  mapId           Int
  mapName         String
  locationId      String?

  heroNpc         EventHeroNpc    @relation(...)
  assignedMembers Member[]
  presenceLogs    EventPresenceLog[]
  coverageGaps    EventMapCoverageGap[]
  assignmentHistory EventMapAssignmentHistory[]
}

model EventHeroKill {
  id                  String    @id @default(cuid())
  heroNpcId           String
  killedAt            DateTime
  minSpawnTimeAtKill  DateTime
  maxSpawnTimeAtKill  DateTime
  timerCreatedById    Int?
  isManualClose       Boolean   @default(false)

  heroNpc             EventHeroNpc  @relation(...)
  points              EventKillPoint[]
  summary             EventRespawnWindowSummary?
}

model EventKillPoint {
  id                String    @id @default(cuid())
  killId            String
  memberId          Int
  mapName           String
  basePoints        Int
  points            Int
  appliedMultiplier Float
  timeOnMapSeconds  Int
  afkPercentage     Float
  wasPresent        Boolean
}

model EventRanking {
  id              String    @id @default(cuid())
  eventId         String
  memberId        Int
  heroNpcName     String
  totalPoints     Int       @default(0)
  totalKills      Int       @default(0)
  totalTimeSeconds Int      @default(0)
  avgAfkPercentage Float    @default(0)
  pointsModified  Boolean   @default(false)
}

model EventMapCoverageGap {
  id              String          @id @default(cuid())
  mapId           String
  heroNpcId       String
  gapType         CoverageGapType
  startedAt       DateTime        @default(now())
  endedAt         DateTime?
  durationSeconds Int?
}

model EventPresenceLog {
  id        String    @id @default(cuid())
  mapId     String
  memberId  Int
  isAfk     Boolean   @default(false)
  startedAt DateTime  @default(now())
  endedAt   DateTime?
}

model EventRespawnWindowSummary {
  id                    String    @id @default(cuid())
  heroNpcId             String
  killId                String?   @unique
  windowOpenedAt        DateTime
  windowClosedAt        DateTime
  minSpawnTime          DateTime
  maxSpawnTime          DateTime
  wasManualClose        Boolean
  totalWindowSeconds    Int
  totalCoverageSeconds  Int
  coveragePercentage    Float
  memberStats           Json
  mapStats              Json
  gapsTimeline          Json
}
```

---

## Podsumowanie

Moduł Events jest dobrze zaprojektowany z czystą architekturą i jasnym podziałem odpowiedzialności. Główne flow'y (respawn window lifecycle, kill recording, presence tracking) są logiczne i spójne.

Kluczowe obszary wymagające uwagi:
1. **Race conditions** w presence tracking - wymaga distributed locking
2. **Fire-and-forget** dla manual close - wymaga lepszego error handling
3. **Idempotentność** - niektóre operacje mogą tworzyć duplikaty przy retry

Architektura real-time (Game Client → Gateway → RabbitMQ → API → Gateway → Web Client) jest solidna i zapewnia odpowiedni poziom decoupling'u między komponentami.

---

*Dokumentacja wygenerowana: 2025-12-12*
*Autor: Claude Opus 4.5*
