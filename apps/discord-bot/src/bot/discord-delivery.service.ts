import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Result, Schema } from "effect";
import { RabbitRoutingKey as RoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  NotificationTargetType,
  type DiscordNotificationDeliveryResultEvent,
  type DiscordNotificationSendCommand,
} from "@lootlog/schema/notifications";
import { ChannelType, type Client, DiscordAPIError } from "discord.js";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { NON_RETRYABLE_DISCORD_ERROR_CODES } from "./constants/non-retryable-discord-error-codes.constant.js";
import type { RabbitPublisher } from "./rabbit-publisher.js";

const discordMessageLimit = 2000;

export class DiscordDeliveryFailure extends TaggedErrorClass<DiscordDeliveryFailure>()(
  "DiscordDeliveryFailure",
  {
    operation: Schema.Literals([
      "fetch-channel",
      "fetch-user",
      "publish",
      "send",
    ]),
    errorCode: Schema.String,
    reason: Schema.String,
    retryable: Schema.Boolean,
  },
) {}

const truncateToDiscordLimit = (content: string) =>
  content.length <= discordMessageLimit
    ? content
    : `${content.slice(0, discordMessageLimit - 1)}…`;

const notificationContent = (command: DiscordNotificationSendCommand) => {
  if (
    typeof command.content === "string" &&
    command.content.trim().length > 0
  ) {
    return truncateToDiscordLimit(command.content);
  }
  if (command.title.trim().length === 0) {
    return truncateToDiscordLimit(command.message);
  }
  return truncateToDiscordLimit(`**${command.title}**\n${command.message}`);
};

const messageOptions = (command: DiscordNotificationSendCommand) => ({
  content: notificationContent(command),
  allowedMentions:
    command.target.targetType === NotificationTargetType.DM
      ? undefined
      : command.allowedMentions,
});

const isRetryableDiscordError = (error: unknown) => {
  if (error instanceof DiscordAPIError) {
    return !NON_RETRYABLE_DISCORD_ERROR_CODES.has(Number(error.code));
  }
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ECONNRESET") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("fetch failed"))
  );
};

const discordErrorCode = (error: unknown) => {
  if (error instanceof DiscordAPIError) return String(error.code);
  return error instanceof Error ? error.name : "UNKNOWN_DISCORD_ERROR";
};

const deliveryFailure = (
  operation: DiscordDeliveryFailure["operation"],
  error: unknown,
) =>
  new DiscordDeliveryFailure({
    operation,
    errorCode: discordErrorCode(error),
    reason: error instanceof Error ? error.message : String(error),
    retryable: isRetryableDiscordError(error),
  });

export const makeDiscordDelivery = (
  publisher: RabbitPublisher,
  client: Client,
) => {
  const publishDeliveryResult = (
    payload: DiscordNotificationDeliveryResultEvent,
  ) =>
    publisher
      .publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
        payload,
      )
      .pipe(
        Effect.mapError((error) => deliveryFailure("publish", error)),
        Effect.timeout("10 seconds"),
        Effect.mapError((error) =>
          error._tag === "TimeoutError"
            ? deliveryFailure(
                "publish",
                new Error("Discord result publish timed out"),
              )
            : error,
        ),
        Effect.withSpan("DiscordDelivery_publishResult", {
          attributes: { adapter: "rabbitmq", retryCount: 0 },
        }),
      );

  const sendDirectMessage = (command: DiscordNotificationSendCommand) =>
    Effect.tryPromise({
      try: async () => {
        const user = await client.users.fetch(command.target.externalId);
        const directMessageChannel = await user.createDM();
        return directMessageChannel.send(messageOptions(command));
      },
      catch: (error) => deliveryFailure("fetch-user", error),
    }).pipe(
      Effect.map((message) => ({ id: message.id })),
      Effect.timeout("10 seconds"),
      Effect.mapError((error) =>
        error._tag === "TimeoutError"
          ? deliveryFailure("send", new Error("Discord DM send timed out"))
          : error,
      ),
      Effect.withSpan("DiscordDelivery_sendDirectMessage", {
        attributes: { adapter: "discord-sdk", retryCount: 0 },
      }),
    );

  const sendGuildChannelMessage = (command: DiscordNotificationSendCommand) =>
    Effect.tryPromise({
      try: async () => {
        const channel = await client.channels.fetch(command.target.externalId);
        if (
          !channel ||
          channel.type === ChannelType.DM ||
          !channel.isTextBased() ||
          !channel.isSendable()
        ) {
          throw new Error("Discord channel is not text-based");
        }
        return channel.send(messageOptions(command));
      },
      catch: (error) => deliveryFailure("fetch-channel", error),
    }).pipe(
      Effect.map((message) => ({ id: message.id })),
      Effect.timeout("10 seconds"),
      Effect.mapError((error) =>
        error._tag === "TimeoutError"
          ? deliveryFailure("send", new Error("Discord channel send timed out"))
          : error,
      ),
      Effect.withSpan("DiscordDelivery_sendGuildChannelMessage", {
        attributes: { adapter: "discord-sdk", retryCount: 0 },
      }),
    );

  const sendNotification = Effect.fn("DiscordDelivery_sendNotification")(
    function* (command: DiscordNotificationSendCommand) {
      const delivery = yield* (
        command.target.targetType === NotificationTargetType.DM
          ? sendDirectMessage(command)
          : sendGuildChannelMessage(command)
      ).pipe(Effect.result);
      if (Result.isSuccess(delivery)) {
        yield* publishDeliveryResult({
          notificationJobId: command.notificationJobId,
          success: true,
          retryable: false,
          providerMessageId: delivery.success.id,
          deliveredAt: new Date().toISOString(),
        });
        return;
      }

      yield* Effect.logError("Failed to send Discord notification").pipe(
        Effect.annotateLogs({
          notificationJobId: command.notificationJobId,
          operation: delivery.failure.operation,
          retryable: delivery.failure.retryable,
        }),
      );
      yield* publishDeliveryResult({
        notificationJobId: command.notificationJobId,
        success: false,
        retryable: delivery.failure.retryable,
        errorCode: delivery.failure.errorCode,
        errorMessage: delivery.failure.reason,
        deliveredAt: new Date().toISOString(),
      });
    },
  );

  return {
    sendNotification: (command: DiscordNotificationSendCommand) =>
      sendNotification(command).pipe(
        Effect.withSpan("DiscordDelivery_sendNotification", {
          attributes: { adapter: "discord-sdk", retryCount: 0 },
        }),
      ),
  };
};

export type DiscordDelivery = ReturnType<typeof makeDiscordDelivery>;
