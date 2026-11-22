import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Cause, Clock, Duration, Effect, Result, Schema } from "effect";
import { RabbitRoutingKey as RoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  NotificationTargetType,
  type DiscordNotificationDeliveryResult,
  type DiscordNotificationSendCommand,
} from "@lootlog/schema/notifications";
import { ChannelType } from "discord.js";
import {
  discordErrorCode,
  isRetryableDiscordError,
  isRetryableDiscordSendError,
} from "./non-retryable-discord-error-codes.js";
import type { EventPublisher } from "@lootlog/messaging";

const discordMessageLimit = 2000;

const DeliveryOperation = Schema.Literals([
  "fetch-channel",
  "resolve-channel",
  "fetch-user",
  "create-dm",
  "publish",
  "send",
]);

type DeliveryOperation = typeof DeliveryOperation.Type;

class DiscordDeliveryFailure extends TaggedErrorClass<DiscordDeliveryFailure>()(
  "DiscordDeliveryFailure",
  {
    operation: DeliveryOperation,
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
  if (command.content !== undefined && command.content.trim().length > 0) {
    return command.content;
  }

  if (command.title.trim().length === 0) {
    return command.message;
  }

  return `**${command.title}**\n${command.message}`;
};

const messageNonce = (notificationJobId: string) =>
  new Bun.CryptoHasher("sha256")
    .update(notificationJobId)
    .digest("hex")
    .slice(0, 25);

const messageOptions = (command: DiscordNotificationSendCommand) => ({
  content: truncateToDiscordLimit(notificationContent(command)),
  allowedMentions:
    command.target.targetType === NotificationTargetType.DM
      ? undefined
      : command.allowedMentions,
  nonce: messageNonce(command.notificationJobId),
  enforceNonce: true,
  files: command.files?.map(({ name, base64 }) => ({
    attachment: Buffer.from(base64, "base64"),
    name,
  })),
});

const deliveryFailure = (
  operation: DeliveryOperation,
  cause: unknown,
  options?: { retryable?: boolean; errorCode?: string },
) =>
  new DiscordDeliveryFailure({
    operation,
    errorCode: options?.errorCode ?? discordErrorCode(cause),
    reason: cause instanceof Error ? cause.message : String(cause),
    retryable:
      options?.retryable ??
      (operation === "send"
        ? isRetryableDiscordSendError(cause)
        : isRetryableDiscordError(cause)),
  });

type DeliveryMessage = { readonly id: string };

type MessageSender = {
  readonly send: (
    options: ReturnType<typeof messageOptions>,
  ) => Promise<DeliveryMessage>;
};

export interface DiscordDeliveryClient {
  readonly users: {
    readonly fetch: (
      id: string,
    ) => Promise<{ readonly createDM: () => Promise<MessageSender> }>;
  };
  readonly channels: {
    readonly fetch: (id: string) => Promise<
      | ({
          readonly type: ChannelType;
          readonly isTextBased: () => boolean;
          readonly isSendable: () => boolean;
        } & Partial<MessageSender>)
      | null
    >;
  };
}

export interface DiscordDeliveryOptions {
  readonly stepTimeout?: Duration.Input;
}

export const makeDiscordDelivery = (
  publisher: EventPublisher,
  client: DiscordDeliveryClient,
  options?: DiscordDeliveryOptions,
) => {
  const stepTimeout = options?.stepTimeout ?? "10 seconds";

  const step = <A>(
    operation: Exclude<DeliveryOperation, "publish" | "resolve-channel">,
    execute: () => Promise<A>,
  ) =>
    Effect.tryPromise({
      try: execute,
      catch: (cause) => deliveryFailure(operation, cause),
    }).pipe(
      Effect.timeout(stepTimeout),
      Effect.mapError((error) =>
        Cause.isTimeoutError(error)
          ? deliveryFailure(
              operation,
              new Error(`Discord ${operation} timed out`),
              {
                errorCode:
                  operation === "send" ? "SEND_TIMEOUT" : "LOOKUP_TIMEOUT",
                retryable: operation !== "send",
              },
            )
          : error,
      ),
      withAdapterSpan(`DiscordDelivery_${operation}`, "discord-sdk"),
    );

  const publishDeliveryResult = (payload: DiscordNotificationDeliveryResult) =>
    publisher.publish(RoutingKey.NOTIFICATIONS_DELIVERY_RESULT, payload).pipe(
      Effect.mapError((error) => deliveryFailure("publish", error)),
      Effect.timeout(stepTimeout),
      Effect.mapError((error) =>
        Cause.isTimeoutError(error)
          ? deliveryFailure(
              "publish",
              new Error("Discord result publish timed out"),
            )
          : error,
      ),
      withAdapterSpan("DiscordDelivery_publishResult", "rabbitmq"),
    );

  const sendDirectMessage = Effect.fn("DiscordDelivery_sendDirectMessage")(
    function* (command: DiscordNotificationSendCommand) {
      const user = yield* step("fetch-user", () =>
        client.users.fetch(command.target.externalId),
      );

      const directMessageChannel = yield* step("create-dm", () =>
        user.createDM(),
      );

      const message = yield* step("send", () =>
        directMessageChannel.send(messageOptions(command)),
      );

      return { id: message.id };
    },
  );

  const sendGuildChannelMessage = Effect.fn(
    "DiscordDelivery_sendGuildChannelMessage",
  )(function* (command: DiscordNotificationSendCommand) {
    const channel = yield* step("fetch-channel", () =>
      client.channels.fetch(command.target.externalId),
    );

    if (!channel) {
      return yield* deliveryFailure(
        "resolve-channel",
        new Error("Discord channel was not found"),
        { errorCode: "CHANNEL_NOT_FOUND", retryable: false },
      );
    }

    if (
      channel.type === ChannelType.DM ||
      !channel.isTextBased() ||
      !channel.isSendable() ||
      !channel.send
    ) {
      return yield* deliveryFailure(
        "resolve-channel",
        new Error("Discord channel is not text-based"),
        { errorCode: "CHANNEL_NOT_SENDABLE", retryable: false },
      );
    }

    const send = channel.send.bind(channel);

    const message = yield* step("send", () => send(messageOptions(command)));

    return { id: message.id };
  });

  const sendNotification = Effect.fn("DiscordDelivery_sendNotification", {
    attributes: { adapter: "discord-sdk", retryCount: 0 },
  })(function* (command: DiscordNotificationSendCommand) {
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
        deliveredAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
      });

      return;
    }

    yield* Effect.logError("Failed to send Discord notification").pipe(
      Effect.annotateLogs({
        notificationJobId: command.notificationJobId,
        targetType: command.target.targetType,
        operation: delivery.failure.operation,
        errorCode: delivery.failure.errorCode,
        reason: delivery.failure.reason,
        retryable: delivery.failure.retryable,
      }),
    );
    yield* publishDeliveryResult({
      notificationJobId: command.notificationJobId,
      success: false,
      retryable: delivery.failure.retryable,
      errorCode: delivery.failure.errorCode,
      errorMessage: delivery.failure.reason,
      deliveredAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
    });
  });

  return { sendNotification };
};

export type DiscordDelivery = ReturnType<typeof makeDiscordDelivery>;
