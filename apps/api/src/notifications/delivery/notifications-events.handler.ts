import { Effect } from "effect";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordNotificationDeliveryResultEvent,
  LootCreatedNotificationEventV2,
} from "@lootlog/schema/notifications";
import type { ApplicationLogger as Logger } from "#src/shared/application-logger";
import type { NotificationGuildTargets } from "#src/notifications/targets/notification-guild-targets";
import type { NotificationJobScheduler } from "#src/notifications/jobs/notification-job-scheduler";
import {
  timerSourceEntityId,
  type NotificationJobRebuild,
  type TimerUpdatedEvent,
} from "#src/notifications/jobs/notification-job-rebuild";
import type { NotificationMatching } from "#src/notifications/rules/notification-matching.service";
import type { NotificationEventStore } from "#src/notifications/delivery/notification-event-store";
import {
  WATCHED_ITEM_DROPPED_TITLE,
  watchedItemDroppedMessage,
} from "#src/notifications/content/notification-messages";
import { NotificationJobKind } from "#src/notifications/notification-enums";
import type { JsonValue } from "#src/notifications/notification-database.types";

export interface TimerDeletedEvent {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
  readonly npcId?: number;
}

const causeMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

export const makeNotificationsEvents = (options: {
  readonly store: NotificationEventStore;
  readonly scheduler: NotificationJobScheduler;
  readonly matching: NotificationMatching;
  readonly guildTargets: NotificationGuildTargets;
  readonly findGuilds: (
    guildIds: readonly string[],
  ) => Effect.Effect<
    ReadonlyArray<{ readonly id: string; readonly name: string }>,
    unknown
  >;
  readonly delivery: (
    event: DiscordNotificationDeliveryResultEvent,
  ) => Effect.Effect<void, unknown, never>;
  readonly rebuild: NotificationJobRebuild;
  readonly logger: Logger;
}) => {
  const handleTimerUpdated = Effect.fn("notifications.events.timerUpdated")(
    function* (event: TimerUpdatedEvent) {
      const rules = yield* options.store.timerRules(event.guildId, event.world);
      yield* Effect.forEach(
        rules,
        (rule) => {
          if (
            !options.matching.matchesTimerRule(
              rule.filters as JsonValue,
              event.npcId,
            )
          ) {
            return Effect.void;
          }
          return options.rebuild.rebuildTimer(rule.id, event).pipe(
            Effect.result,
            Effect.tap((result) =>
              result._tag === "Failure"
                ? Effect.sync(() =>
                    options.logger.error(
                      `Failed to rebuild timer jobs for rule ${rule.id}: ${causeMessage(result.failure)}`,
                    ),
                  )
                : Effect.void,
            ),
            Effect.asVoid,
          );
        },
        { concurrency: "unbounded", discard: true },
      );
    },
  );

  const handleTimerDeleted = Effect.fn("notifications.events.timerDeleted")(
    (event: TimerDeletedEvent) =>
      options.scheduler
        .cancel({
          sourceEntityType: "timer",
          sourceEntityId: timerSourceEntityId(event),
        })
        .pipe(
          Effect.result,
          Effect.tap((result) =>
            result._tag === "Failure"
              ? Effect.sync(() =>
                  options.logger.error(
                    `Failed to cancel pending jobs for deleted timer ${event.timerKey}: ${causeMessage(result.failure)}`,
                  ),
                )
              : Effect.void,
          ),
          Effect.asVoid,
        ),
  );

  const handleLootCreated = Effect.fn("notifications.events.lootCreated")(
    function* (event: LootCreatedNotificationEventV2) {
      const watchedItems = yield* options.store.watchedItemsForLoot(
        event.itemIds,
        event.world,
      );
      const guilds = yield* options.findGuilds(event.guildIds).pipe(
        Effect.withSpan("notifications.guilds.findMany", {
          attributes: { adapter: "notifications.guilds", retryCount: 0 },
        }),
      );
      const guildNames = new Map(guilds.map((guild) => [guild.id, guild.name]));
      const visibilityNpcs = event.npcs.map((npc) => ({
        type: npc.type,
        level: npc.lvl,
      }));
      const memberships = yield* options.matching.activeMemberships(
        watchedItems
          .map((item) => item.notificationRule?.ownerId)
          .filter((ownerId): ownerId is string => typeof ownerId === "string"),
        event.guildIds,
      );
      yield* Effect.forEach(
        watchedItems,
        (watchedItem) => {
          const process = Effect.gen(function* () {
            const rule = watchedItem.notificationRule;
            if (
              !rule ||
              !options.matching.matchesLootRule(
                rule.filters as JsonValue,
                event,
              )
            ) {
              return;
            }
            const matchingGuildIds = options.matching.matchingLootGuildIds(
              rule.filters as JsonValue,
              event.guildIds,
            );
            const ownerMemberships = memberships.get(rule.ownerId) ?? [];
            const visibleGuildIds = matchingGuildIds.filter((guildId) => {
              const membership = ownerMemberships.find(
                (candidate) => candidate.guildId === guildId,
              );
              return Boolean(
                membership &&
                options.matching.canRolesViewLoot(
                  membership.roles,
                  visibilityNpcs,
                  membership.isGuildOwner,
                ),
              );
            });
            if (visibleGuildIds.length === 0) return;
            yield* Effect.forEach(
              rule.targets,
              ({ target }) => {
                if (!target.active || !target.canSend) return Effect.void;
                const title = WATCHED_ITEM_DROPPED_TITLE;
                const message = watchedItemDroppedMessage(
                  event.world,
                  visibleGuildIds
                    .map((guildId) => guildNames.get(guildId))
                    .filter(Boolean)
                    .join(", "),
                  watchedItem.itemName,
                );
                return options.scheduler
                  .create({
                    notificationRule: rule,
                    target,
                    jobKind: NotificationJobKind.INSTANT,
                    scheduledFor: new Date(),
                    sourceEntityType: "loot",
                    sourceEntityId: String(event.lootId),
                    sourceEventId: `loot:${event.lootId}`,
                    payloadSnapshot: {
                      title,
                      message,
                      world: event.world,
                      itemId: watchedItem.itemId,
                      itemName: watchedItem.itemName,
                      guildIds: visibleGuildIds,
                    },
                  })
                  .pipe(
                    Effect.flatMap((job) =>
                      job ? options.scheduler.enqueue(job.id, 0) : Effect.void,
                    ),
                  );
              },
              { concurrency: "unbounded", discard: true },
            );
          });
          return process.pipe(
            Effect.result,
            Effect.tap((result) =>
              result._tag === "Failure"
                ? Effect.sync(() =>
                    options.logger.error(
                      `Failed to process watched item ${watchedItem.id} for loot ${event.lootId}: ${causeMessage(result.failure)}`,
                    ),
                  )
                : Effect.void,
            ),
            Effect.asVoid,
          );
        },
        { concurrency: "unbounded", discard: true },
      );
    },
  );

  const handleDeliveryResult = Effect.fn("notifications.events.deliveryResult")(
    (event: DiscordNotificationDeliveryResultEvent) => options.delivery(event),
  );

  const handleDiscordGuildChannelDeleted = Effect.fn(
    "notifications.events.discordGuildChannelDeleted",
  )((event: DiscordGuildChannelDeletedEvent) =>
    options.guildTargets.removeChannel(event.guildId, event.channelId),
  );

  return {
    handleTimerUpdated,
    handleTimerDeleted,
    handleLootCreated,
    handleDeliveryResult,
    handleDiscordGuildChannelDeleted,
  };
};

export type NotificationsEvents = ReturnType<typeof makeNotificationsEvents>;
