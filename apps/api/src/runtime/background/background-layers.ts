import { makeGuildKillActivityCleanup } from "#src/kills/guild-kill-activity";
import { Effect, FiberSet, Layer, Schedule } from "effect";
import {
  RabbitMessaging,
  type FailurePolicy,
  type RabbitDelivery,
} from "@lootlog/messaging";
import {
  decodeRabbitEventJson,
  type CanonicalRabbitEventRoutingKey,
  type GuildCreated,
  type GuildDeleted,
  type GuildRoleChanged,
  type GuildRoleDeleted,
  type GuildUpdated,
} from "@lootlog/protocol/rabbit/events";
import {
  RabbitRoutingKey,
  type RabbitRoutingKeyName,
} from "@lootlog/protocol/rabbit/topology";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordGuildChannelUpsertedEvent,
  DiscordGuildChannelsSyncFailedEvent,
  DiscordGuildChannelsSyncedEvent,
  DiscordGuildSyncStateUpdatedEvent,
  DiscordNotificationDeliveryResultEvent,
  LootCreatedNotificationEventV2,
} from "@lootlog/schema/notifications";
import { Worker } from "bullmq";
import { ApiDatabase } from "#src/database/drizzle/database";
import { Queue as ApiQueue } from "#src/rabbitmq/queue";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/kills/event-hero-kill-queue.constant";
import { makeEventHeroKillProcessor } from "#src/events/kills/event-hero-kill.processor";
import { makeGuildLifecycle } from "#src/guilds/guild-lifecycle.operations";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/member-refresh-queue";
import { makeMemberRefreshProcessor } from "#src/members/member-refresh.processor";
import { makeMemberBulkRefreshProcessor } from "#src/members/member-bulk-refresh.processor";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/jobs/dispatch-queue";
import { makeNotificationDispatchProcessor } from "#src/notifications/delivery/notifications-dispatch.processor";
import { makeNotificationGuildLookup } from "#src/notifications/delivery/notification-guild-lookup";
import { makeNotificationsEvents } from "#src/notifications/delivery/notifications-events.handler";
import { makeTimersCleanup } from "#src/timers/timers-cleanup";
import { makeReservationsCleanup } from "#src/reservations/reservations-cleanup";
import { applicationLogger } from "#src/shared/application-logger";
import { ApiRedis, redisUrl } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import { forkCronTask } from "#src/runtime/background/cron";
import { EventsServices } from "#src/runtime/features/events";
import { RecordsServices } from "#src/runtime/features/records";
import { NotificationsServices } from "#src/runtime/features/notifications";
import { GuildDiscordSync } from "#src/runtime/features/organizations";
import { MemberServices } from "#src/runtime/features/members";

interface PresenceCoveragePayload {
  readonly guildId: string;
  readonly mapName: string;
  readonly discordId: string;
  readonly hasPlayer: boolean;
  readonly isAfk?: boolean;
}

interface TimerUpdatedPayload {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly timerKey: string;
  readonly minSpawnTime: string;
  readonly maxSpawnTime: string;
  readonly npc?: { readonly name?: string } | null;
}

interface TimerDeletedPayload {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
  readonly npcId?: number;
}

const rabbitRetryPolicy = (
  retryRoutingKey: RabbitRoutingKeyName,
  deadLetterRoutingKey: RabbitRoutingKeyName,
): FailurePolicy => ({
  strategy: "retry",
  maxRetries: 3,
  retryRoutingKey,
  deadLetterRoutingKey,
});
const decodeRabbitText = (delivery: RabbitDelivery): string =>
  new TextDecoder().decode(delivery.content);

