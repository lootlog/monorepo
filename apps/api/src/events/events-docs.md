# Events Feature - analiza end-to-end (API, Web, Gateway)

## 1. Zakres

Analiza obejmuje moduł `events` w:

- API: `apps/api/src/events`
- Web: `apps/web/src/features/events`
- Gateway: `apps/gateway/src/gateway`

Dokument opisuje:

- aktualne flow end-to-end,
- kontrakty read-modeli i realtime,
- wykryte i naprawione problemy logiczne,
- pozostałe hotspoty wydajności,
- nieużywane pola/martwy kod,
- rekomendacje dalszych kroków.

---

## 2. Aktualna architektura

### 2.1 API (NestJS)

Główne serwisy:

- `EventsService` - facade i endpointy read/write
- `EventKillService` - kill detection, kill history, kill detail
- `EventRespawnService` - lifecycle okna respawnu
- `EventTrackingService` - przypisania, presence, coverage gaps
- `EventPointsService` - ranking i przeliczenia punktów
- `EventSummaryService` - agregacja summary okna
- `EventEmitterService` - publikacja eventów do RabbitMQ

### 2.2 Gateway (RabbitMQ -> Socket.IO)

- Konsumuje routing keys `event.*` w `gateway-queue.handler.ts`
- Broadcastuje do roomu `{guildId}:events` w `gateway.service.ts`

### 2.3 Web (React + React Query)

Read path jest rozdzielony na read-modele:

- `useEvents` -> lista eventów
- `useEventOverview` -> meta eventu i heroes (lekki model)
- `useEventMaps` -> mapy/przypisania (read-model realtime)
- `useEventRanking` -> ranking
- `useEventKillHistory`, `useHeroKillHistory`, `useKillDetail`
- `useEventHeroTimers`, `useEventHeroStats`

---

## 3. Ścieżki end-to-end

### 3.1 Otwieranie okna respawnu

`POST /guilds/:guildId/events/:eventId/heroes/:heroId/open-respawn-window`

Flow:

1. Walidacja hero/event.
2. `timer.upsert(...)` + `windowOpenedAt`.
3. Schedule auto-close job.
4. Otwarcie gapów (`UNASSIGNED`/`UNCOVERED`) dla map hero.
5. Emisje:
   - `EVENT_RESPAWN_WINDOW_OPENED`
   - `EVENT_MAP_STATUS_UPDATE` (per mapa)
   - `GUILDS_TIMERS_UPDATE`

### 3.2 Zamknięcie okna respawnu

`POST /guilds/:guildId/events/:eventId/heroes/:heroId/close-respawn-window`

- Manual close:
  - wywołuje `recordHeroKill(..., isManualClose=true)` z `await`,
  - czyści timer i auto-close job,
  - emituje `EVENT_RESPAWN_WINDOW_CLOSED` + `EVENT_MAP_STATUS_UPDATE`.

- Auto-close:
  - nie nalicza punktów,
  - czyści przypisania i assignment history,
  - tworzy summary (`killId=null`),
  - emituje `EVENT_RESPAWN_WINDOW_CLOSED` + `EVENT_MAP_STATUS_UPDATE`.

### 3.3 Kill flow

Timer update -> `checkAndRecordEventHeroKill(...)`:

- lock + dedup na Redis,
- zapis kill + punktów + cleanup przypisań w transakcji,
- update rankingu,
- summary,
- emisje:
  - `EVENT_HERO_KILLED`
  - `EVENT_RESPAWN_WINDOW_CLOSED`
  - opcjonalnie `EVENT_RESPAWN_WINDOW_OPENED`
  - `EVENT_MAP_STATUS_UPDATE` per mapa

### 3.4 Presence flow

Gateway `PRESENCE_UPDATE` -> API `handlePlayerPresenceChange`.

Aktualny stan:

- lock per `presence:lock:${guildId}:${mapName}:${discordId}`,
- batch lookup aktywnych timerów (bez per-map `findUnique`),
- batch lookup aktywnych non-AFK presence per mapa (N+1 usunięte),
- nadal występują per-map zapisy/aktualizacje presence logów i emisje map status.

---

## 4. Read-modele i payloady

## 4.1 Endpointy

- `GET /guilds/:guildId/events`
  - lekka lista eventów (bez multipliers/config i bez ciężkich joinów).
- `GET /guilds/:guildId/events/:eventId/overview`
  - meta eventu + heroes (bez map/rankingu).
- `GET /guilds/:guildId/events/:eventId/maps`
  - mapy, lokalizacje, assignedMembers (member payload ograniczony do `id/name/avatar/userId` + tylko najwyższa rola `position/color`).
- `GET /guilds/:guildId/events/:eventId/ranking`
  - ranking.
- `GET /guilds/:guildId/events/:eventId/timers`
  - odchudzony payload timerów (bez `member`, bez nieużywanych pól, `npc` zredukowane do `name/icon`).

## 4.2 Web cache keys

Realtime/mutacje są spięte z:

- `event-overview`
- `event-maps`
- `event-ranking`
- `event-kill-history`
- `hero-kill-history`
- `recent-hero-kills`
- `event-hero-timers`
- `hero-respawn-config`
- `map-active-gap`

