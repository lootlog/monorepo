// oxlint-disable-next-line consistent-type-imports
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  NotificationTargetType,
  type DiscordNotificationDeliveryResultEvent,
  type DiscordNotificationSendCommand,
} from "@lootlog/types";
import { ChannelType, Client, DiscordAPIError } from "discord.js";
import { RoutingKey } from "#src/bot/enums/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { NON_RETRYABLE_DISCORD_ERROR_CODES } from "./constants/non-retryable-discord-error-codes.constant.js";

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
    let content: string;

    if (
      typeof command.content === "string" &&
      command.content.trim().length > 0
    ) {
      content = command.content;
    } else if (command.title.trim().length === 0) {
      content = command.message;
    } else {
      content = `**${command.title}**\n${command.message}`;
    }

    return this.truncateToDiscordLimit(content);
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

  private truncateToDiscordLimit(content: string) {
    const DISCORD_MESSAGE_LIMIT = 2000;

    if (content.length <= DISCORD_MESSAGE_LIMIT) {
      return content;
    }

    return `${content.slice(0, DISCORD_MESSAGE_LIMIT - 1)}…`;
  }

  private isRetryableDiscordError(error: unknown) {
    if (error instanceof DiscordAPIError) {
      return !NON_RETRYABLE_DISCORD_ERROR_CODES.has(Number(error.code));
    }

    if (error instanceof Error) {
      return (
        error.name === "AbortError" ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("fetch failed")
      );
    }

    return false;
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