export const RabbitConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const redis = yield* ApiRedis;
    const database = yield* ApiDatabase;
    const { dispatchLootPublications } = yield* RecordsServices;
    yield* dispatchLootPublications().pipe(
      Effect.catch((cause) =>
        Effect.logError("Loot publication dispatch failed", cause),
      ),
      Effect.repeat(Schedule.spaced("1 second")),
      Effect.forkScoped,
    );
    const guildSync = yield* GuildDiscordSync;
    const { removal } = yield* MemberServices;
    const { tracking } = yield* EventsServices;
    const { scheduler, matching, store, targets, delivery, rebuild } =
      yield* NotificationsServices;
    const adapter = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });
    const guildLifecycle = makeGuildLifecycle(database, {
      clearCachePattern: (pattern) =>
        adapter(() => redis.deleteByPattern(pattern)),
      clearCacheKey: (key) => adapter(() => redis.del(key)),
      notifyMembersRemoved: (members) => removal.notifyMembersRemoved(members),
    });
    const notificationEvents = makeNotificationsEvents({
      store,
      matching,
      scheduler,
      guildTargets: targets,
      findGuilds: makeNotificationGuildLookup(database),
      delivery,
      rebuild,
      logger: applicationLogger,
    });

    const consume = <Payload>(
      queue: string,
      routingKey: CanonicalRabbitEventRoutingKey,
      handler: (
        payload: Payload,
        delivery: RabbitDelivery,
      ) => Effect.Effect<unknown, unknown> | Promise<void> | void,
      failurePolicy: FailurePolicy = { strategy: "nack" },
    ) =>
      Effect.acquireRelease(
        rabbit.consume({ queue, failurePolicy }, (delivery) =>
          Effect.try({
            try: () =>
              decodeRabbitEventJson(
                routingKey,
                decodeRabbitText(delivery),
              ) as Payload,
            catch: (cause) => cause,
          }).pipe(
            Effect.flatMap((payload) => {
              const result = handler(payload, delivery);
              return Effect.isEffect(result)
                ? result.pipe(Effect.asVoid)
                : Effect.tryPromise({
                    try: () => Promise.resolve(result),
                    catch: (cause) => cause,
                  });
            }),
          ),
        ),
        ({ cancel }) => cancel.pipe(Effect.ignore),
      );

    const retry = {
      guildCreate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_CREATE_RETRY,
        RabbitRoutingKey.GUILDS_CREATE_DLQ,
      ),
      guildUpdate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_UPDATE_RETRY,
        RabbitRoutingKey.GUILDS_UPDATE_DLQ,
      ),
      guildDelete: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_DELETE_RETRY,
        RabbitRoutingKey.GUILDS_DELETE_DLQ,
      ),
      roleCreate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_CREATE_ROLE_RETRY,
        RabbitRoutingKey.GUILDS_CREATE_ROLE_DLQ,
      ),
      roleUpdate: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_UPDATE_ROLE_RETRY,
        RabbitRoutingKey.GUILDS_UPDATE_ROLE_DLQ,
      ),
      roleDelete: rabbitRetryPolicy(
        RabbitRoutingKey.GUILDS_DELETE_ROLE_RETRY,
        RabbitRoutingKey.GUILDS_DELETE_ROLE_DLQ,
      ),
    } as const;

    yield* consume<GuildCreated>(
      ApiQueue.GUILDS_CREATE,
      RabbitRoutingKey.GUILDS_CREATE,
      (data) => guildLifecycle.createGuild(data),
      retry.guildCreate,
    );
    yield* consume<GuildUpdated>(
      ApiQueue.GUILDS_UPDATE,
      RabbitRoutingKey.GUILDS_UPDATE,
      (data) => guildLifecycle.updateGuild(data),
      retry.guildUpdate,
    );
    yield* consume<GuildDeleted>(
      ApiQueue.GUILDS_DELETE,
      RabbitRoutingKey.GUILDS_DELETE,
      (data) => guildLifecycle.deleteGuild(data),
      retry.guildDelete,
    );
    yield* consume<GuildRoleChanged>(
      ApiQueue.GUILDS_CREATE_ROLE,
      RabbitRoutingKey.GUILDS_CREATE_ROLE,
      (data) => guildLifecycle.upsertRole(data),
      retry.roleCreate,
    );
    yield* consume<GuildRoleChanged>(
      ApiQueue.GUILDS_UPDATE_ROLE,
      RabbitRoutingKey.GUILDS_UPDATE_ROLE,
      (data) => guildLifecycle.upsertRole(data),
      retry.roleUpdate,
    );
    yield* consume<GuildRoleDeleted>(
      ApiQueue.GUILDS_DELETE_ROLE,
      RabbitRoutingKey.GUILDS_DELETE_ROLE,
      (data) => guildLifecycle.deleteRole(data),
      retry.roleDelete,
    );

    yield* consume<DiscordGuildChannelsSyncedEvent>(
      "backend-discord-guild-channels-synced",
      RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNCED,
      (data) => guildSync.handleGuildChannelsSynced(data),
    );
    yield* consume<DiscordGuildChannelUpsertedEvent>(
      "backend-discord-guild-channel-upserted",
      RabbitRoutingKey.DISCORD_GUILD_CHANNEL_UPSERTED,
      (data) => guildSync.handleGuildChannelUpserted(data),
    );
    yield* consume<DiscordGuildChannelDeletedEvent>(
      "backend-discord-guild-channel-deleted",
      RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      (data) => guildSync.handleGuildChannelDeleted(data),
    );
    yield* consume<DiscordGuildChannelsSyncFailedEvent>(
      "backend-discord-guild-channels-sync-failed",
      RabbitRoutingKey.DISCORD_GUILD_CHANNELS_SYNC_FAILED,
      (data) => guildSync.handleGuildChannelsSyncFailed(data),
    );
    yield* consume<DiscordGuildSyncStateUpdatedEvent>(
      "backend-discord-guild-sync-state-updated",
      RabbitRoutingKey.DISCORD_GUILD_SYNC_STATE_UPDATED,
      (data) => guildSync.handleGuildSyncStateUpdated(data),
    );

    yield* consume<PresenceCoveragePayload>(
      ApiQueue.PRESENCE_COVERAGE_CHECK,
      RabbitRoutingKey.PRESENCE_COVERAGE_CHECK,
      ({ guildId, mapName, discordId, hasPlayer, isAfk }) =>
        tracking.handlePlayerPresenceChange(
          guildId,
          mapName,
          discordId,
          hasPlayer,
          isAfk ?? false,
        ),
      { strategy: "requeue" },
    );

    yield* consume<TimerUpdatedPayload>(
      "backend-notifications-timer-updated",
      RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
      (data) => notificationEvents.handleTimerUpdated(data),
    );
    yield* consume<TimerDeletedPayload>(
      "backend-notifications-timer-deleted",
      RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
      (data) => notificationEvents.handleTimerDeleted(data),
    );
    yield* consume<LootCreatedNotificationEventV2>(
      "backend-notifications-loot-created",
      RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED,
      (data) =>
        notificationEvents
          .handleLootCreated(data)
          .pipe(Effect.tapError(() => Effect.sleep("1 second"))),
      { strategy: "requeue" },
    );
    yield* consume<DiscordNotificationDeliveryResultEvent>(
      "backend-notifications-delivery-result",
      RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      (data) => notificationEvents.handleDeliveryResult(data),
    );
    yield* consume<DiscordGuildChannelDeletedEvent>(
      "backend-notifications-discord-guild-channel-deleted",
      RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
      (data) => notificationEvents.handleDiscordGuildChannelDeleted(data),
    );
  }),
);

