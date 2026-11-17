import { ApiDatabase } from "#src/database/drizzle/database";
import { NOTIFICATIONS_HISTORY_RETENTION_LIMIT } from "#src/notifications/jobs/history";
import { Error as NotificationError } from "#src/notifications/error";
import { makeNotificationContent } from "#src/notifications/content/notification-content.service";

import { makeNotificationDeliveryResult } from "#src/notifications/delivery/notification-delivery-result";
import {
  makeNotificationEventStore,
  type NotificationEventStore,
} from "#src/notifications/delivery/notification-event.repository";
import {
  makeNotificationGuildTargets,
  type NotificationGuildTargets,
} from "#src/notifications/targets/notification-guild-targets";
import { makeNotificationJobDispatch } from "#src/notifications/jobs/notification-job-dispatch";
import { canDispatchLootNotification } from "#src/notifications/notification-loot-source-visibility";
import { makeNotificationJobFinalization } from "#src/notifications/jobs/notification-job-finalization";
import { makeNotificationJobOperations } from "#src/notifications/jobs/notification-job-operations";
import {
  makeNotificationJobRebuild,
  type NotificationJobRebuild,
} from "#src/notifications/jobs/notification-job-rebuild";
import {
  makeNotificationJobRecovery,
  type NotificationJobRecovery,
} from "#src/notifications/jobs/notification-job-recovery";
import { makeNotificationJobRecurrence } from "#src/notifications/jobs/notification-job-recurrence";
import { makeNotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import { makeNotificationJobStore } from "#src/notifications/jobs/notification-job.repository";
import {
  makeNotificationMatching,
  type NotificationMatching,
} from "#src/notifications/rules/notification-matching.service";
import { makeNotificationRuleOperations } from "#src/notifications/rules/notification-rule-operations";
import { makeNotificationTestContent } from "#src/notifications/notification-test-content";
import { makeNotificationUserTargets } from "#src/notifications/targets/notification-user-targets";
import { makeNotificationWatchedItems } from "#src/notifications/rules/notification-watched-items";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Context, Effect, Layer } from "effect";
import { notificationDataLayer } from "#src/notifications/notifications.data-layer";
import { NotificationDispatchQueue } from "#src/runtime/queues/notification-dispatch";
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
  readonly recovery: NotificationJobRecovery;
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
    const guildSync = yield* GuildDiscordSync;
    const userGuilds = yield* AccountOrganizationOperations;

    const queue = yield* NotificationDispatchQueue;

    const store = makeNotificationEventStore(database);
    const jobsStore = makeNotificationJobStore(database);
    const matching = makeNotificationMatching(database);
    const content = makeNotificationContent();
    const testContent = makeNotificationTestContent(store, matching, content);

    const notificationScheduler = makeNotificationJobScheduler(database, queue);

    const rebuild = makeNotificationJobRebuild(
      {
        findRule: jobsStore.findRule,
        findRules: jobsStore.findRules,
        timers: jobsStore.findTimers,
      },
      (filters, timer) => matching.matchesTimerRule(filters, timer),
      guildSync.hasRequiredGuildPermissions,
      {
        timer: (options) => content.buildTimerNotificationPayload(options),
        scheduledMessage: (options) =>
          content.buildScheduledMessagePayload(options),
      },
      notificationScheduler,
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

    const finalize = makeNotificationJobFinalization(
      ({ ownerType, ownerId }) =>
        jobsStore.prune(
          ownerType,
          ownerId,
          ["SENT", "FAILED", "CANCELED"],
          NOTIFICATIONS_HISTORY_RETENTION_LIMIT,
        ),
      recurrence,
    );

    const dispatch = makeNotificationJobDispatch(
      {
        find: jobsStore.findJobWithRelations,
        update: jobsStore.updateJob,
        claim: jobsStore.claimJob,
        failClaim: jobsStore.failClaim,
        block: jobsStore.blockJob,
      },
      {
        hasRequiredGuildPermissions: guildSync.hasRequiredGuildPermissions,
        canReadLootSource: (jobId, discordId) =>
          canDispatchLootNotification(database, jobId, discordId),
      },
      {
        publish: (payload) =>
          rabbit
            .publish(
              eventMessage(
                RabbitRoutingKey.NOTIFICATIONS_DISCORD_SEND,
                payload,
              ),
            )
            .pipe(Effect.asVoid),
      },
      finalize,
      (value) => content.parseAllowedMentions(value),
    );

    const recovery = makeNotificationJobRecovery(
      {
        findOverdue: jobsStore.findOverdue,
        closeMissed: jobsStore.closeMissed,
      },
      notificationScheduler.enqueue,
      finalize,
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

    const delivery = makeNotificationDeliveryResult(
      {
        find: jobsStore.findJob,
        record: jobsStore.recordDelivery,
      },
      notificationScheduler,
      finalize,
      targets.remove,
    );

    return {
      scheduler: notificationScheduler,
      matching,
      store,
      targets,
      dispatch,
      delivery,
      rebuild,
      recovery,
      layer: notificationDataLayer({
        guildTargets: targets,
        jobOperations: makeNotificationJobOperations(database, {
          cancel: notificationScheduler.cancel,
        }),
        rules: makeNotificationRuleOperations(database, {
          ensureGuildPermissions: (guildId) =>
            guildSync.getGuildDiscordSyncStatus(guildId).pipe(
              Effect.filterOrFail(
                (syncState) => syncState.hasRequiredPermissions,
                (syncState) =>
                  new ResourceConflictError({
                    code: NotificationError.DISCORD_BOT_MISSING_REQUIRED_PERMISSIONS,
                    details: {
                      missingPermissions: syncState.missingPermissions,
                    },
                  }),
              ),
            ),
          rebuildJobs: rebuild.rebuildRule,
          cancelJobs: notificationScheduler.cancel,
          buildTestPayload: (options) =>
            testContent({
              ...options,
              notificationRule: {
                ...options.notificationRule,
                filters: options.notificationRule.filters,
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
              userGuilds.getCurrentUserAccessibleGuilds({ userId, discordId }),
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
