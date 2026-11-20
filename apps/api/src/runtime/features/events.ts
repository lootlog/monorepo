import { makeEventKillHistory } from "#src/events/history/event-kill-history";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeEventTimerStore } from "#src/events/respawn/event-timer.repository";
import {
  makeEventTimersPort,
  type EventTimersPort,
} from "#src/events/respawn/event-timers.port";
import { RedlockService } from "#src/redis/redlock";
import { applicationLogger } from "#src/shared/application-logger";
import {
  RabbitMessaging,
  eventMessage,
  makeEventPublisher,
} from "@lootlog/messaging";
import { Context, Effect, Layer } from "effect";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { RespawnWindowQueue } from "#src/runtime/queues/respawn-window";
import { makeEventAccess } from "#src/events/event-access";
import { makeEventCatalogMutations } from "#src/events/catalog/event-catalog-mutations";
import { makeEventCreation } from "#src/events/catalog/event-creation";
import { makeEventDeletion } from "#src/events/catalog/event-deletion";
import { makeEventGapReads } from "#src/events/monitoring/event-gap-reads";
import { makeEventHeroSummary } from "#src/events/kills/event-hero-summary";
import { makeEventMapAssignments } from "#src/events/coordination/event-map-assignments";
import { makeEventParticipation } from "#src/events/coordination/event-participation";
import { makeEventPointEdits } from "#src/events/kills/event-point-edits";
import { makeEventPointRecalculation } from "#src/events/kills/event-point-recalculation";
import { makeEventPresenceStats } from "#src/events/monitoring/event-presence-stats";
import {
  makeEventPresenceTracking,
  type EventPresenceTracking,
} from "#src/events/monitoring/event-presence-tracking";
import { makeEventRankingRead } from "#src/events/ranking/event-ranking-read";
import { makeEventRespawnCommands } from "#src/events/respawn/event-respawn-commands";
import { makeEventUpdate } from "#src/events/catalog/event-update";
import { makeEventsAssignment } from "#src/events/coordination/events-assignment.operations";
import { makeEventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import { makeEventsCatalog } from "#src/events/catalog/events-catalog.operations";
import { makeEventsMonitoring } from "#src/events/monitoring/events-monitoring.operations";
import { makeEventsPins } from "#src/events/pins/events-pins.operations";
import { makeEventsRanking } from "#src/events/ranking/events-ranking.operations";
import { makeActiveEventHeroStore } from "#src/events/kills/active-event-hero.repository";
import { makeEventEmitter } from "#src/events/event-emitter";
import { makeEventKillStore } from "#src/events/kills/event-kill.repository";
import {
  makeEventKills,
  type EventKills,
} from "#src/events/kills/event-kill.service";
import { makeEventPointsStore } from "#src/events/kills/event-points.repository";
import { makeEventPoints } from "#src/events/kills/event-points.service";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";
import { makeEventRespawnStore } from "#src/events/respawn/event-respawn.repository";
import { makeEventRespawn } from "#src/events/respawn/event-respawn.service";
import { makeEventSummaryStore } from "#src/events/monitoring/event-summary.repository";
import { makeEventSummary } from "#src/events/monitoring/event-summary.service";
import { makeEventWrappedStore } from "#src/events/wrapped/event-wrapped.repository";
import { makeEventWrapped } from "#src/events/wrapped/event-wrapped.service";
import { makePinnedEventsPersistence } from "#src/events/pins/pinned-events.repository";
import { eventDataLayer } from "#src/events/events.data-layer";
import { RecordsServices } from "#src/runtime/features/records";

export class EventTimers extends Context.Service<
  EventTimers,
  EventTimersPort
>()("@lootlog/api/http-api/EventTimers") {}

export const eventTimersLive = Layer.effect(
  EventTimers,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;

    return makeEventTimersPort({
      logger: applicationLogger,
      store: makeEventTimerStore(database),
      amqp: makeEventPublisher(rabbit),
      redis,
      redlock: new RedlockService(redis),
    });
  }),
);

interface EventsServicesValue {
  readonly layer: ReturnType<typeof eventDataLayer>;
  readonly kills: EventKills;
  readonly tracking: EventPresenceTracking;
}

export class EventsServices extends Context.Service<
  EventsServices,
  EventsServicesValue
>()("@lootlog/api/http-api/EventsServices") {}

