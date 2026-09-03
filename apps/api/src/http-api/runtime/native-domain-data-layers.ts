import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { RESPAWN_WINDOW_QUEUE } from "#src/events/constants/respawn-queue.constant";
import { makeEventAccess } from "#src/events/event-access";
import { makeEventCatalogMutations } from "#src/events/event-catalog-mutations";
import { makeEventCreation } from "#src/events/event-creation";
import { makeEventDeletion } from "#src/events/event-deletion";
import { makeEventGapReads } from "#src/events/event-gap-reads";
import { makeEventHeroSummary } from "#src/events/event-hero-summary";
import { makeEventMapAssignments } from "#src/events/event-map-assignments";
import { makeEventParticipation } from "#src/events/event-participation";
import { makeEventPointEdits } from "#src/events/event-point-edits";
import { makeEventPointRecalculation } from "#src/events/event-point-recalculation";
import { makeEventPresenceStats } from "#src/events/event-presence-stats";
import {
  makeEventPresenceTracking,
  type EventPresenceTracking,
} from "#src/events/event-presence-tracking";
import { makeEventRankingRead } from "#src/events/event-ranking-read";
import { makeEventRespawnCommands } from "#src/events/event-respawn-commands";
import { makeEventUpdate } from "#src/events/event-update";
import { makeEventsAssignment } from "#src/events/events-assignment.operations";
import { makeEventsCatalogRead } from "#src/events/events-catalog-read";
import { makeEventsCatalog } from "#src/events/events-catalog.operations";
import { makeEventsMonitoring } from "#src/events/events-monitoring.operations";
import { makeEventsPins } from "#src/events/events-pins.operations";
import { makeEventsRanking } from "#src/events/events-ranking.operations";
import { makeActiveEventHeroStore } from "#src/events/services/active-event-hero.repository";
import { makeEventCoordinationStore } from "#src/events/services/event-coordination.repository";
import { makeEventCoordination } from "#src/events/services/event-coordination.service";
import { makeEventEmitter } from "#src/events/services/event-emitter.service";
import { makeEventKillStore } from "#src/events/services/event-kill.repository";
import {
  makeEventKills,
  type EventKills,
} from "#src/events/services/event-kill.service";
import { makeEventPointsStore } from "#src/events/services/event-points.repository";
import { makeEventPoints } from "#src/events/services/event-points.service";
import { makeEventReadCache } from "#src/events/services/event-read-cache.service";
import { makeEventRespawnStore } from "#src/events/services/event-respawn.repository";
import { makeEventRespawn } from "#src/events/services/event-respawn.service";
import { makeEventSummaryStore } from "#src/events/services/event-summary.repository";
import { makeEventSummary } from "#src/events/services/event-summary.service";
import { makeEventWrappedStore } from "#src/events/services/event-wrapped.repository";
import { makeEventWrapped } from "#src/events/services/event-wrapped.service";
import { makePinnedEventsPersistence } from "#src/events/services/pinned-events.repository";
import { makeGuildKillQueries } from "#src/kills/guild-kill-queries";
import { makeKillCreation } from "#src/kills/kill-creation";
import { makeKillStatsPersistence } from "#src/kills/kill-stats-persistence";
import { makeMemberKillQuery } from "#src/kills/member-kill-query";
import { makeUserKillQueries } from "#src/kills/user-kill-queries";
import {
  ExecutionError,
  RedlockService,
} from "#src/lib/redlock/redlock.service";
import { makeLootAllocationPersistence } from "#src/loots/loot-allocation-persistence";
import { makeLootAllocationOperations } from "#src/loots/loot-allocation.operations";
import { makeLootPersistence } from "#src/loots/loot-persistence";
import { makeLootSubmissionAcceptancePersistence } from "#src/loots/loot-submission-acceptance.repository";
import { makeLootSubmissionAcceptance } from "#src/loots/loot-submission-acceptance.service";
import {
  makeLootsOperations,
  type LootsOperations,
} from "#src/loots/loots.operations";
import { makeLootQueryOperations } from "#src/loots/services/loot-query.operations";
import { makeLootQueryPersistence } from "#src/loots/services/loot-query.persistence";
import { makeLootStatsQuery } from "#src/loots/services/loot-stats-query";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { NOTIFICATIONS_HISTORY_RETENTION_LIMIT } from "#src/notifications/constants/notifications-history.constant";
import { Error as NotificationError } from "#src/notifications/enum/error.enum";
import { makeNotificationContent } from "#src/notifications/notification-content.service";
import type { JsonValue } from "#src/notifications/notification-database.types";
import { makeNotificationDeliveryResult } from "#src/notifications/notification-delivery-result";
import {
  makeNotificationEventStore,
  type NotificationEventStore,
} from "#src/notifications/notification-event-store";
import {
  makeNotificationGuildTargets,
  type NotificationGuildTargets,
} from "#src/notifications/notification-guild-targets";
import { makeNotificationJobDispatch } from "#src/notifications/notification-job-dispatch";
import { makeNotificationJobOperations } from "#src/notifications/notification-job-operations";
import {
  makeNotificationJobRebuild,
  type NotificationJobRebuild,
} from "#src/notifications/notification-job-rebuild";
import { makeNotificationJobRecurrence } from "#src/notifications/notification-job-recurrence";
import { makeNotificationJobScheduler } from "#src/notifications/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/notification-job-store";
import {
  makeNotificationMatching,
  type NotificationMatching,
} from "#src/notifications/notification-matching.service";
import { makeNotificationRuleOperations } from "#src/notifications/notification-rule-operations";
import { makeNotificationTestContent } from "#src/notifications/notification-test-content";
import { makeNotificationUserTargets } from "#src/notifications/notification-user-targets";
import { makeNotificationWatchedItems } from "#src/notifications/notification-watched-items";
import {
  DependencyUnavailableError,
  ResourceConflictError,
} from "#src/shared/http/http-errors";
import { PgClient } from "@effect/sql-pg";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Queue } from "bullmq";
import { Context, Effect, Layer, Redacted } from "effect";
import { eventDataLayer } from "../handlers/events/events.data-layer.js";
import { killsLootsDataLayer } from "../handlers/kills-loots/kills-loots.data-layer.js";
import { notificationDataLayer } from "../handlers/notifications/notifications.data-layer.js";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";

