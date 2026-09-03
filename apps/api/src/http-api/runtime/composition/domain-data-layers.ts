import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { RESPAWN_WINDOW_QUEUE } from "#src/events/respawn/respawn-queue.constant";
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
import { makeEventCoordinationStore } from "#src/events/coordination/event-coordination.repository";
import { makeEventCoordination } from "#src/events/coordination/event-coordination.service";
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
import { makeGuildKillQueries } from "#src/kills/guild-kill-queries";
import { makeKillCreation } from "#src/kills/kill-creation";
import { makeKillStatsPersistence } from "#src/kills/kill-stats-persistence";
import { makeMemberKillQuery } from "#src/kills/member-kill-query";
import { makeUserKillQueries } from "#src/kills/user-kill-queries";
import { ExecutionError, RedlockService } from "#src/redis/redlock";
import { makeLootAllocationPersistence } from "#src/loots/allocation/loot-allocation-persistence";
import { makeLootAllocationOperations } from "#src/loots/allocation/loot-allocation.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/submission/loot-submission-acceptance.repository";
import { makeLootSubmissionAcceptance } from "#src/loots/submission/loot-submission-acceptance.service";
import {
  makeLootsOperations,
  type LootsOperations,
} from "#src/loots/loots.operations";
import { makeLootQueryOperations } from "#src/loots/query/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { makeLootStatsQuery } from "#src/loots/query/loot-stats-query";
import { LootStatsService } from "#src/loots/query/loot-stats.service";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/jobs/dispatch-queue";
import { NOTIFICATIONS_HISTORY_RETENTION_LIMIT } from "#src/notifications/jobs/history";
import { applicationLogger } from "#src/shared/application-logger";
import { Error as NotificationError } from "#src/notifications/error";
import { makeNotificationContent } from "#src/notifications/content/notification-content.service";
import type { JsonValue } from "#src/notifications/notification-database.types";
import { makeNotificationDeliveryResult } from "#src/notifications/delivery/notification-delivery-result";
import {
  makeNotificationEventStore,
  type NotificationEventStore,
} from "#src/notifications/delivery/notification-event-store";
import {
  makeNotificationGuildTargets,
  type NotificationGuildTargets,
} from "#src/notifications/targets/notification-guild-targets";
import { makeNotificationJobDispatch } from "#src/notifications/jobs/notification-job-dispatch";
import { makeNotificationJobOperations } from "#src/notifications/jobs/notification-job-operations";
import {
  makeNotificationJobRebuild,
  type NotificationJobRebuild,
} from "#src/notifications/jobs/notification-job-rebuild";
import { makeNotificationJobRecurrence } from "#src/notifications/jobs/notification-job-recurrence";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job-store";
import {
  makeNotificationMatching,
  type NotificationMatching,
} from "#src/notifications/rules/notification-matching.service";
import { makeNotificationRuleOperations } from "#src/notifications/rules/notification-rule-operations";
import { makeNotificationTestContent } from "#src/notifications/notification-test-content";
import { makeNotificationUserTargets } from "#src/notifications/targets/notification-user-targets";
import { makeNotificationWatchedItems } from "#src/notifications/rules/notification-watched-items";
import {
  DependencyUnavailableError,
  ResourceConflictError,
} from "#src/shared/http/http-errors";
import { PgClient } from "@effect/sql-pg";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Queue } from "bullmq";
import { Context, Effect, Layer, Redacted } from "effect";
import { eventDataLayer } from "#src/http-api/handlers/events/events.data-layer";
import { recordsDataLayer } from "#src/http-api/handlers/records/records.data-layer";
import { notificationDataLayer } from "#src/http-api/handlers/notifications/notifications.data-layer";
import { ApiRedis } from "#src/http-api/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";

import { makeAmqpAdapter } from "#src/http-api/runtime/composition/core-data-layers";
import {
  GuildDiscordSync,
  AccountOrganizationOperations,
} from "#src/http-api/runtime/composition/member-data-layers";
import { EventTimers } from "#src/http-api/runtime/composition/timer-data-layers";
interface RecordsServicesValue {
  readonly layer: ReturnType<typeof recordsDataLayer>;
  readonly loots: LootsOperations;
}

export class RecordsServices extends Context.Service<
  RecordsServices,
  RecordsServicesValue
