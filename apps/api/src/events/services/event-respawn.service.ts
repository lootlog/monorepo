import { Clock, Effect } from "effect";
import { HeroRespawnConfigResponse } from "../event-monitoring-response.schema.js";
import { ResourceNotFoundError } from "#src/shared/http/http-errors";
import { getSyntheticNpcId } from "../utils/get-synthetic-npc-id.js";
import type { EventReadCache } from "./event-read-cache.service.js";
import type { EventRespawnStore } from "./event-respawn.repository.js";
import type { EventTimersPort } from "./event-timers.port.js";

export const makeEventRespawn = (
  repository: EventRespawnStore,
  eventReadCache: EventReadCache,
  timers: EventTimersPort,
) => {
  const load = (guildId: string, eventId: string, heroId: string) =>
    Effect.gen(function* () {
      const hero = yield* repository.findHero(guildId, eventId, heroId);
      if (!hero) {
        return yield* Effect.fail(new ResourceNotFoundError("Hero not found"));
      }

      const now = new Date(yield* Clock.currentTimeMillis);
      const timer = yield* timers.getEventRespawnTimer({
        guildId,
        world: hero.event.world,
        npcId: hero.npcId ?? getSyntheticNpcId(heroId),
        npcName: hero.npcName,
      });

      if (!timer) {
        return {
          hasTimer: false,
          windowStatus: "NONE" as const,
          minSpawnTime: null,
          maxSpawnTime: null,
          overdueMs: null,
        };
      }

      const minSpawnTime = new Date(timer.minSpawnTime);
      const maxSpawnTime = new Date(timer.maxSpawnTime);
      if (now < minSpawnTime) {
        return {
          hasTimer: false,
          windowStatus: "WAITING" as const,
          minSpawnTime: timer.minSpawnTime,
          maxSpawnTime: timer.maxSpawnTime,
          overdueMs: null,
        };
      }
      if (now < maxSpawnTime) {
        return {
          hasTimer: true,
          windowStatus: "OPEN" as const,
          minSpawnTime: timer.minSpawnTime,
          maxSpawnTime: timer.maxSpawnTime,
          overdueMs: null,
        };
      }
      return {
        hasTimer: true,
        windowStatus: "OVERDUE" as const,
        minSpawnTime: timer.minSpawnTime,
        maxSpawnTime: timer.maxSpawnTime,
        overdueMs: Math.max(0, now.getTime() - maxSpawnTime.getTime()),
      };
    }).pipe(Effect.withSpan("events.respawn.config.load"));

  return {
    getHeroRespawnConfig(guildId: string, eventId: string, heroId: string) {
      const cacheKey = eventReadCache.getEventKey(
        guildId,
        eventId,
        "hero-respawn-config",
        { heroId },
      );
      return eventReadCache
        .getOrSet(cacheKey, HeroRespawnConfigResponse, () =>
          load(guildId, eventId, heroId),
        )
        .pipe(Effect.withSpan("events.respawn.config"));
    },
  };
};

export type EventRespawn = ReturnType<typeof makeEventRespawn>;
