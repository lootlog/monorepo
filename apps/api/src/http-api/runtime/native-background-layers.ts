import { Effect, Layer, Redacted } from "effect";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import {
  RabbitMessaging,
  type FailurePolicy,
  type RabbitDelivery,
} from "@lootlog/messaging";
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
import { Queue as ApiQueue } from "#src/enum/queue.enum";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/constants/event-hero-kill-queue.constant";
import { makeEventHeroKillProcessor } from "#src/events/event-hero-kill.processor";
import type { CreateGuildDto } from "#src/guilds/dto/create-guild.dto";
import { makeGuildLifecycle } from "#src/guilds/guild-lifecycle.operations";
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from "#src/members/constants/member-refresh-queue.constant";
import { isRetryableMemberRefreshStatus } from "#src/members/member-discord-sync-status";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/constants/notifications-dispatch-queue.constant";
import { makeNotificationDispatchProcessor } from "#src/notifications/notifications-dispatch.processor";
import { makeNotificationsEvents } from "#src/notifications/notifications-events.handler";
import type { CreateRoleDto } from "#src/roles/dto/create-role.dto";
import type { DeleteRoleDto } from "#src/roles/dto/delete-role.dto";
import type { UpdateRoleDto } from "#src/roles/dto/update-role.dto";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { ApiRedis } from "./api-redis.js";
import { ApiRuntimeConfig } from "./api-runtime-config.js";
import { forkCronTask } from "./cron.js";
import {
  makeAmqpAdapter,
  NativeEventsServices,
  NativeGuildDiscordSync,
  NativeMemberServices,
  NativeNotificationsServices,
  nativeLogger,
} from "./native-http-data-layers.js";

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
const decodeRabbitJson = <Payload>(delivery: RabbitDelivery): Payload =>
  JSON.parse(new TextDecoder().decode(delivery.content)) as Payload;

export const NativeRabbitConsumers = Layer.effectDiscard(
  Effect.gen(function* () {
    const rabbit = yield* RabbitMessaging;
    const redis = yield* ApiRedis;
    const database = yield* ApiDatabase;
    const guildSync = yield* NativeGuildDiscordSync;
    const { removal } = yield* NativeMemberServices;
    const { tracking } = yield* NativeEventsServices;
    const { scheduler, matching, store, targets, delivery, rebuild } =
      yield* NativeNotificationsServices;
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
      logger: nativeLogger,
    });

    const consume = <Payload>(
      queue: string,
      handler: (
        payload: Payload,
        delivery: RabbitDelivery,
      ) => Effect.Effect<unknown, unknown> | Promise<void> | void,
      failurePolicy: FailurePolicy = { strategy: "nack" },
    ) =>
      Effect.acquireRelease(
        rabbit.consume({ queue, failurePolicy }, (delivery) => {
          const result = handler(decodeRabbitJson<Payload>(delivery), delivery);
          return Effect.isEffect(result)
            ? result.pipe(Effect.asVoid)
            : Effect.tryPromise({
                try: () => Promise.resolve(result),
                catch: (cause) => cause,
              });
        }),
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

    yield* consume<CreateGuildDto>(
      ApiQueue.GUILDS_CREATE,
      (data) => guildLifecycle.createGuild(data),
      retry.guildCreate,
    );
    yield* consume<CreateGuildDto>(
      ApiQueue.GUILDS_UPDATE,
      (data) => guildLifecycle.updateGuild(data),
      retry.guildUpdate,
    );
    yield* consume<CreateGuildDto>(
      ApiQueue.GUILDS_DELETE,
      (data) => guildLifecycle.deleteGuild(data),
      retry.guildDelete,
    );
    yield* consume<CreateRoleDto>(
      ApiQueue.GUILDS_CREATE_ROLE,
      (data) => guildLifecycle.upsertRole(data),
      retry.roleCreate,
    );
    yield* consume<UpdateRoleDto>(
      ApiQueue.GUILDS_UPDATE_ROLE,
      (data) => guildLifecycle.upsertRole(data),
      retry.roleUpdate,
    );
    yield* consume<DeleteRoleDto>(
      ApiQueue.GUILDS_DELETE_ROLE,
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
      yield* consume<Record<string, unknown>>(queue, (data, delivery) =>
        Effect.runSync(
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
      );
    }

    yield* consume<DiscordGuildChannelsSyncedEvent>(
      "backend-discord-guild-channels-synced",
      (data) => guildSync.handleGuildChannelsSynced(data),
    );
    yield* consume<DiscordGuildChannelUpsertedEvent>(
      "backend-discord-guild-channel-upserted",
      (data) => guildSync.handleGuildChannelUpserted(data),
    );
    yield* consume<DiscordGuildChannelDeletedEvent>(
      "backend-discord-guild-channel-deleted",
      (data) => guildSync.handleGuildChannelDeleted(data),
    );
    yield* consume<DiscordGuildChannelsSyncFailedEvent>(
      "backend-discord-guild-channels-sync-failed",
      (data) => guildSync.handleGuildChannelsSyncFailed(data),
    );
    yield* consume<DiscordGuildSyncStateUpdatedEvent>(
      "backend-discord-guild-sync-state-updated",
      (data) => guildSync.handleGuildSyncStateUpdated(data),
    );

    yield* consume<PresenceCoveragePayload>(
      ApiQueue.PRESENCE_COVERAGE_CHECK,
      async ({ guildId, mapName, discordId, hasPlayer, isAfk }) => {
        try {
          await Effect.runPromise(
            tracking.handlePlayerPresenceChange(
              guildId,
              mapName,
              discordId,
              hasPlayer,
              isAfk ?? false,
            ),
          );
        } catch (error) {
          nativeLogger.log({
            level: "error",
            message: "Failed to handle player presence change",
            error: error instanceof Error ? error.message : error,
            guildId,
            mapName,
          });
        }
      },
    );

    yield* consume<TimerUpdatedPayload>(
      "backend-notifications-timer-updated",
      (data) => Effect.runPromise(notificationEvents.handleTimerUpdated(data)),
    );
    yield* consume<TimerDeletedPayload>(
      "backend-notifications-timer-deleted",
      (data) => Effect.runPromise(notificationEvents.handleTimerDeleted(data)),
    );
    yield* consume<LootCreatedNotificationEventV2>(
      "backend-notifications-loot-created",
      (data) => Effect.runPromise(notificationEvents.handleLootCreated(data)),
    );
    yield* consume<DiscordNotificationDeliveryResultEvent>(
      "backend-notifications-delivery-result",
      (data) =>
        Effect.runPromise(notificationEvents.handleDeliveryResult(data)),
    );
    yield* consume<DiscordGuildChannelDeletedEvent>(
      "backend-notifications-discord-guild-channel-deleted",
      (data) =>
        Effect.runPromise(
          notificationEvents.handleDiscordGuildChannelDeleted(data),
        ),
    );
  }),
);

