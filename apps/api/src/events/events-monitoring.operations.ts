import type { AccessPolicy } from "@lootlog/domain/access-policy";

import type { roleTable } from "#src/database/drizzle/schema";
type Role = typeof roleTable.$inferSelect;
import {
  CloseRespawnWindowDto,
  OpenRespawnWindowDto,
} from "#src/http-api/contracts/events/schemas";
import type { EventCoordination } from "./services/event-coordination.service.js";
import type { EventKills } from "./services/event-kill.service.js";
import type { EventRespawn } from "./services/event-respawn.service.js";
import type { EventPresenceStats } from "./event-presence-stats.js";
import { Effect } from "effect";
import type { EventAccess } from "./event-access.js";
import type { EventGapReads } from "./event-gap-reads.js";
import type { EventRespawnCommands } from "./event-respawn-commands.js";

export const makeEventsMonitoring = (
  coordination: EventCoordination,
  kills: EventKills,
  presenceStats: EventPresenceStats,
  respawn: EventRespawn,
  eventAccess: EventAccess,
  gapReads: EventGapReads,
  respawnCommands: EventRespawnCommands,
) => ({
  getCoordination(guildData: { id: string }, eventId: string) {
    return coordination.getCoordination(guildData.id, eventId);
  },

  getKillTimelineData(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    killId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* kills.getKillTimelineData(
        guildData.id,
        eventId,
        heroId,
        killId,
      );
    }).pipe(Effect.withSpan("EventsMonitoring.getKillTimelineData"));
  },

  getHeroCoverageGaps(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* gapReads.getHeroCoverageGaps(guildData, eventId, heroId);
    }).pipe(Effect.withSpan("EventsMonitoring.getHeroCoverageGaps"));
  },

  getMapCoverageGaps(
    guildData: { id: string },
    eventId: string,
    mapId: string,
  ) {
    return gapReads.getMapCoverageGaps(guildData, eventId, mapId);
  },

  getActiveGapForMap(
    guildData: { id: string },
    eventId: string,
    mapId: string,
  ) {
    return gapReads.getActiveGapForMap(guildData, eventId, mapId);
  },

  getActiveGapsForHero(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* gapReads.getActiveGapsForHero(guildData, eventId, heroId);
    }).pipe(Effect.withSpan("EventsMonitoring.getActiveGapsForHero"));
  },

  getHeroPresenceStats(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* presenceStats.get(guildData.id, eventId, heroId);
    }).pipe(Effect.withSpan("EventsMonitoring.getHeroPresenceStats"));
  },

  getHeroRespawnConfig(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    roles: Role[] = [],
    accessPolicy: AccessPolicy,
  ) {
    return Effect.gen(function* () {
      yield* eventAccess.getHero(
        guildData.id,
        eventId,
        heroId,
        roles,
        accessPolicy,
      );

      return yield* respawn.getHeroRespawnConfig(guildData.id, eventId, heroId);
    }).pipe(Effect.withSpan("EventsMonitoring.getHeroRespawnConfig"));
  },

  closeRespawnWindow(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: CloseRespawnWindowDto,
  ) {
    return respawnCommands.close(guildData, eventId, heroId, data);
  },

  openRespawnWindow(
    guildData: { id: string },
    eventId: string,
    heroId: string,
    data: OpenRespawnWindowDto,
  ) {
    return respawnCommands.open(guildData, eventId, heroId, data);
  },
});

export type EventsMonitoring = ReturnType<typeof makeEventsMonitoring>;
