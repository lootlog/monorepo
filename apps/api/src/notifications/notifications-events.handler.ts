import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordNotificationDeliveryResultEvent,
} from "@lootlog/types";
import {
  type NpcType,
  NotificationJobKind as DbNotificationJobKind,
  NotificationOwnerType as DbNotificationOwnerType,
  NotificationTriggerType as DbNotificationTriggerType,
} from "prisma/generated/client";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import { NotificationJobService } from "src/notifications/notification-job.service";
import { NotificationMatchingService } from "src/notifications/notification-matching.service";
import { NotificationTargetService } from "src/notifications/notification-target.service";
import { GuildsService } from "src/guilds/guilds.service";

@Injectable()
export class NotificationsEventsHandler {
  private readonly logger = new Logger(NotificationsEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
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
    const notificationRules = await this.prisma.notificationRule.findMany({
      where: {
        ownerType: DbNotificationOwnerType.GUILD,
        ownerId: event.guildId,
        guildId: event.guildId,
        enabled: true,
        triggerType: DbNotificationTriggerType.TIMER_BEFORE_SPAWN,
        OR: [{ world: null }, { world: event.world }],
      },
    });

    for (const notificationRule of notificationRules) {
      if (
        !this.matchingService.matchesTimerRule(
          notificationRule.filters,
          event.npcId,
        )
      ) {
        continue;
      }

      await this.jobService.rebuildTimerJobsForRule(notificationRule.id, event);
    }
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
    await this.jobService.cancelPendingJobs({
      sourceEntityType: "timer",
      sourceEntityId: this.jobService.getTimerSourceEntityId(event),
    });
  }

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_LOOT_CREATED,
    queue: "backend-notifications-loot-created",
    queueOptions: {
      durable: true,
    },
  })
  async handleLootCreated(event: {
    lootId: number;
    world: string;
    guildIds: string[];
    itemIds: number[];
    itemNames: string[];
    npcType?: NpcType | null;
    npcLvl?: number | null;
  }) {
    const watchedItems = await this.prisma.watchedItem.findMany({
      where: {
        enabled: true,
        itemId: {
          in: event.itemIds,
        },
        world: event.world,
        notificationRule: {
          is: {
            enabled: true,
            triggerType: DbNotificationTriggerType.WATCHED_ITEM_DROPPED,
            world: event.world,
            targets: {
              some: {},
            },
          },
        },
      },
      include: {
        notificationRule: {
          include: {
            targets: {
              include: {
                target: true,
              },
            },
          },
        },
      },
    });

    const guilds = await this.guildsService.getMultipleGuildsByIds(
      event.guildIds,
    );
    const guildNamesMap = new Map(guilds.map((g) => [g.id, g.name]));

    const hasNpcData = event.npcType != null || event.npcLvl != null;

    const membershipsByOwner = hasNpcData
      ? await this.matchingService.getActiveMembershipsWithRoles(
          watchedItems
            .map((watchedItem) => watchedItem.notificationRule?.ownerId)
            .filter(
              (ownerId): ownerId is string => typeof ownerId === "string",
            ),
          event.guildIds,
        )
      : null;

    const activeGuildIdsByOwnerId = membershipsByOwner
      ? null
      : await this.matchingService.getActiveMembershipGuildIdsByOwner(
          watchedItems
            .map((watchedItem) => watchedItem.notificationRule?.ownerId)
            .filter(
              (ownerId): ownerId is string => typeof ownerId === "string",
            ),
          event.guildIds,
        );

    for (const watchedItem of watchedItems) {
      const notificationRule = watchedItem.notificationRule;
      if (!notificationRule) {
        continue;
      }

      if (
        !this.matchingService.matchesLootRule(notificationRule.filters, event)
      ) {
        continue;
      }
      const matchedGuildIds = this.matchingService.getMatchingLootGuildIds(
        notificationRule.filters,
        event.guildIds,
      );
      if (matchedGuildIds.length === 0) {
        continue;
      }

      let visibleGuildIds: string[];

      if (membershipsByOwner) {
        const ownerMemberships =
          membershipsByOwner.get(notificationRule.ownerId) ?? [];
        const authorizedGuildIds = matchedGuildIds.filter((guildId) =>
          ownerMemberships.some((m) => m.guildId === guildId),
        );
        visibleGuildIds = authorizedGuildIds.filter((guildId) => {
          const membership = ownerMemberships.find(
            (m) => m.guildId === guildId,
          );
          if (!membership) {
            return false;
          }
          return this.matchingService.canRolesViewNpc(
            membership.roles,
            event.npcType,
            event.npcLvl,
            membership.isGuildOwner,
          );
        });
      } else {
        const activeOwnerGuildIds =
          activeGuildIdsByOwnerId!.get(notificationRule.ownerId) ?? new Set();
        visibleGuildIds = matchedGuildIds.filter((guildId) =>
          activeOwnerGuildIds.has(guildId),
        );
      }

      if (visibleGuildIds.length === 0) {
        continue;
      }

      for (const relation of notificationRule.targets) {
        if (!relation.target.active || !relation.target.canSend) {
          continue;
        }

        const watchedItemName = watchedItem.itemName;
        const guildNames = visibleGuildIds
          .map((id) => guildNamesMap.get(id))
          .filter(Boolean)
          .join(", ");

        const title = "Obserwowany item wypadł!";
        const message = `Na świecie ${event.world} na lootlogu ${guildNames} wypadł obserwowany przedmiot: ${watchedItemName}`;

        const notificationJob = await this.jobService.createNotificationJob({
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
          await this.jobService.enqueueNotificationJob(notificationJob.id, 0);
        }
      }
    }
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
    await this.targetService.handleGuildChannelDeleted(event);
  }
}
