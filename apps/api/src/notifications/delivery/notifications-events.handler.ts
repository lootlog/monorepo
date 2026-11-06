import { Clock, Effect, Schema } from "effect";
import { formatLevel } from "@lootlog/domain/profession";
import type { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";
import type { NotificationContentModule } from "#src/notifications/content/notification-content.service";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
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
import {
  parseNotificationFilters,
  type NotificationMatching,
} from "#src/notifications/rules/notification-matching.service";
import { timerNpcIdentity } from "#src/timers/timer-projection";
import type { NotificationEventStore } from "#src/notifications/delivery/notification-event-store";
import {
  WATCHED_ITEM_DROPPED_TITLE,
  watchedItemDroppedMessage,
} from "#src/notifications/content/notification-messages";
import { NotificationJobKind } from "#src/notifications/notification-enums";

export interface TimerDeletedEvent {
  readonly guildId: string;
  readonly world: string;
  readonly timerKey: string;
  readonly npcId?: number;
}

class NotificationTimerRebuildError extends TaggedErrorClass<NotificationTimerRebuildError>()(
  "NotificationTimerRebuildError",
  { ruleIds: Schema.Array(Schema.Number) },
) {}

/** A detection older than this is a redelivery, not news worth a message. */
const HERO_SIGHTING_NOTIFICATION_MAX_AGE_MS = 15 * 60 * 1000;

/**
 * The news a sighting update carries, or null when it carries none: a new
 * sighting announces where the hero is or will spawn, and a detected spawn
 * that is later seen roaming announces that the hero appeared. Repeated
 * confirmations map to the same transition, so they notify once.
 */
const heroSightingNotificationTransition = (
  sighting: Pick<
    HeroSightingResponse,
    "closedAt" | "lastSeenAt" | "spawnedAt" | "state"
  >,
  now: number,
): "ROAMING" | "SPAWNING" | "SPAWNED" | null => {
  if (sighting.closedAt !== null) return null;

  if (
    now - Date.parse(sighting.lastSeenAt) >
    HERO_SIGHTING_NOTIFICATION_MAX_AGE_MS
  )
    return null;

  return sighting.state === "ROAMING" && sighting.spawnedAt !== null
    ? "SPAWNED"
    : sighting.state;
};

/** A hero sighting rule's level range; a missing bound is open. */
const matchesHeroLevel = (
  filters: Parameters<typeof parseNotificationFilters>[0],
  heroLvl: number,
) => {
  const { npcLevelMin, npcLevelMax } = parseNotificationFilters(filters);

  return (
    (npcLevelMin === undefined || heroLvl >= npcLevelMin) &&
    (npcLevelMax === undefined || heroLvl <= npcLevelMax)
  );
};

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
  readonly content: NotificationContentModule;
  readonly logger: Logger;
}) => {
  const handleTimerUpdated = Effect.fn("notifications.events.timerUpdated")(
    function* (event: TimerUpdatedEvent) {
      const ruleIds = (yield* options.store.timerRules(
        event.guildId,
        event.world,
      ))
        .filter((rule) =>
          options.matching.matchesTimerRule(
            rule.filters,
            timerNpcIdentity(event),
          ),
        )
        .map(({ id }) => id);

      const failures = yield* options.rebuild
        .rebuildTimer(ruleIds, event)
        .pipe(
          Effect.catch((cause) =>
            Effect.succeed(ruleIds.map((ruleId) => ({ ruleId, cause }))),
          ),
        );

      for (const { ruleId, cause } of failures) {
        options.logger.error(
          `Failed to rebuild timer jobs for rule ${ruleId}: ${causeMessage(cause)}`,
        );
      }

      // Rebuilding cancels and recreates a rule's jobs, so redelivering the
      // whole fact is safe and keeps a failed rule from staying stale.
      if (failures.length > 0) {
        return yield* Effect.fail(
          new NotificationTimerRebuildError({
            ruleIds: failures.map(({ ruleId }) => ruleId),
          }),
        );
      }
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
          Effect.tapError((cause) =>
            Effect.sync(() =>
              options.logger.error(
                `Failed to cancel pending jobs for deleted timer ${event.timerKey}: ${causeMessage(cause)}`,
              ),
            ),
          ),
        ),
  );

  const handleLootCreated = Effect.fn("notifications.events.lootCreated")(
    function* (event: LootCreatedNotificationEventV2) {
      const watchedItems = yield* options.store.watchedItemsForLoot(
        event.itemIds,
        event.world,
      );

      if (watchedItems.length === 0) return;

      const [guilds, memberships] = yield* Effect.all(
        [
          options.findGuilds(event.guildIds).pipe(
            Effect.withSpan("notifications.guilds.findMany", {
              attributes: { adapter: "notifications.guilds", retryCount: 0 },
            }),
          ),
          options.matching.activeMemberships(
            watchedItems
              .map((item) => item.notificationRule?.ownerId)
              .filter(
                (ownerId): ownerId is string => typeof ownerId === "string",
              ),
            event.guildIds,
          ),
        ],
        { concurrency: "unbounded" },
      );

      const guildNames = new Map(guilds.map((guild) => [guild.id, guild.name]));

      const visibilityNpcs = event.npcs.map((npc) => ({
        type: npc.type,
        level: npc.lvl,
      }));

      yield* Effect.forEach(
        watchedItems,
        (watchedItem) => {
          const process = Effect.gen(function* () {
            const rule = watchedItem.notificationRule;

            if (
              !rule ||
              !options.matching.matchesLootRule(rule.filters, event)
            ) {
              return;
            }

            const matchingGuildIds = options.matching.matchingLootGuildIds(
              rule.filters,
              event.guildIds,
            );

            const ownerMemberships = memberships.get(rule.ownerId) ?? [];

            const visibleGuildIds = matchingGuildIds.filter((guildId) => {
              const membership = ownerMemberships.find(
                (candidate) => candidate.guildId === guildId,
              );

              return Boolean(
                membership &&
                options.matching.canMemberViewLoot(membership, visibilityNpcs),
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
            Effect.tapError((cause) =>
              Effect.sync(() =>
                options.logger.error(
                  `Failed to process watched item ${watchedItem.id} for loot ${event.lootId}: ${causeMessage(cause)}`,
                ),
              ),
            ),
          );
        },
        { concurrency: "unbounded", discard: true },
      );
    },
  );

  const handleHeroSightingUpdated = Effect.fn(
    "notifications.events.heroSightingUpdated",
  )(function* (sighting: HeroSightingResponse) {
    const now = yield* Clock.currentTimeMillis;
    const transition = heroSightingNotificationTransition(sighting, now);

    if (!transition) return;

    const rules = yield* options.store.heroSightingRules(
      sighting.guildId,
      sighting.world,
    );

    yield* Effect.forEach(
      rules
        .filter((rule) => matchesHeroLevel(rule.filters, sighting.hero.lvl))
        .flatMap((rule) =>
          rule.targets
            .filter(({ target }) => target.active && target.canSend)
            .map(({ target }) => ({ rule, target })),
        ),
      ({ rule, target }) =>
        options.scheduler
          .create({
            notificationRule: rule,
            target,
            jobKind: NotificationJobKind.INSTANT,
            scheduledFor: new Date(now),
            sourceEntityType: "hero-sighting",
            sourceEntityId: String(sighting.id),
            sourceEventId: `hero-sighting:${sighting.id}:${transition}`,
            payloadSnapshot: options.content.buildHeroSightingPayload({
              notificationRule: rule,
              target,
              sighting: {
                id: sighting.id,
                world: sighting.world,
                hero: sighting.hero,
                heroLevel: formatLevel(sighting.hero.lvl, sighting.hero.prof),
                mapName: sighting.mapName,
                detectedBy: sighting.detectedBy.displayName,
              },
              transition,
            }),
          })
          .pipe(
            Effect.flatMap((job) =>
              job ? options.scheduler.enqueue(job.id, 0) : Effect.void,
            ),
          ),
      { concurrency: "unbounded", discard: true },
    );
  });

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
    handleHeroSightingUpdated,
    handleDeliveryResult,
    handleDiscordGuildChannelDeleted,
  };
};