export const BullWorkers = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const rabbit = yield* RabbitMessaging;
    const { refreshMember, scheduler, diagnostics, sync } =
      yield* MemberServices;
    const { kills } = yield* EventsServices;
    const { dispatch } = yield* NotificationsServices;
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
    const connection = { url: redisUrl(config.redis) };
    yield* Effect.acquireRelease(
      Effect.sync(() => {
        const workers = [
          new Worker(
            MEMBER_REFRESH_QUEUE,
            (job) => runWorker(processMemberRefresh(job)),
            { connection, prefix: "{bull}", concurrency: 10 },
          ),
          new Worker(
            MEMBER_BULK_REFRESH_QUEUE,
            (job) => runWorker(processBulkRefresh(job)),
            {
              connection,
              prefix: "{bull}",
              concurrency: 5,
              limiter: { max: 5, duration: 1000 },
            },
          ),
          new Worker(
            EVENT_HERO_KILL_QUEUE,
            (job) => eventHeroKill.process(job),
            { connection, prefix: "{bull}" },
          ),
          new Worker(
            NOTIFICATIONS_DISPATCH_QUEUE,
            (job) => runWorker(notifications(job)),
            { connection, prefix: "{bull}" },
          ),
        ];
        workers[2]?.on("failed", (job, error) => {
          if (job) eventHeroKill.onFailed(job, error);
        });
        return workers;
      }),
      (workers) =>
        Effect.tryPromise(() =>
          Promise.all(workers.map((worker) => worker.close())),
        ),
    );
  }),
);

export const ScheduledJobs = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const database = yield* ApiDatabase;

    const cleanupReservations = makeReservationsCleanup(database, {
      enabled: config.reservationsCleanup.enabled !== "false",
      retentionDays: config.reservationsCleanup.retentionDays,
    });

    const cleanupTimers = makeTimersCleanup(database, {
      enabled: config.timerCleanup.enabled !== "false",
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
    yield* forkCronTask(cleanupTimers, "0 3 * * *");
    yield* forkCronTask(cleanupReservations, "0 4 * * *");
  }),
);
