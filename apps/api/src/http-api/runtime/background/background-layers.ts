import { Clock, Effect, FiberSet, Layer, Redacted, Schema } from "effect";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
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
import {
  guildTable,
  memberRefreshJobTable,
  reservationTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { Queue as ApiQueue } from "#src/rabbitmq/queue";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/kills/event-hero-kill-queue.constant";
import { makeEventHeroKillProcessor } from "#src/events/kills/event-hero-kill.processor";
import { makeGuildLifecycle } from "#src/guilds/guild-lifecycle.operations";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/member-refresh-queue";
import { isRetryableMemberRefreshStatus } from "#src/members/member-discord-sync-status";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/jobs/dispatch-queue";
import { makeNotificationDispatchProcessor } from "#src/notifications/delivery/notifications-dispatch.processor";
import { makeNotificationsEvents } from "#src/notifications/delivery/notifications-events.handler";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import { applicationLogger } from "#src/shared/application-logger";
import { ApiRedis } from "#src/http-api/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";
import { forkCronTask } from "#src/http-api/runtime/background/cron";
import {
  EventsServices,
  NotificationsServices,
} from "#src/http-api/runtime/composition/domain-data-layers";
import {
  GuildDiscordSync,
  MemberServices,
} from "#src/http-api/runtime/composition/member-data-layers";

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
      findGuilds: (guildIds) =>
        guildIds.length === 0
          ? Effect.succeed([])
          : database
              .select({ id: guildTable.id, name: guildTable.name })
              .from(guildTable)
              .where(inArray(guildTable.id, [...guildIds])),
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

    const consumeDeadLetter = (queue: string) =>
      Effect.acquireRelease(
        rabbit.consume(
          { queue, failurePolicy: { strategy: "nack" } },
          (delivery) =>
            Effect.try({
              try: () =>
                Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))(
                  decodeRabbitText(delivery),
                ),
              catch: (cause) => cause,
            }).pipe(
              Effect.flatMap((data) =>
                Effect.logError(
                  "RabbitMQ DLQ message requires manual intervention",
                ).pipe(
                  Effect.annotateLogs({
                    queue,
                    data,
                    retryCount:
                      delivery.properties.headers?.["x-lootlog-retry-count"],
                  }),
                ),
              ),
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

    const dlqQueues = [
      ApiQueue.GUILDS_CREATE_DLQ,
      ApiQueue.GUILDS_UPDATE_DLQ,
      ApiQueue.GUILDS_DELETE_DLQ,
      ApiQueue.GUILDS_CREATE_ROLE_DLQ,
      ApiQueue.GUILDS_UPDATE_ROLE_DLQ,
      ApiQueue.GUILDS_DELETE_ROLE_DLQ,
    ] as const;
    for (const queue of dlqQueues) {
      yield* consumeDeadLetter(queue);
    }

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
        tracking
          .handlePlayerPresenceChange(
            guildId,
            mapName,
            discordId,
            hasPlayer,
            isAfk ?? false,
          )
          .pipe(
            Effect.catch((error) =>
              Effect.logError("Failed to handle player presence change").pipe(
                Effect.annotateLogs({ error, guildId, mapName }),
              ),
            ),
          ),
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
      (data) => notificationEvents.handleLootCreated(data),
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
    const diagnostic = <A>(operation: () => Promise<A>) =>
      Effect.tryPromise({ try: operation, catch: (cause) => cause });
    const processMemberRefresh = (job: {
      readonly id?: string | number;
      readonly timestamp?: number;
      readonly data: {
        readonly discordId: string;
        readonly guildId: string;
        readonly userId: string;
        readonly reason: string;
      };
    }) => {
      const lockOwner = `job:${job.id}`;
      const startedAt = job.timestamp ?? Date.now();
      return Effect.gen(function* () {
        const acquired = yield* scheduler.acquireUserRefreshLock(
          job.data.userId,
          lockOwner,
        );
        if (!acquired) {
          yield* diagnostic(() =>
            diagnostics.recordMemberRefreshMetric({
              outcome: "failed",
              reason: "MEMBER_REFRESH_LOCKED",
            }),
          );
          return yield* Effect.fail(new Error("MEMBER_REFRESH_LOCKED"));
        }
        const process = Effect.gen(function* () {
          const nextRefreshAt = yield* scheduler.getNextRefreshAt(
            job.data.userId,
          );
          if (
            nextRefreshAt &&
            nextRefreshAt.getTime() > (yield* Clock.currentTimeMillis)
          ) {
            const waitMs =
              nextRefreshAt.getTime() - (yield* Clock.currentTimeMillis);
            yield* scheduler.extendUserRefreshLock(
              job.data.userId,
              lockOwner,
              Math.ceil(waitMs / 1000) + 30,
            );
            yield* Effect.sleep(`${waitMs} millis`);
          }
          const result = yield* sync.syncMemberFromDiscord(job.data);
          if (isRetryableMemberRefreshStatus(result.status)) {
            if (result.status === "RATE_LIMITED") {
              yield* diagnostic(() =>
                diagnostics.recordMemberRefreshMetric({
                  outcome: "rate_limited",
                  reason: job.data.reason,
                }),
              );
            }
            yield* diagnostic(() =>
              diagnostics.recordMemberRefreshMetric({
                outcome: "failed",
                reason: result.status,
              }),
            );
            return yield* Effect.fail(
              new Error(`MEMBER_REFRESH_${result.status}`),
            );
          }
          yield* diagnostic(() =>
            diagnostics.recordMemberRefreshMetric({
              outcome: "processed",
              reason: result.status,
            }),
          );
        });
        return yield* process.pipe(
          Effect.tapError((error) =>
            diagnostic(() =>
              diagnostics.recordMemberRefreshMetric({
                outcome: "failed",
                reason: error instanceof Error ? error.message : "UNKNOWN",
              }),
            ).pipe(Effect.ignore),
          ),
          Effect.ensuring(
            Effect.all(
              [
                diagnostic(() =>
                  diagnostics.recordMemberRefreshLatency(
                    Date.now() - startedAt,
                  ),
                ).pipe(Effect.ignore),
                scheduler
                  .releaseUserRefreshLock(job.data.userId, lockOwner)
                  .pipe(Effect.ignore),
              ],
              { concurrency: "unbounded", discard: true },
            ),
          ),
        );
      });
    };
    const emitRefreshJobUpdate = (
      jobId: number,
      details: Record<string, readonly string[]> = {},
    ) =>
      database
        .select()
        .from(memberRefreshJobTable)
        .where(eq(memberRefreshJobTable.id, jobId))
        .limit(1)
        .pipe(
          Effect.flatMap((rows) => {
            const job = rows[0];
            return job
              ? rabbit.publish({
                  exchange: "default",
                  routingKey:
                    RabbitRoutingKey.GUILDS_MEMBERS_REFRESH_JOB_UPDATE,
                  content: new TextEncoder().encode(
                    JSON.stringify({
                      jobId: job.id,
                      guildId: job.guildId,
                      status: job.status,
                      totalMembers: job.totalMembers,
                      processedMembers: job.processedMembers,
                      failedMembers: job.failedMembers,
                      completedAt: job.completedAt,
                      ...details,
                    }),
                  ),
                })
              : Effect.void;
          }),
        );
    const processBulkRefresh = (job: {
      readonly data: {
        readonly jobId: number;
        readonly guildId: string;
        readonly memberIds: string[];
      };
    }) =>
      Effect.gen(function* () {
        const { jobId, guildId, memberIds } = job.data;
        yield* database
          .update(memberRefreshJobTable)
          .set({
            status: "PROCESSING",
            updatedAt: new Date(yield* Clock.currentTimeMillis),
          })
          .where(eq(memberRefreshJobTable.id, jobId));
        yield* emitRefreshJobUpdate(jobId);
        const refreshedIds: string[] = [];
        const skippedIds: string[] = [];
        const failedIds: string[] = [];
        let processedMembers = 0;
        for (const memberId of memberIds) {
          const result = yield* Effect.result(
            refreshMember({
              discordId: memberId,
              guildId,
              skipTtlCheck: true,
            }),
          );
          if (result._tag === "Failure") {
            failedIds.push(memberId);
            yield* database
              .update(memberRefreshJobTable)
              .set({
                failedMembers: sql`${memberRefreshJobTable.failedMembers} + 1`,
                updatedAt: new Date(yield* Clock.currentTimeMillis),
              })
              .where(eq(memberRefreshJobTable.id, jobId));
            continue;
          }
          processedMembers += 1;
          const refreshedMember = result.success;
          if (!refreshedMember || refreshedMember.refreshQueued) {
            skippedIds.push(memberId);
          } else {
            refreshedIds.push(memberId);
          }
          if (processedMembers % 5 === 0) {
            yield* database
              .update(memberRefreshJobTable)
              .set({
                processedMembers,
                updatedAt: new Date(yield* Clock.currentTimeMillis),
              })
              .where(eq(memberRefreshJobTable.id, jobId));
            yield* emitRefreshJobUpdate(jobId);
          }
        }
        const completedAt = new Date(yield* Clock.currentTimeMillis);
        yield* database
          .update(memberRefreshJobTable)
          .set({
            status: "COMPLETED",
            processedMembers,
            completedAt,
            updatedAt: completedAt,
          })
          .where(eq(memberRefreshJobTable.id, jobId));
        yield* emitRefreshJobUpdate(jobId, {
          refreshedIds,
          skippedIds,
          failedIds,
        });
      }).pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            const failedAt = new Date(yield* Clock.currentTimeMillis);
            yield* database
              .update(memberRefreshJobTable)
              .set({
                status: "FAILED",
                completedAt: failedAt,
                updatedAt: failedAt,
              })
              .where(eq(memberRefreshJobTable.id, job.data.jobId));
            yield* emitRefreshJobUpdate(job.data.jobId);
            return yield* Effect.fail(error);
          }),
        ),
        Effect.withSpan("members.bulkRefresh.process", {
          attributes: { adapter: "bullmq", retryCount: 0 },
        }),
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
    const connection = {
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username,
      password: Redacted.value(config.redis.password),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
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

    const cleanupReservations = Effect.gen(function* () {
      if (config.reservationsCleanup.enabled === "false") return;
      const cutoff = new Date(yield* Clock.currentTimeMillis);
      cutoff.setDate(
        cutoff.getDate() - config.reservationsCleanup.retentionDays,
      );
      const deleted = yield* database
        .delete(reservationTable)
        .where(lt(reservationTable.endsAt, cutoff))
        .returning({ id: reservationTable.id });
      yield* Effect.logInfo("Expired reservations deleted").pipe(
        Effect.annotateLogs({ deleted: deleted.length, cutoff }),
      );
    }).pipe(
      Effect.withSpan("reservations.cleanup", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
      Effect.catch((error) =>
        Effect.logError("Reservation cleanup failed").pipe(
          Effect.annotateLogs({ cause: error }),
        ),
      ),
    );

    const cleanupTimers = Effect.gen(function* () {
      if (config.timerCleanup.enabled === "false") return;
      const cutoff = new Date(yield* Clock.currentTimeMillis);
      cutoff.setDate(cutoff.getDate() - config.timerCleanup.retentionDays);
      const deleted = yield* database
        .delete(timerTable)
        .where(
          and(
            sql`${timerTable.maxSpawnTime} < ${cutoff}`,
            sql`(${timerTable.npc}->>'margonemType')::int = ${TIMER_TYPES.CUSTOM_MANUAL}`,
          ),
        )
        .returning({ timerKey: timerTable.timerKey });
      yield* Effect.logInfo("Expired manual timers deleted").pipe(
        Effect.annotateLogs({ deleted: deleted.length, cutoff }),
      );
    }).pipe(
      Effect.withSpan("timers.cleanup", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
      Effect.catch((error) =>
        Effect.logError("Timer cleanup failed").pipe(
          Effect.annotateLogs({ cause: error }),
        ),
      ),
    );

    yield* forkCronTask(cleanupTimers, "0 3 * * *");
    yield* forkCronTask(cleanupReservations, "0 4 * * *");
  }),
);