>()("@lootlog/api/http-api/RecordsServices") {}

export const recordsServicesLive = Layer.effect(
  RecordsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const postgres = yield* PgClient.PgClient;
    const lootStats = new LootStatsService(makeLootStatsQuery(postgres), redis);
    const redlock = new RedlockService(redis).createInstance();
    const acceptance = makeLootSubmissionAcceptance(
      makeLootSubmissionAcceptancePersistence(database),
      {
        publish: (exchange, routingKey, message) =>
          rabbit
            .publish({
              exchange: exchange as "default",
              routingKey: routingKey as Parameters<
                typeof rabbit.publish
              >[0]["routingKey"],
              content: new TextEncoder().encode(JSON.stringify(message)),
            })
            .pipe(Effect.asVoid),
      },
      lootStats,
      {
        deleteByPattern: (pattern) =>
          Effect.tryPromise({
            try: () => redis.deleteByPattern(pattern),
            catch: (cause) => cause,
          }),
      },
      applicationLogger,
      {
        withLock: (resource, ttlMilliseconds, options, effect) =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => redlock.acquire([resource], ttlMilliseconds, options),
              catch: (cause) => {
                if (cause instanceof ExecutionError) {
                  applicationLogger.log({
                    level: "error",
                    message: "Lock acquisition failed for createLoot",
                    resource,
                  });
                  return new DependencyUnavailableError(
                    "Failed to acquire loot lock",
                  );
                }
                return cause;
              },
            }),
            () => effect,
            (heldLock) =>
              Effect.tryPromise(() =>
                (
                  heldLock as Awaited<ReturnType<typeof redlock.acquire>>
                ).release(),
              ).pipe(Effect.ignore),
          ),
      },
    );
    const loots = makeLootsOperations({
      persistence: makeLootPersistence(database),
      query: makeLootQueryOperations(makeLootQueryPersistence(database)),
      stats: lootStats,
      redis,
      logger: applicationLogger,
    });
    const killStatsPersistence = makeKillStatsPersistence(database);
    const killQueryCache = {
      get: (key, schema) =>
        Effect.tryPromise({
          try: () => redis.getJson(key, makeJsonCodec(schema)),
          catch: (error) => error,
        }),
      set: <A>(key: string, value: A, ttlSeconds: number) =>
        Effect.tryPromise({
          try: () => redis.setJson(key, value, ttlSeconds),
          catch: (error) => error,
        }),
    };
    return {
      loots,
      layer: recordsDataLayer({
        createKill: makeKillCreation(
          database,
          {
            deleteByPattern: (pattern) =>
              Effect.tryPromise({
                try: () => redis.deleteByPattern(pattern),
                catch: (error) => error,
              }),
            setNx: (key, value, ttlSeconds) =>
              Effect.tryPromise({
                try: () => redis.setNX(key, value, ttlSeconds),
                catch: (error) => error,
              }),
          },
          applicationLogger,
        ),
        guildKillQueries: makeGuildKillQueries(
          killStatsPersistence,
          killQueryCache,
          applicationLogger,
        ),
        memberKillQuery: makeMemberKillQuery(
          killStatsPersistence,
          killQueryCache,
          applicationLogger,
        ),
        userKillQueries: makeUserKillQueries(
          database,
          killQueryCache,
          applicationLogger,
        ),
        loots,
        lootStats,
        lootSubmissionAcceptance: acceptance,
        lootAllocation: makeLootAllocationOperations({
          persistence: makeLootAllocationPersistence(database),
          cache: {
            deleteByPattern: (pattern) =>
              Effect.tryPromise({
                try: () => redis.deleteByPattern(pattern),
                catch: (error) => error,
              }),
          },
          publisher: {
            publish: (exchange, routingKey, event) =>
              rabbit
                .publish({
                  exchange: exchange as "default",
                  routingKey: routingKey as Parameters<
                    typeof rabbit.publish
                  >[0]["routingKey"],
                  content: new TextEncoder().encode(JSON.stringify(event)),
                })
                .pipe(Effect.asVoid),
          },
          logger: applicationLogger,
        }),
      }),
    };
  }),
);

