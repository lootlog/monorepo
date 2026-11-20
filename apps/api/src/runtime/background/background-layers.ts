import { ReadyRoomData } from "#src/messaging/ready-room/ready-room-data";
import { makeNotificationContent } from "#src/notifications/content/notification-content.service";
import { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";
import { makeGuildKillActivityCleanup } from "#src/kills/guild-kill-activity";
import { recordMargonemAccountVerification } from "#src/users/margonem-accounts";
import { Effect, FiberSet, Layer, Schedule, Schema } from "effect";
import { RabbitMessaging } from "@lootlog/messaging";
import { ApiDatabase } from "#src/database/drizzle/database";
import { makeEventHeroKillProcessor } from "#src/events/kills/event-hero-kill.processor";
import { makeGuildLifecycle } from "#src/guilds/guild-lifecycle.operations";
import { makeMemberRefreshProcessor } from "#src/members/member-refresh.processor";
import { makeMemberBulkRefreshProcessor } from "#src/members/member-bulk-refresh.processor";
import { makeNotificationDispatchProcessor } from "#src/notifications/delivery/notifications-dispatch.processor";
import { makeNotificationGuildLookup } from "#src/notifications/delivery/notification-guild-lookup";
import { makeNotificationsEvents } from "#src/notifications/delivery/notifications-events.handler";
import { makeTimersCleanup } from "#src/timers/timers-cleanup";
import { makeReservationsCleanup } from "#src/reservations/reservations-cleanup";
import { makeItemRevisionsPublisher } from "#src/loots/item-revisions-publisher";
import { makeMonsterStatisticsPublisher } from "#src/loots/monster-statistics";
import { applicationLogger } from "#src/shared/application-logger";
import { getUserGuildPermissionsCacheScope } from "#src/shared/cache";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { acquireEventHeroKillWorker } from "#src/runtime/queues/event-hero-kill";
import { acquireMemberBulkRefreshWorker } from "#src/runtime/queues/member-bulk-refresh";
import { acquireMemberRefreshWorker } from "#src/runtime/queues/member-refresh";
import { acquireNotificationDispatchWorker } from "#src/runtime/queues/notification-dispatch";
import { apiRabbitRoutes } from "#src/runtime/infrastructure/api-rabbit";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { forkCronTask } from "#src/runtime/background/cron";
import { makeMemberKillPurge } from "#src/kills/member-kill-purge";
import {
  makeRabbitConsumer,
  orderedHandlerRetry,
} from "#src/runtime/background/rabbit-consumer";
import { EventsServices } from "#src/runtime/features/events";
import { RecordsServices } from "#src/runtime/features/records";
import { NotificationsServices } from "#src/runtime/features/notifications";
import { GuildDiscordSync } from "#src/runtime/features/organizations";
import { MemberServices } from "#src/runtime/features/members";

const decodeHeroSighting = Schema.decodeUnknownEffect(HeroSightingResponse);

export const RabbitConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const redis = yield* ApiRedis;
    const database = yield* ApiDatabase;
    const { runLootPublications } = yield* RecordsServices;
    yield* runLootPublications.pipe(Effect.forkScoped);
    const readyRooms = yield* ReadyRoomData;
    const guildSync = yield* GuildDiscordSync;
    const { memberDelivery } = yield* MemberServices;
    const { tracking } = yield* EventsServices;

    const { scheduler, matching, store, targets, delivery, rebuild } =
      yield* NotificationsServices;

    const guildLifecycle = makeGuildLifecycle(database, {
      invalidateUserGuildPermissions: (discordId) =>
        redis.invalidateScopes(getUserGuildPermissionsCacheScope(discordId)),
      clearCachePattern: (pattern) => redis.deleteByPattern(pattern),
      clearCacheKey: (key) => redis.del(key),
      deliverMemberChanges: memberDelivery.deliverAll,
    });

    const notificationEvents = makeNotificationsEvents({
      store,
      matching,
      scheduler,
      guildTargets: targets,
      findGuilds: makeNotificationGuildLookup(database),
      delivery,
      rebuild,
      content: makeNotificationContent(),
      logger: applicationLogger,
    });

    const consume = yield* makeRabbitConsumer(rabbit);

    yield* consume(apiRabbitRoutes.guildCreate, (data) =>
      guildLifecycle.createGuild(data),
    );
    yield* consume(apiRabbitRoutes.guildUpdate, (data) =>
      guildLifecycle.updateGuild(data),
    );
    yield* consume(apiRabbitRoutes.guildDelete, (data) =>
      guildLifecycle.deleteGuild(data),
    );
    yield* consume(apiRabbitRoutes.roleCreate, (data) =>
      guildLifecycle.upsertRole(data),
    );
    yield* consume(apiRabbitRoutes.roleUpdate, (data) =>
      guildLifecycle.upsertRole(data),
    );
    yield* consume(apiRabbitRoutes.roleDelete, (data) =>
      guildLifecycle.deleteRole(data),
    );

    yield* consume(
      apiRabbitRoutes.discordGuildChannelsSynced,
      (data) => guildSync.handleGuildChannelsSynced(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.discordGuildChannelUpserted,
      (data) => guildSync.handleGuildChannelUpserted(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.discordGuildChannelDeleted,
      (data) => guildSync.handleGuildChannelDeleted(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.discordGuildChannelsSyncFailed,
      (data) => guildSync.handleGuildChannelsSyncFailed(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.discordGuildSyncStateUpdated,
      (data) => guildSync.handleGuildSyncStateUpdated(data),
      orderedHandlerRetry,
    );

    yield* consume(
      apiRabbitRoutes.characterOffline,
      (event) => readyRooms.characterOffline(event),
      orderedHandlerRetry,
    );

    yield* consume(
      apiRabbitRoutes.margonemAccountVerified,
      (event) => recordMargonemAccountVerification(database, event),
      orderedHandlerRetry,
    );

    yield* consume(
      apiRabbitRoutes.presenceCoverage,
      ({ guildId, mapName, discordId, hasPlayer, isAfk }) =>
        tracking.handlePlayerPresenceChange(
          guildId,
          mapName,
          discordId,
          hasPlayer,
          isAfk ?? false,
        ),
      orderedHandlerRetry,
    );

    yield* consume(
      apiRabbitRoutes.notificationsTimerUpdated,
      (data) => notificationEvents.handleTimerUpdated(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.notificationsTimerDeleted,
      (data) => notificationEvents.handleTimerDeleted(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.heroSightingUpdated, // The routed fact is the API's own sighting response; decode all of it.
      (data) =>
        decodeHeroSighting(data).pipe(
          Effect.flatMap(notificationEvents.handleHeroSightingUpdated),
        ),
    );
    yield* consume(apiRabbitRoutes.lootCreated, (data) =>
      notificationEvents.handleLootCreated(data),
    );
    yield* consume(
      apiRabbitRoutes.notificationsDeliveryResult,
      (data) => notificationEvents.handleDeliveryResult(data),
      orderedHandlerRetry,
    );
    yield* consume(
      apiRabbitRoutes.notificationsDiscordGuildChannelDeleted,
      (data) => notificationEvents.handleDiscordGuildChannelDeleted(data),
      orderedHandlerRetry,
    );
  }),
);

export const BullWorkers = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const rabbit = yield* RabbitMessaging;

    const { refreshMember, scheduler, diagnostics, sync, memberDelivery } =
      yield* MemberServices;

    yield* memberDelivery.dispatchPending().pipe(
      Effect.catch((error) =>
        Effect.logError("Member sync dispatch failed", error),
      ),
      Effect.repeat(Schedule.spaced("5 seconds")),
      Effect.forkScoped,
    );

    const { kills } = yield* EventsServices;
    const { dispatch, recovery } = yield* NotificationsServices;

    yield* recovery().pipe(
      Effect.catch((error) =>
        Effect.logError("Overdue notification job recovery failed", error),
      ),
      Effect.repeat(Schedule.spaced("1 minute")),
      Effect.forkScoped,
    );

    const database = yield* ApiDatabase;
    const runWorker = yield* FiberSet.makeRuntimePromise();

    const processMemberRefresh = makeMemberRefreshProcessor({
      scheduler,
      diagnostics,
      sync,
    });

    const processBulkRefresh = makeMemberBulkRefreshProcessor(
      database,
      rabbit,
      refreshMember,
    );

    const eventHeroKill = makeEventHeroKillProcessor(
      applicationLogger,
      kills,
      runWorker,
    );

    const notifications = makeNotificationDispatchProcessor(
      { dispatch },
      applicationLogger,
    );

    const { redisUrl } = config;

    yield* acquireMemberRefreshWorker(redisUrl, (job, token) =>
      runWorker(processMemberRefresh(job, token)),
    );
    yield* acquireMemberBulkRefreshWorker(redisUrl, (job) =>
      runWorker(processBulkRefresh(job)),
    );
    yield* acquireEventHeroKillWorker(redisUrl, eventHeroKill);
    yield* acquireNotificationDispatchWorker(redisUrl, (job) =>
      runWorker(notifications(job)),
    );
  }),
);

export const ScheduledJobs = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const database = yield* ApiDatabase;
    const rabbit = yield* RabbitMessaging;

    const cleanupReservations = makeReservationsCleanup(database, {
      enabled: config.reservationsCleanup.enabled,
      retentionDays: config.reservationsCleanup.retentionDays,
    });

    const cleanupTimers = makeTimersCleanup(database, {
      enabled: config.timerCleanup.enabled,
      retentionDays: config.timerCleanup.retentionDays,
    });

    yield* forkCronTask(
      makeGuildKillActivityCleanup(database)().pipe(
        Effect.catch((error) =>
          Effect.logError("Guild kill activity cleanup failed", error),
        ),
      ),
      "15 * * * *",
    );
    // Off peak (03:30-06:30 CET); a run interrupted by a restart resumes in
    // the next hour.
    yield* forkCronTask(
      makeMemberKillPurge(database)().pipe(
        Effect.catch((error) =>
          Effect.logError("Deleted account member kill purge failed", error),
        ),
      ),
      "30 2-5 * * *",
    );
    yield* forkCronTask(cleanupTimers, "0 3 * * *");
    yield* forkCronTask(cleanupReservations, "0 4 * * *");
    yield* forkCronTask(
      makeMonsterStatisticsPublisher(database, rabbit),
      "30 5 * * *",
    );
    yield* forkCronTask(
      makeItemRevisionsPublisher(database, rabbit),
      "45 5 * * *",
    );
  }),
);
