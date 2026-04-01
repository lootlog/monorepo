// oxlint-disable-next-line consistent-type-imports
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type {
  DiscordNotificationDeliveryResultEvent,
  DiscordNotificationSendCommand,
} from "@lootlog/types";
import { NotificationTargetType } from "@lootlog/types";
import { ChannelType, Client, DiscordAPIError } from "discord.js";
import { RoutingKey } from "src/bot/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { NON_RETRYABLE_DISCORD_ERROR_CODES } from "./constants/non-retryable-discord-error-codes.constant";

@Injectable()
export class DiscordDeliveryService {
  private readonly logger = new Logger(DiscordDeliveryService.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    @Inject(Client) private readonly client: Client,
  ) {}

  async sendNotification(command: DiscordNotificationSendCommand) {
    try {
      const sentMessage =
        command.target.targetType === NotificationTargetType.DM
          ? await this.sendDirectMessage(command)
          : await this.sendGuildChannelMessage(command);

      await this.publishDeliveryResult({
        notificationJobId: command.notificationJobId,
        success: true,
        retryable: false,
        providerMessageId: sentMessage.id,
        deliveredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send Discord notification ${command.notificationJobId}: ${error instanceof Error ? error.message : error}`,
      );

      await this.publishDeliveryResult({
        notificationJobId: command.notificationJobId,
        success: false,
        retryable: this.isRetryableDiscordError(error),
        errorCode: this.getDiscordErrorCode(error),
        errorMessage:
          error instanceof Error ? error.message : "Unknown Discord error",
        deliveredAt: new Date().toISOString(),
      });
    }
  }

  private async sendDirectMessage(command: DiscordNotificationSendCommand) {
    const user = await this.client.users.fetch(command.target.externalId);
    const directMessageChannel = await user.createDM();

    return directMessageChannel.send(this.buildMessageOptions(command));
  }

  private async sendGuildChannelMessage(
    command: DiscordNotificationSendCommand,
  ) {
    const channel = await this.client.channels.fetch(command.target.externalId);

    if (
      !channel ||
      channel.type === ChannelType.DM ||
      !channel.isTextBased() ||
      !channel.isSendable()
    ) {
      throw new Error("Discord channel is not text-based");
    }

    return channel.send(this.buildMessageOptions(command));
  }

  private buildNotificationContent(command: DiscordNotificationSendCommand) {
    if (typeof command.content === "string" && command.content.trim().length > 0) {
      return command.content;
    }

    if (command.title.trim().length === 0) {
      return command.message;
    }

    return `**${command.title}**\n${command.message}`;
  }

  private buildMessageOptions(command: DiscordNotificationSendCommand) {
    return {
      content: this.buildNotificationContent(command),
      allowedMentions:
        command.target.targetType === NotificationTargetType.DM
          ? undefined
          : command.allowedMentions,
    };
  }

  private async publishDeliveryResult(
    payload: DiscordNotificationDeliveryResultEvent,
  ) {
    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      payload,
    );
  }

  private isRetryableDiscordError(error: unknown) {
    if (!(error instanceof DiscordAPIError)) {
      return true;
    }

    return !NON_RETRYABLE_DISCORD_ERROR_CODES.has(Number(error.code));
  }

  private getDiscordErrorCode(error: unknown) {
    if (error instanceof DiscordAPIError) {
      return String(error.code);
    }

    if (error instanceof Error) {
      return error.name;
    }

    return "UNKNOWN_DISCORD_ERROR";
  }
}