import { makeAmqpAdapter, nativeLogger } from "./native-core-data-layers.js";
import {
  NativeGuildDiscordSync,
  NativeUsersGuildsOperations,
} from "./native-member-data-layers.js";
import { NativeEventTimers } from "./native-timer-data-layers.js";
interface NativeKillsLootsServicesValue {
  readonly layer: ReturnType<typeof killsLootsDataLayer>;
  readonly loots: LootsOperations;
}

export class NativeKillsLootsServices extends Context.Service<
  NativeKillsLootsServices,
  NativeKillsLootsServicesValue
>()("@lootlog/api/http-api/NativeKillsLootsServices") {}

export const NativeKillsLootsServicesLive = Layer.effect(
  NativeKillsLootsServices,
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
      nativeLogger,
      {
        withLock: (resource, ttlMilliseconds, options, effect) =>
          Effect.acquireUseRelease(
            Effect.tryPromise({
              try: () => redlock.acquire([resource], ttlMilliseconds, options),
              catch: (cause) => {
                if (cause instanceof ExecutionError) {
                  nativeLogger.log({
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
      logger: nativeLogger,
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
      layer: killsLootsDataLayer({
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
          nativeLogger,
        ),
        guildKillQueries: makeGuildKillQueries(
          killStatsPersistence,
          killQueryCache,
          nativeLogger,
        ),
        memberKillQuery: makeMemberKillQuery(
          killStatsPersistence,
          killQueryCache,
          nativeLogger,
        ),
        userKillQueries: makeUserKillQueries(
          database,
          killQueryCache,
          nativeLogger,
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
          logger: nativeLogger,
        }),
      }),
    };
  }),
);

export const NativeKillsLootsData = Layer.unwrap(
  Effect.map(NativeKillsLootsServices, ({ layer }) => layer),
);

interface NativeEventsServicesValue {
  readonly layer: ReturnType<typeof eventDataLayer>;
  readonly kills: EventKills;
  readonly tracking: EventPresenceTracking;
}

export class NativeEventsServices extends Context.Service<
  NativeEventsServices,
  NativeEventsServicesValue
>()("@lootlog/api/http-api/NativeEventsServices") {}

export const NativeEventsServicesLive = Layer.effect(
  NativeEventsServices,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const timers = yield* NativeEventTimers;
    const { loots } = yield* NativeKillsLootsServices;
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
      nativeLogger,
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
    const catalogRead = makeEventsCatalogRead(database, redis, nativeLogger);
    const eventAccess = makeEventAccess(database);
    const layer = eventDataLayer({
      assignment: makeEventsAssignment(
        eventAccess,
        makeEventCatalogMutations(database, redis, nativeLogger),
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
          nativeLogger,
        ),
      ),
      catalog: {
        ...makeEventsCatalog(wrapped),
        ...catalogRead,
        createEvent: makeEventCreation(database, redis, nativeLogger),
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
          nativeLogger,
        ),
        recalculatePoints: makeEventPointRecalculation(
          database,
          redis,
          {
            recalculate: (eventId, basePointsPerKill) =>
              points.recalculateEventPoints(eventId, basePointsPerKill),
          },
          nativeLogger,
        ),
        updateEvent: makeEventUpdate(
          database,
          redis,
          catalogRead,
          nativeLogger,
        ),
      },
      monitoring: makeEventsMonitoring(
        coordination,
        kill,
        presenceStats,
        respawn,
        eventAccess,
        makeEventGapReads(database, redis, nativeLogger),
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
          nativeLogger,
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
          nativeLogger,
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
          nativeLogger,
        ),
        makeEventHeroSummary(database, redis, timers, nativeLogger),
      ),
    });
    return { kills: kill, layer, tracking };
  }),
);

export const NativeEventsData = Layer.unwrap(
  Effect.map(NativeEventsServices, ({ layer }) => layer),
);

interface NativeNotificationsServicesValue {
  readonly layer: ReturnType<typeof notificationDataLayer>;
  readonly scheduler: ReturnType<typeof makeNotificationJobScheduler>;
  readonly matching: NotificationMatching;
  readonly store: NotificationEventStore;
  readonly targets: NotificationGuildTargets;
  readonly dispatch: ReturnType<typeof makeNotificationJobDispatch>;
  readonly delivery: ReturnType<typeof makeNotificationDeliveryResult>;
  readonly rebuild: NotificationJobRebuild;
}

export class NativeNotificationsServices extends Context.Service<
  NativeNotificationsServices,
  NativeNotificationsServicesValue
>()("@lootlog/api/http-api/NativeNotificationsServices") {}

export const NativeNotificationsServicesLive = Layer.effect(
  NativeNotificationsServices,
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    const config = yield* ApiRuntimeConfig;
    const guildSync = yield* NativeGuildDiscordSync;
    const userGuilds = yield* NativeUsersGuildsOperations;
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

export const NativeNotificationsData = Layer.unwrap(
  Effect.map(NativeNotificationsServices, ({ layer }) => layer),
);
