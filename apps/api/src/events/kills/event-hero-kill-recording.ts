import type { Logger } from "#src/shared/application-logger";
import { Clock, Effect } from "effect";
import type { Queue } from "bullmq";
import type {
  eventHeroNpcTable,
  eventTable,
} from "#src/database/drizzle/event.schema";
import {
  runPromiseAdapter,
  withEventAdapterSpan,
} from "#src/events/event-adapter";
import type { EventEmitter } from "#src/events/event-emitter";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { EventPoints } from "#src/events/kills/event-points.service";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";
import type { EventPresenceTracking } from "#src/events/monitoring/event-presence-tracking";
import type { EventSummary } from "#src/events/monitoring/event-summary.service";
import type { AutoCloseRespawnWindowJobData } from "#src/events/respawn/auto-close-respawn-window-job-data";
import type { KillTimerData } from "#src/events/respawn/kill-timer-data";
import { getEventHeroKillWindowKey } from "#src/events/kills/event-hero-kill-job";
import {
  getEffectiveWindowEndAt,
  getTrackingWindowStartTime,
} from "#src/events/monitoring/tracking-window";
import type { EventKillPoints } from "#src/events/kills/event-kill-points";
import type { EventKillStore } from "#src/events/kills/event-kill.repository";

type Event = typeof eventTable.$inferSelect;

type EventHeroNpc = typeof eventHeroNpcTable.$inferSelect;

/** Records one hero kill with its points, then closes the respawn window around it. */
export const makeEventHeroKillRecording = (
  repository: Pick<EventKillStore, "findMaps" | "recordKill">,
  eventEmitter: EventEmitter,
  eventReadCache: EventReadCache,
  pointsService: Pick<EventPoints, "updateRankingAfterKill">,
  killPoints: EventKillPoints,
  trackingService: EventPresenceTracking,
  summaryService: EventSummary,
  respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
  logger: Logger,
) => {
  function recordHeroKill(
    guildId: string,
    eventHero: EventHeroNpc,
    event: Event,
    // A manual close records the kill of a timer that may have no creator.
    timerData: Omit<KillTimerData, "memberId"> & {
      readonly memberId: number | null;
    },
    isManualClose = false,
  ) {
    return Effect.gen(function* () {
      const killedAt = new Date(yield* Clock.currentTimeMillis);
      const minSpawnTimeAtKill = timerData.previousMinSpawnTime ?? killedAt;
      const maxSpawnTimeAtKill = timerData.previousMaxSpawnTime ?? killedAt;

      const effectiveKilledAt = getEffectiveWindowEndAt(
        killedAt,
        maxSpawnTimeAtKill,
      );

      const windowOpenedAt =
        timerData.windowOpenedAt ?? timerData.previousMinSpawnTime ?? killedAt;

      const scoringWindowStartTime =
        windowOpenedAt > effectiveKilledAt ? effectiveKilledAt : windowOpenedAt;

      const trackingWindow = {
        killedAt: effectiveKilledAt,
        minSpawnTimeAtKill,
      };

      const trackingWindowStartTime =
        getTrackingWindowStartTime(trackingWindow);

      const heroMaps = yield* repository.findMaps(eventHero.id);
      const heroMapIds = heroMaps.map((map) => map.id);

      const kill = yield* repository.recordKill(
        {
          heroNpcId: eventHero.id,
          killedAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill,
          timerCreatedById: timerData.memberId,
          isManualClose,
          windowKey: getEventHeroKillWindowKey(timerData),
          mapIds: heroMapIds,
          assignmentOverlapStart: scoringWindowStartTime,
        },
        killPoints.buildKillPoints({
          eventHero,
          event,
          heroMaps,
          heroMapIds,
          killedAt,
          effectiveKilledAt,
          minSpawnTimeAtKill,
          maxSpawnTimeAtKill,
          scoringWindowStartTime,
          trackingWindowStartTime,
        }),
      );

      if (kill === null) {
        logger.debug({
          message:
            "Skipping duplicate event hero kill - window already recorded",
          guildId,
          heroId: eventHero.id,
          eventId: event.id,
        });

        return;
      }

      if (kill.points.length > 0) {
        yield* pointsService.updateRankingAfterKill(event.id, kill.points);
      }

      yield* trackingService.closeAllGapsForHero(eventHero.id);

      if (
        !isManualClose &&
        timerData.minSpawnTime &&
        timerData.maxSpawnTime &&
        timerData.minSpawnTime > killedAt
      ) {
        yield* Effect.forEach(
          heroMaps,
          (map) =>
            trackingService.openUnassignedGap(map.id, eventHero.id, killedAt),
          { concurrency: "unbounded", discard: true },
        );
        logger.debug({
          message: "Opened UNASSIGNED gaps for new respawn window",
          heroId: eventHero.id,
          mapsCount: heroMaps.length,
        });
      }

      yield* summaryService.createWindowSummary(
        eventHero.id,
        kill.kill.id,
        windowOpenedAt,
        effectiveKilledAt,
        timerData.previousMinSpawnTime ?? killedAt,
        timerData.previousMaxSpawnTime ?? killedAt,
        isManualClose,
      );

      yield* cancelScheduledAutoClose(eventHero.id);

      yield* eventReadCache
        .invalidateEvent(guildId, event.id)
        .pipe(withEventAdapterSpan("redis.eventReadCache.invalidate"));

      const scope = {
        guildId,
        eventId: event.id,
        heroNpcLvl: eventHero.npcLvl,
      };

      const windowEmits = isManualClose
        ? []
        : [
            eventEmitter.emit(RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED, {
              ...scope,
              heroId: eventHero.id,
            }),
            ...(timerData.minSpawnTime && timerData.maxSpawnTime
              ? [
                  eventEmitter.emit(
                    RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
                    { ...scope, heroId: eventHero.id },
                  ),
                ]
              : []),
          ];

      // Each routing key has its own gateway queue, so their relative order
      // was never delivered; only the cache invalidation above must precede
      // them.
      yield* Effect.forEach(
        [
          eventEmitter.emit(RabbitRoutingKey.EVENT_HERO_KILLED, {
            ...scope,
            killId: kill.kill.id,
          }),
          ...windowEmits,
          ...heroMaps.map((map) =>
            eventEmitter.emit(RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE, {
              ...scope,
              mapId: map.id,
            }),
          ),
        ],
        (emit) => emit.pipe(Effect.withSpan("rabbit.eventEmitter.emit")),
        { concurrency: "unbounded", discard: true },
      );

      return kill.kill;
    }).pipe(Effect.withSpan("events.kills.record"));
  }

  function cancelScheduledAutoClose(heroId: string) {
    return Effect.gen(function* () {
      const delayedJobs = yield* runPromiseAdapter("bull.respawn.getJobs", () =>
        respawnWindowQueue.getJobs(["delayed"]),
      );

      yield* Effect.forEach(
        delayedJobs.filter((job) => job.data.heroId === heroId),
        (job) =>
          runPromiseAdapter("bull.respawn.remove", () => job.remove()).pipe(
            Effect.tap(() =>
              Effect.sync(() =>
                logger.log({
                  message: "Cancelled scheduled auto-close job (kill recorded)",
                  heroId,
                  jobId: job.id,
                }),
              ),
            ),
          ),
        { concurrency: "unbounded", discard: true },
      );
    });
  }

  return recordHeroKill;
};

export type RecordHeroKill = ReturnType<typeof makeEventHeroKillRecording>;
