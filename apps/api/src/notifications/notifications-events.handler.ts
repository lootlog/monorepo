import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Injectable, Logger } from "@nestjs/common";
import type {
  DiscordGuildChannelDeletedEvent,
  DiscordNotificationDeliveryResultEvent,
} from "@lootlog/types";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { NotificationsService } from "src/notifications/notifications.service";

@Injectable()
export class NotificationsEventsHandler {
  private readonly logger = new Logger(NotificationsEventsHandler.name);

  constructor(private readonly notificationsService: NotificationsService) {}

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
    await this.notificationsService.handleTimerUpdated(event);
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
    await this.notificationsService.handleTimerDeleted(event);
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
  }) {
    await this.notificationsService.handleLootCreated(event);
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
      await this.notificationsService.handleDeliveryResult(event);
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
    await this.notificationsService.handleGuildChannelDeleted(event);
  }
}
