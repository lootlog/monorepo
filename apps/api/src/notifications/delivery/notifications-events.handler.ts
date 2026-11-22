import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type { CanonicalRabbitEvent } from "@lootlog/protocol/rabbit/events";
import { Clock, Effect, Schema } from "effect";
import { formatLevel } from "@lootlog/domain/profession";
import type { HeroSightingResponse } from "#src/contracts/hero-sightings/schemas";
import type { NotificationContentModule } from "#src/notifications/content/notification-content.service";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  type DiscordNotificationDeliveryResult,
  type LootCreatedNotificationEventV2,
  type LootDrawResolvedNotificationEvent,
  NotificationJobKind,
} from "@lootlog/schema/notifications";
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
import type { NotificationEventStore } from "#src/notifications/delivery/notification-event.repository";
import {
  heroSightingAddedByHand,
  WATCHED_ITEM_DROPPED_TITLE,
  watchedItemDroppedMessage,
} from "#src/notifications/content/notification-messages";

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

const HERO_SIGHTING_NOTIFICATION_MAX_AGE_MS = 15 * 60 * 1000;

const isHeroSightingNews = (
  sighting: Pick<HeroSightingResponse, "closedAt" | "lastSeenAt" | "state">,
  now: number,
): boolean =>
  sighting.closedAt === null &&
  sighting.state === "SPAWNING" &&
  now - Date.parse(sighting.lastSeenAt) <=
    HERO_SIGHTING_NOTIFICATION_MAX_AGE_MS;

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
    event: DiscordNotificationDeliveryResult,
  ) => Effect.Effect<void, unknown, never>;
  readonly rebuild: NotificationJobRebuild;
  readonly content: NotificationContentModule;
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
        yield* Effect.logError(
          `Failed to rebuild timer jobs for rule ${ruleId}: ${causeMessage(cause)}`,
        );
      }

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
            Effect.logError(
              `Failed to cancel pending jobs for deleted timer ${event.timerKey}: ${causeMessage(cause)}`,
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
          options
            .findGuilds(event.guildIds)
            .pipe(
              withAdapterSpan(
                "notifications.guilds.findMany",
                "notifications.guilds",
              ),
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
              Effect.logError(
                `Failed to process watched item ${watchedItem.id} for loot ${event.lootId}: ${causeMessage(cause)}`,
              ),
            ),
          );
        },
        { concurrency: "unbounded", discard: true },
      );
    },
  );

  type GuildWorldRule = Effect.Success<
    ReturnType<NotificationEventStore["guildWorldRules"]>
  >[number];

  const scheduleInstantJobs = (
    rules: ReadonlyArray<GuildWorldRule>,
    source: {
      readonly sourceEntityType: string;
      readonly sourceEntityId: string;
      readonly sourceEventId: string;
    },
    now: number,
    payload: (
      rule: GuildWorldRule,
      target: GuildWorldRule["targets"][number]["target"],
    ) => Parameters<NotificationJobScheduler["create"]>[0]["payloadSnapshot"],
  ) =>
    Effect.forEach(
      rules.flatMap((rule) =>
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
            ...source,
            payloadSnapshot: payload(rule, target),
          })
          .pipe(
            Effect.flatMap((job) =>
              job ? options.scheduler.enqueue(job.id, 0) : Effect.void,
            ),
          ),
      { concurrency: "unbounded", discard: true },
    );

  const handleHeroSightingUpdated = Effect.fn(
    "notifications.events.heroSightingUpdated",
  )(function* (sighting: HeroSightingResponse) {
    const now = yield* Clock.currentTimeMillis;

    if (!isHeroSightingNews(sighting, now)) return;

    const rules = yield* options.store.guildWorldRules(
      "HERO_SIGHTED",
      sighting.guildId,
      sighting.world,
    );

    yield* scheduleInstantJobs(
      rules.filter((rule) => matchesHeroLevel(rule.filters, sighting.hero.lvl)),
      {
        sourceEntityType: "hero-sighting",
        sourceEntityId: String(sighting.id),
        sourceEventId: `hero-sighting:${sighting.id}:${sighting.state}`,
      },
      now,
      (rule, target) =>
        options.content.buildHeroSightingPayload({
          notificationRule: rule,
          target,
          sighting: {
            id: sighting.id,
            world: sighting.world,
            hero: sighting.hero,
            heroLevel: formatLevel(sighting.hero.lvl, sighting.hero.prof),
            mapName: sighting.mapName,
            detectedBy: sighting.manual
              ? heroSightingAddedByHand(sighting.detectedBy.displayName)
              : sighting.detectedBy.displayName,
          },
        }),
    );
  });

  const handleLootDrawResolved = Effect.fn(
    "notifications.events.lootDrawResolved",
  )(function* (event: LootDrawResolvedNotificationEvent) {
    const now = yield* Clock.currentTimeMillis;

    const rules = yield* options.store.guildWorldRules(
      "LOOT_DRAW_RESOLVED",
      event.guildId,
      event.world,
    );

    yield* scheduleInstantJobs(
      rules,
      {
        sourceEntityType: "loot-draw",
        sourceEntityId: String(event.draw.id),
        sourceEventId: `loot-draw:${event.draw.id}:${event.outcome}`,
      },
      now,
      (rule, target) =>
        options.content.buildLootDrawPayload({
          notificationRule: rule,
          target,
          event,
        }),
    );
  });

  const handleDeliveryResult = Effect.fn("notifications.events.deliveryResult")(
    (event: DiscordNotificationDeliveryResult) => options.delivery(event),
  );

  const handleDiscordGuildChannelDeleted = Effect.fn(
    "notifications.events.discordGuildChannelDeleted",
  )(
    (
      event: CanonicalRabbitEvent<
        typeof RabbitRoutingKey.DISCORD_GUILD_CHANNEL_DELETED
      >,
    ) => options.guildTargets.removeChannel(event.guildId, event.channelId),
  );

  return {
    handleTimerUpdated,
    handleTimerDeleted,
    handleLootCreated,
    handleHeroSightingUpdated,
    handleLootDrawResolved,
    handleDeliveryResult,
    handleDiscordGuildChannelDeleted,
  };
};
