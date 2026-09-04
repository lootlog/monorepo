import { ApiDatabase } from "#src/database/drizzle/database";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/jobs/dispatch-queue";
import { NOTIFICATIONS_HISTORY_RETENTION_LIMIT } from "#src/notifications/jobs/history";
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
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { RabbitMessaging } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Queue } from "bullmq";
import { Context, Effect, Layer } from "effect";
import { notificationDataLayer } from "#src/http-api/handlers/notifications/notifications.data-layer";
import { redisUrl } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";
import {
  AccountOrganizationOperations,
  GuildDiscordSync,
} from "#src/runtime/features/organizations";

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
            connection: { url: redisUrl(config.redis) },
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