export const eventsServicesLive = Layer.effect(
  EventsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const timers = yield* EventTimers;
    const { loots } = yield* RecordsServices;
    const respawnQueue = yield* RespawnWindowQueue;

    const amqp = makeEventPublisher(rabbit);
    const readCache = makeEventReadCache(redis);
    const emitter = makeEventEmitter(amqp);
    const summary = makeEventSummary(makeEventSummaryStore(database));

    const tracking = makeEventPresenceTracking(
      database,
      timers,
      new RedlockService(redis),
      emitter,
      readCache,
    );

    const points = makeEventPoints(
      makeEventPointsStore(database),
      emitter,
      readCache,
    );

    const kill = makeEventKills(
      makeEventKillStore(database),
      makeActiveEventHeroStore(database),
      redis,
      emitter,
      readCache,
      points,
      tracking,
      summary,
      respawnQueue,
    );

    const respawn = makeEventRespawn(
      makeEventRespawnStore(database),
      readCache,
      timers,
    );

    const wrapped = makeEventWrapped(
      makeEventWrappedStore(database),
      redis,
      loots,
    );

    const presenceStats = makeEventPresenceStats(database, readCache);
    const rankingRead = makeEventRankingRead(database, readCache);

    const catalogRead = makeEventsCatalogRead(
      database,
      redis,
      applicationLogger,
    );

    const eventAccess = makeEventAccess(database);

    const layer = eventDataLayer({
      history: makeEventKillHistory({
        database,
        eventAccess,
        readCache,
        points,
      }),
      assignment: makeEventsAssignment(
        eventAccess,
        makeEventCatalogMutations(database, redis, applicationLogger),
        makeEventMapAssignments(
          database,
          redis,
          timers,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish(eventMessage(routingKey, payload))
                .pipe(Effect.asVoid),
          },
          applicationLogger,
        ),
      ),
      catalog: {
        ...makeEventsCatalog(wrapped),
        ...catalogRead,
        createEvent: makeEventCreation(database, redis, applicationLogger),
        deleteEvent: makeEventDeletion(
          database,
          redis,
          {
            pending: () =>
              respawnQueue.getJobs(["waiting"]).then((jobs) =>
                jobs.map((job) => ({
                  eventId: job.data.eventId,
                  remove: () => job.remove(),
                })),
              ),
            delayed: () =>
              respawnQueue.getJobs(["delayed"]).then((jobs) =>
                jobs.map((job) => ({
                  eventId: job.data.eventId,
                  remove: () => job.remove(),
                })),
              ),
          },
          applicationLogger,
        ),
        recalculatePoints: makeEventPointRecalculation(
          database,
          redis,
          {
            recalculate: (eventId, basePointsPerKill) =>
              points.recalculateEventPoints(eventId, basePointsPerKill),
          },
          applicationLogger,
        ),
        updateEvent: makeEventUpdate(
          database,
          redis,
          catalogRead,
          applicationLogger,
        ),
      },
      monitoring: makeEventsMonitoring(
        presenceStats,
        respawn,
        eventAccess,
        makeEventGapReads(database, redis, applicationLogger),
        makeEventRespawnCommands(
          database,
          redis,
          timers,
          {
            delayed: () =>
              Effect.tryPromise({
                try: () => respawnQueue.getJobs(["delayed"]),
                catch: (error) => error,
              }).pipe(
                Effect.map((jobs) =>
                  jobs.map((job) => ({
                    heroId: job.data.heroId,
                    remove: Effect.tryPromise({
                      try: () => job.remove(),
                      catch: (error) => error,
                    }).pipe(Effect.asVoid),
                  })),
                ),
              ),
          },
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish(eventMessage(routingKey, payload))
                .pipe(Effect.asVoid),
          },
          {
            record: ({ guildId, hero, event, timer }) =>
              kill
                .recordHeroKill(
                  guildId,
                  hero,
                  event,
                  {
                    minSpawnTime: timer.minSpawnTime,
                    maxSpawnTime: timer.maxSpawnTime,
                    memberId: timer.createdById,
                    previousMinSpawnTime: timer.minSpawnTime,
                    previousMaxSpawnTime: timer.maxSpawnTime,
                    windowOpenedAt: timer.windowOpenedAt,
                  },
                  true,
                )
                .pipe(Effect.asVoid),
          },
          applicationLogger,
        ),
      ),
      pins: makeEventsPins(makePinnedEventsPersistence(database)),
      ranking: makeEventsRanking(
        rankingRead,
        catalogRead,
        eventAccess,
        makeEventParticipation(
          database,
          redis,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish(eventMessage(routingKey, payload))
                .pipe(Effect.asVoid),
          },
          applicationLogger,
        ),
        makeEventPointEdits(
          database,
          redis,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish(eventMessage(routingKey, payload))
                .pipe(Effect.asVoid),
          },
          applicationLogger,
        ),
        makeEventHeroSummary(database, redis, timers, applicationLogger),
      ),
    });

    return { kills: kill, layer, tracking };
  }),
);

export const eventsData = Layer.unwrap(
  Effect.map(EventsServices, ({ layer }) => layer),
);