Globalny `["event", guildId, eventId]` został usunięty z aktywnego flow.

---

## 5. Realtime contract (API -> Gateway -> Web)

Routing keys:

- `event.map-status.update`
- `event.hero.killed`
- `event.ranking.update`
- `event.respawn-window.opened`
- `event.respawn-window.closed`

Socket payloady:

- `EVENT_MAP_STATUS_UPDATE`:
  - `{ guildId: string, eventId: string, mapId: string }`
- `EVENT_HERO_KILLED`:
  - `{ guildId: string, eventId: string, killId: string }`
- `EVENT_RANKING_UPDATE`:
  - `{ guildId: string, eventId: string }`
- `EVENT_RESPAWN_WINDOW_OPENED/CLOSED`:
  - `{ guildId: string, eventId: string, heroId: string }`

`mapName` został usunięty z `EVENT_MAP_STATUS_UPDATE` jako nieużywany przez frontend.

---

## 6. Problemy logiczne i ich status

## 6.1 Naprawione

1. Realtime invalidował ciężkie/full-event refetche (`["event", ...]`) - usunięte.
2. Część mutacji/map assignment wykonywała zbędne invalidacje list eventów - ograniczone.
3. `reorderLocations` robił optimistic update na martwym query key - przepięte na `event-maps`.
4. Presence miało N+1 non-AFK checks per mapa - zastąpione batch lookup.
5. Duplikacja read logic `getEvent` vs `getEventOverview` - `getEvent` deleguje do overview.
6. Realtime payload `EVENT_MAP_STATUS_UPDATE` zawierał nieużywane `mapName` - usunięte.
7. Kill-points edit nie odświeżał wszystkich list killi - invalidacje dopięte (`event/hero/recent kill history`).
8. Overfetch `roles` w map read-modelu - zredukowany do top-roli (bez pełnej listy ról membera).
9. Overfetch w event timers (`npc` JSON + member metadata) - payload zredukowany do pól używanych przez UI.
10. `getKillDetail` miał N+1 na assignment history/presence fallback per uczestnik - zastąpione batch query (jedno zapytanie assignment + jedno zbiorcze presence fallback).

## 6.2 Do obserwacji

1. `EVENT_MAP_STATUS_UPDATE` może nadal powodować częste refetche `event-maps` przy dużym ruchu presence.
2. `getKillDetail` pozostaje kosztowny obliczeniowo przy bardzo dużej liczbie uczestników, ale bez wcześniejszego N+1 na uczestnika.

---

## 7. Hotspoty wydajności (stan po optymalizacjach)

1. `GET /events/:eventId/maps`
   - nadal najcięższy read-model (locations + maps + assignedMembers), mimo redukcji member/roles payloadu.
2. Presence update path
   - read N+1 został usunięty, ale write path jest nadal per-map (update/create + emit).
3. `getKillDetail`
   - enrichment map/assignment/presence jest nadal kosztowny przy dużej liczbie uczestników (mimo batch query).
4. Auto-close job cleanup
   - nadal opiera się na skanowaniu jobów zamiast zawsze po deterministycznym jobId lookup.

---

## 8. Nieużywane pola / martwy kod

## 8.1 DB

- `EventMapCoverageGap.hadAssignedMembers` (`apps/api/prisma/schema.prisma`)
  - pole nadal nieużywane w `apps/api/src/events/**` (brak odczytu/zapisu).

## 8.2 API/Web

- `event.updatedAt` z `GET /events` - brak użycia w UI `events`.
- `killDetail.timerCreatedBy` / `timerCreatedById` - typowane, ale nierenderowane w `kill-detail`.

## 8.3 Gateway

- Usunięte nieużywane interfejsy `HeroKill` i `EventRanking` z `margo-event.types.ts`.

---

## 9. Ocena struktury i best practices

Mocne strony:

- wyraźny podział odpowiedzialności serwisów,
- lock + dedup dla krytycznego kill flow,
- transakcyjność przy punktach i cleanupie,
- read-model split (`overview/maps/ranking`) ograniczający overfetching.

Do dalszego porządkowania:

- formalne DTO per read-model (`EventListItemDto`, `EventOverviewDto`, `EventMapsDto`),
- jeszcze precyzyjniejsze invalidacje (tam, gdzie można przejść na `setQueryData`),
- rozważenie snapshot/read model cache dla `event-maps` przy bardzo aktywnym presence.

---

## 10. Proponowane kolejne kroki

1. Dodać lekkie endpointy pod ranking preview / hero cards, jeśli `event-maps` dalej okaże się za ciężkie.
2. Ograniczyć payload `event-maps` np. przez feature-flagowane `includeRoles=false` tam, gdzie role nie są potrzebne.
3. Rozważyć dodatkowy read-model pod kill detail timeline (denormalizowany snapshot), żeby odciążyć runtime enrichment.
4. Usunąć `hadAssignedMembers` migracją cleanup (albo wdrożyć jego realne użycie analityczne).

---

Dokument zaktualizowany: 2026-02-18
