import type { Queue } from "bullmq";
import type { RedisService } from "#src/redis/redis.service";
import type { EventEmitter } from "#src/events/event-emitter";
import type { EventPoints } from "#src/events/kills/event-points.service";
import type { EventReadCache } from "#src/events/catalog/event-read-cache.service";
import type { EventPresenceTracking } from "#src/events/monitoring/event-presence-tracking";
import type { EventSummary } from "#src/events/monitoring/event-summary.service";
import type { AutoCloseRespawnWindowJobData } from "#src/events/respawn/auto-close-respawn-window-job-data";
import type { ActiveEventHeroStore } from "#src/events/kills/active-event-hero.repository";
import { makeEventHeroKillCheck } from "#src/events/kills/event-hero-kill-check";
import { makeEventHeroKillRecording } from "#src/events/kills/event-hero-kill-recording";
import { makeEventKillPoints } from "#src/events/kills/event-kill-points";
import type { EventKillStore } from "#src/events/kills/event-kill.repository";

export const makeEventKills = (
  repository: EventKillStore,
  activeEventHeroRepository: ActiveEventHeroStore,
  redis: RedisService,
  eventEmitter: EventEmitter,
  eventReadCache: EventReadCache,
  pointsService: EventPoints,
  trackingService: EventPresenceTracking,
  summaryService: EventSummary,
  respawnWindowQueue: Queue<AutoCloseRespawnWindowJobData>,
) => {
  const recordHeroKill = makeEventHeroKillRecording(
    repository,
    eventEmitter,
    eventReadCache,
    pointsService,
    makeEventKillPoints(pointsService),
    trackingService,
    summaryService,
    respawnWindowQueue,
  );

  const checkAndRecordEventHeroKill = makeEventHeroKillCheck(
    repository,
    activeEventHeroRepository,
    redis,
    recordHeroKill,
  );

  return {
    checkAndRecordEventHeroKill,
    recordHeroKill,
  };
};

export type EventKills = ReturnType<typeof makeEventKills>;