export const recordsData = Layer.unwrap(
  Effect.map(RecordsServices, ({ layer }) => layer),
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
    const config = yield* ApiRuntimeConfig;
    const timers = yield* EventTimers;
    const { loots } = yield* RecordsServices;
    const queueOptions = {
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        username: config.redis.username,
        password: Redacted.value(config.redis.password),
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
      prefix: "{bull}",
    } as const;
    const queues = yield* Effect.acquireRelease(
      Effect.sync(() => ({
        respawn: new Queue(RESPAWN_WINDOW_QUEUE, queueOptions),
      })),
      ({ respawn }) => Effect.tryPromise(() => respawn.close()),
    );
    const amqp = makeAmqpAdapter(rabbit);
    const readCache = makeEventReadCache(redis);
    const emitter = makeEventEmitter(amqp);
    const summary = makeEventSummary(makeEventSummaryStore(database));
    const tracking = makeEventPresenceTracking(
      database,
      timers,
      new RedlockService(redis),
      emitter,
      applicationLogger,
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
      timers,
      queues.respawn,
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
    const coordination = makeEventCoordination(
      makeEventCoordinationStore(database),
      timers,
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
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
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
              queues.respawn.getJobs(["waiting"]).then((jobs) =>
                jobs.map((job) => ({
                  eventId: job.data.eventId,
                  remove: () => job.remove(),
                })),
              ),
            delayed: () =>
              queues.respawn.getJobs(["delayed"]).then((jobs) =>
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
        coordination,
        kill,
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
                try: () => queues.respawn.getJobs(["delayed"]),
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
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
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
                    memberId: timer.createdById ?? undefined,
                    previousMinSpawnTime: timer.minSpawnTime,
                    previousMaxSpawnTime: timer.maxSpawnTime,
                    windowOpenedAt: timer.windowOpenedAt ?? undefined,
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
        kill,
        catalogRead,
        eventAccess,
        makeEventParticipation(
          database,
          redis,
          {
            publish: (routingKey, payload) =>
              rabbit
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
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
                .publish({
                  exchange: "default",
                  routingKey,
                  content: new TextEncoder().encode(JSON.stringify(payload)),
                })
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

interface NotificationsServicesValue {
  readonly layer: ReturnType<typeof notificationDataLayer>;
  readonly scheduler: ReturnType<typeof makeNotificationJobScheduler>;
  readonly matching: NotificationMatching;
  readonly store: NotificationEventStore;
  readonly targets: NotificationGuildTargets;
  readonly dispatch: ReturnType<typeof makeNotificationJobDispatch>;
  readonly delivery: ReturnType<typeof makeNotificationDeliveryResult>;
  readonly rebuild: NotificationJobRebuild;
}

export class NotificationsServices extends Context.Service<
  NotificationsServices,
  NotificationsServicesValue
>()("@lootlog/api/http-api/NotificationsServices") {}

export const notificationsServicesLive = Layer.effect(
  NotificationsServices,
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const guildSync = yield* GuildDiscordSync;
    const userGuilds = yield* AccountOrganizationOperations;
    const queue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(NOTIFICATIONS_DISPATCH_QUEUE, {
            connection: {
              host: config.redis.host,
              port: config.redis.port,
              username: config.redis.username,
              password: Redacted.value(config.redis.password),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
            prefix: "{bull}",
          }),
      ),
      (notificationsQueue) =>
        Effect.tryPromise(() => notificationsQueue.close()),
    );
    const store = makeNotificationEventStore(database);
    const jobsStore = makeNotificationJobStore(database);
    const matching = makeNotificationMatching(database);
    const content = makeNotificationContent();
    const testContent = makeNotificationTestContent(store, matching, content);
    const notificationScheduler = makeNotificationJobScheduler(database, {
      remove: (jobId) =>
        Effect.tryPromise({
          try: async () => {
            const job = await queue.getJob(jobId);
            await job?.remove();
          },
          catch: (cause) => cause,
        }),
      add: (jobId, delay) =>
        Effect.tryPromise({
          try: () =>
            queue.add(
              jobId,
              { notificationJobId: jobId },
              {
                jobId,
                delay,
                removeOnComplete: true,
                removeOnFail: true,
              },
            ),
          catch: (cause) => cause,
        }).pipe(Effect.asVoid),
    });
    const rebuild = makeNotificationJobRebuild(
      {
        findRule: (ruleId) => jobsStore.findRule(ruleId),
        timers: jobsStore.findTimers,
      },
      (filters, npcId) => matching.matchesTimerRule(filters, npcId),
      guildSync.hasRequiredGuildPermissions,
      {
        timer: (options) => content.buildTimerNotificationPayload(options),
        scheduledMessage: (options) =>
          content.buildScheduledMessagePayload(options),
      },
      notificationScheduler,
    );
    const dispatch = makeNotificationJobDispatch(
      {
        find: jobsStore.findJobWithRelations,
        update: jobsStore.updateJob,
        claim: jobsStore.claimJob,
      },
      {
        hasRequiredGuildPermissions: guildSync.hasRequiredGuildPermissions,
      },
      {
        publish: (payload) =>
          rabbit
            .publish({
              exchange: "default",
              routingKey: RabbitRoutingKey.NOTIFICATIONS_DISCORD_SEND,
              content: new TextEncoder().encode(JSON.stringify(payload)),
            })
            .pipe(Effect.asVoid) as Effect.Effect<void, unknown, never>,
      },
      notificationScheduler,
      (value) => content.parseAllowedMentions(value as JsonValue),
    );
    const recurrence = makeNotificationJobRecurrence(
      {
        findRule: jobsStore.findRule,
        cycleStatuses: jobsStore.cycleStatuses,
        advance: jobsStore.advanceRule,
      },
      guildSync.hasRequiredGuildPermissions,
      {
        scheduledMessage: (options) =>
          content.buildScheduledMessagePayload(options),
      },
      notificationScheduler,
    );
    const delivery = makeNotificationDeliveryResult(
      {
        find: jobsStore.findJob,
        record: jobsStore.recordDelivery,
        prune: ({ ownerType, ownerId }) =>
          jobsStore.prune(
            ownerType,
            ownerId,
            ["SENT", "FAILED", "CANCELED"],
            NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
          ),
      },
      notificationScheduler,
      recurrence,
    );
    const targets = makeNotificationGuildTargets(
      database,
      {
        selectable: guildSync.getSelectableGuildChannels,
      },
      {
        cancel: notificationScheduler.cancel,
      },
    );
    return {
      scheduler: notificationScheduler,
      matching,
      store,
      targets,
      dispatch,
      delivery,
      rebuild,
      layer: notificationDataLayer({
        guildTargets: targets,
        jobOperations: makeNotificationJobOperations(database, {
          cancel: notificationScheduler.cancel,
        }),
        rules: makeNotificationRuleOperations(database, {
          ensureGuildPermissions: (guildId) =>
            guildSync.getGuildDiscordSyncStatus(guildId).pipe(
              Effect.flatMap((syncState) =>
                syncState.hasRequiredPermissions
                  ? Effect.succeed(syncState)
                  : Effect.fail(
                      new ResourceConflictError({
                        message:
                          NotificationError.DISCORD_BOT_MISSING_REQUIRED_PERMISSIONS,
                        missingPermissions: syncState.missingPermissions,
                        syncState,
                      }),
                    ),
              ),
            ),
          rebuildJobs: rebuild.rebuildRule,
          cancelJobs: notificationScheduler.cancel,
          buildTestPayload: (options) =>
            testContent({
              ...options,
              notificationRule: {
                ...options.notificationRule,
                filters: options.notificationRule.filters as JsonValue,
              },
            }),
          createTestJob: notificationScheduler.create,
          enqueueJob: notificationScheduler.enqueue,
        }),
        userTargets: makeNotificationUserTargets(database, {
          cancel: notificationScheduler.cancel,
          create: notificationScheduler.create,
          enqueue: notificationScheduler.enqueue,
        }),
        watchedItems: makeNotificationWatchedItems(
          database,
          {
            list: (discordId, userId) =>
              userGuilds.getUserGuilds({ userId, discordId }).pipe(
                Effect.map(
                  (guilds) =>
                    guilds as ReadonlyArray<{
                      readonly id: string;
                      readonly vanityUrl: string | null;
                    }>,
                ),
              ),
          },
          {
            cancel: notificationScheduler.cancel,
          },
        ),
      }),
    };
  }),
);

export const notificationsData = Layer.unwrap(
  Effect.map(NotificationsServices, ({ layer }) => layer),
);
