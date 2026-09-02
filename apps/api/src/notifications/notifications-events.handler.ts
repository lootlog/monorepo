import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordNotificationDeliveryResultEvent,
  LootCreatedNotificationEventV2,
} from "@lootlog/schema/notifications";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { NotificationJobService } from "#src/notifications/notification-job.service";
import { NotificationMatchingService } from "#src/notifications/notification-matching.service";
import { NotificationTargetService } from "#src/notifications/notification-target.service";
import { GuildsService } from "#src/guilds/guilds.service";
import {
  WATCHED_ITEM_DROPPED_TITLE,
  watchedItemDroppedMessage,
} from "#src/notifications/constants/notification-messages.constant";
import { NotificationsRepository } from "./notifications.repository.js";
import type { JsonValue } from "./notification-database.types.js";

const DbNotificationJobKind = { INSTANT: "INSTANT" } as const;

@Injectable()
export class NotificationsEventsHandler {
  private readonly logger = new Logger(NotificationsEventsHandler.name);

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly jobService: NotificationJobService,
    private readonly matchingService: NotificationMatchingService,
    private readonly targetService: NotificationTargetService,
    private readonly guildsService: GuildsService,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    queue: "backend-notifications-timer-updated",
    queueOptions: {
      durable: true,
    },
  })
  async handleTimerUpdated(event: {
    guildId: string;
    world: string;
    npcId: number;
    timerKey: string;
    minSpawnTime: string;
    maxSpawnTime: string;
    npc?: { name?: string } | null;
  }) {
    const notificationRules = await this.repository.findTimerRules(
      event.guildId,
      event.world,
    );

    await Promise.all(
      notificationRules.map(async (notificationRule) => {
        try {
          if (
            !this.matchingService.matchesTimerRule(
              notificationRule.filters as JsonValue,
              event.npcId,
            )
          ) {
            return;
          }

          await this.jobService.rebuildTimerJobsForRule(
            notificationRule.id,
            event,
          );
        } catch (error) {
          this.logger.error(
            `Failed to rebuild timer jobs for rule ${notificationRule.id}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_TIMER_DELETED,
    queue: "backend-notifications-timer-deleted",
    queueOptions: {
      durable: true,
    },
  })
  async handleTimerDeleted(event: {
    guildId: string;
    world: string;
    timerKey: string;
    npcId?: number;
  }) {
    try {
      await this.jobService.cancelPendingJobs({
        sourceEntityType: "timer",
        sourceEntityId: this.jobService.getTimerSourceEntityId(event),
      });
    } catch (error) {
      this.logger.error(
        `Failed to cancel pending jobs for deleted timer ${event.timerKey}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_LOOT_CREATED,
    queue: "backend-notifications-loot-created",
    queueOptions: {
      durable: true,
    },
  })
  async handleLootCreated(event: LootCreatedNotificationEventV2) {
    const watchedItems = await this.repository.findWatchedItemsForLoot(
      event.itemIds,
      event.world,
    );

    const guilds = await this.guildsService.getMultipleGuildsByIds(
      event.guildIds,
    );
    const guildNamesMap = new Map(guilds.map((g) => [g.id, g.name]));

    const lootVisibilityNpcs = event.npcs.map((npc) => ({
      type: npc.type,
      level: npc.lvl,
    }));
    const membershipsByOwner =
      await this.matchingService.getActiveMembershipsWithRoles(
        watchedItems
          .map((watchedItem) => watchedItem.notificationRule?.ownerId)
          .filter((ownerId): ownerId is string => typeof ownerId === "string"),
        event.guildIds,
      );

    await Promise.all(
      watchedItems.map(async (watchedItem) => {
        try {
          const notificationRule = watchedItem.notificationRule;
          if (!notificationRule) {
            return;
          }

          if (
            !this.matchingService.matchesLootRule(
              notificationRule.filters as JsonValue,
              event,
            )
          ) {
            return;
          }
          const matchedGuildIds = this.matchingService.getMatchingLootGuildIds(
            notificationRule.filters as JsonValue,
            event.guildIds,
          );
          if (matchedGuildIds.length === 0) {
            return;
          }

          const ownerMemberships =
            membershipsByOwner.get(notificationRule.ownerId) ?? [];
          const visibleGuildIds = matchedGuildIds.filter((guildId) => {
            const membership = ownerMemberships.find(
              (candidate) => candidate.guildId === guildId,
            );
            if (!membership) {
              return false;
            }

            return this.matchingService.canRolesViewLoot(
              membership.roles,
              lootVisibilityNpcs,
              membership.isGuildOwner,
            );
          });

          if (visibleGuildIds.length === 0) {
            return;
          }

          await Promise.all(
            notificationRule.targets.map(async (relation) => {
              if (!relation.target.active || !relation.target.canSend) {
                return;
              }

              const watchedItemName = watchedItem.itemName;
              const guildNames = visibleGuildIds
                .map((id) => guildNamesMap.get(id))
                .filter(Boolean)
                .join(", ");

              const title = WATCHED_ITEM_DROPPED_TITLE;
              const message = watchedItemDroppedMessage(
                event.world,
                guildNames,
                watchedItemName,
              );

              const notificationJob =
                await this.jobService.createNotificationJob({
                  notificationRule,
                  target: relation.target,
                  jobKind: DbNotificationJobKind.INSTANT,
                  scheduledFor: new Date(),
                  sourceEntityType: "loot",
                  sourceEntityId: String(event.lootId),
                  sourceEventId: `loot:${event.lootId}`,
                  payloadSnapshot: {
                    title,
                    message,
                    world: event.world,
                    itemId: watchedItem.itemId,
                    itemName: watchedItemName,
                    guildIds: visibleGuildIds,
                  },
                });

              if (notificationJob) {
                await this.jobService.enqueueNotificationJob(
                  notificationJob.id,
                  0,
                );
              }
            }),
          );
        } catch (error) {
          this.logger.error(
            `Failed to process watched item ${watchedItem.id} for loot ${event.lootId}: ${error instanceof Error ? error.message : error}`,
          );
        }
      }),
    );
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
    queue: "backend-notifications-delivery-result",
    queueOptions: {
      durable: true,
    },
  })
  async handleDeliveryResult(event: DiscordNotificationDeliveryResultEvent) {
    try {
      await this.jobService.handleDeliveryResult(event);
    } catch (error) {
      this.logger.error(
        `Failed to process notification delivery result for ${event.notificationJobId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.DISCORD_GUILD_CHANNEL_DELETED,
    queue: "backend-notifications-discord-guild-channel-deleted",
    queueOptions: {
      durable: true,
    },
  })
  async handleDiscordGuildChannelDeleted(
    event: DiscordGuildChannelDeletedEvent,
  ) {
    try {
      await this.targetService.handleGuildChannelDeleted(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle deleted guild channel ${event.channelId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