export const NativeBullWorkers = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const rabbit = yield* RabbitMessaging;
    const { refreshMember, scheduler, diagnostics, sync } =
      yield* NativeMemberServices;
    const { kills } = yield* NativeEventsServices;
    const { dispatch } = yield* NativeNotificationsServices;
    const database = yield* ApiDatabase;
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
          if (nextRefreshAt && nextRefreshAt.getTime() > Date.now()) {
            const waitMs = nextRefreshAt.getTime() - Date.now();
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
          .set({ status: "PROCESSING", updatedAt: new Date() })
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
                updatedAt: new Date(),
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
              .set({ processedMembers, updatedAt: new Date() })
              .where(eq(memberRefreshJobTable.id, jobId));
            yield* emitRefreshJobUpdate(jobId);
          }
        }
        const completedAt = new Date();
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
            const failedAt = new Date();
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
    const eventHeroKill = makeEventHeroKillProcessor(nativeLogger, kills);
    const notifications = makeNotificationDispatchProcessor(
      { dispatch },
      nativeLogger,
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
            (job) => Effect.runPromise(processMemberRefresh(job)),
            { connection, prefix: "{bull}", concurrency: 10 },
          ),
          new Worker(
            MEMBER_BULK_REFRESH_QUEUE,
            (job) => Effect.runPromise(processBulkRefresh(job)),
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
            (job) => Effect.runPromise(notifications(job)),
            { connection, prefix: "{bull}" },
          ),
        ];
        workers[2]?.on("failed", (job, error) => {
          if (job) eventHeroKill.onFailed(job, error);
        });
        return workers;
      }),
      (workers) =>
        Effect.promise(() =>
          Promise.all(workers.map((worker) => worker.close())),
        ),
    );
  }),
);

export const NativeScheduledJobs = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ApiRuntimeConfig;
    const database = yield* ApiDatabase;

    const cleanupReservations = Effect.gen(function* () {
      if (config.reservationsCleanup.enabled === "false") return;
      const cutoff = new Date();
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
      const cutoff = new Date();
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
