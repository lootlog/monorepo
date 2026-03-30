import { Injectable, Logger } from "@nestjs/common";
import {
  AmqpConnection,
  RabbitSubscribe,
  MessageHandlerErrorBehavior,
} from "@golevelup/nestjs-rabbitmq";
import { Client, type TextChannel } from "discord.js";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/bot/enums/routing-key.enum";

const DISCORD_NOTIFICATIONS_SEND_QUEUE = "discord.notifications.send";

interface NotificationSendPayload {
  jobId?: string;
  idempotencyKey: string;
  targetType: "channel" | "dm";
  externalId: string;
  payload: {
    triggerType: string;
    [key: string]: unknown;
  };
}

@Injectable()
export class NotificationDeliveryHandler {
  private readonly logger = new Logger(NotificationDeliveryHandler.name);

  constructor(
    private readonly client: Client,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  @RabbitSubscribe({
    exchange: DEFAULT_EXCHANGE_NAME,
    routingKey: RoutingKey.NOTIFICATIONS_DISCORD_SEND,
    queue: DISCORD_NOTIFICATIONS_SEND_QUEUE,
    errorBehavior: MessageHandlerErrorBehavior.NACK,
    queueOptions: { durable: true },
  })
  async handleNotificationSend(payload: NotificationSendPayload) {
    this.logger.debug(
      `Delivering notification: type=${payload.targetType} target=${payload.externalId} trigger=${payload.payload.triggerType}`,
    );

    try {
      const message = this.formatMessage(payload.payload);

      if (payload.targetType === "channel") {
        await this.sendToChannel(payload.externalId, message);
      } else {
        await this.sendDm(payload.externalId, message);
      }

      await this.publishResult({
        jobId: payload.jobId,
        idempotencyKey: payload.idempotencyKey,
        success: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to deliver notification to ${payload.externalId}: ${errorMessage}`,
      );

      await this.publishResult({
        jobId: payload.jobId,
        idempotencyKey: payload.idempotencyKey,
        success: false,
        error: errorMessage,
      });
    }
  }

  private async sendToChannel(channelId: string, content: string) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      throw new Error(`Channel ${channelId} is not a text channel or not found`);
    }
    await (channel as TextChannel).send(content);
  }

  private async sendDm(userId: string, content: string) {
    const user = await this.client.users.fetch(userId);
    await user.send(content);
  }

  private formatMessage(payload: Record<string, unknown>): string {
    const triggerType = payload.triggerType as string;

    switch (triggerType) {
      case "timer_before_spawn": {
        const npc = payload.npc as Record<string, unknown> | undefined;
        const npcName = npc?.name ?? "Unknown NPC";
        const leadTime = payload.leadTimeMinutes ?? "?";
        return `⏰ **${npcName}** spawns in ~${leadTime} minutes!`;
      }
      case "npc_spawned": {
        return `🔔 A respawn window has opened!`;
      }
      case "watched_item_dropped": {
        const item = payload.item as Record<string, unknown> | undefined;
        const itemName = item?.name ?? "Unknown Item";
        const world = payload.world ?? "";
        return `🎁 **${itemName}** just dropped${world ? ` on ${world}` : ""}!`;
      }
      default:
        return `📢 Notification: ${triggerType}`;
    }
  }

  private async publishResult(result: {
    jobId?: string;
    idempotencyKey: string;
    success: boolean;
    error?: string;
  }) {
    try {
      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
        result,
      );
    } catch (error) {
      this.logger.error(`Failed to publish delivery result: ${error}`);
    }
  }
}
