import { describe, expect, mock, test } from "bun:test";
import {
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
  type DiscordNotificationSendCommand,
} from "@lootlog/schema/notifications";
import {
  ChannelType,
  DiscordAPIError,
  HTTPError,
  RateLimitError,
} from "discord.js";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect, Fiber, Logger, type Duration } from "effect";
import {
  makeDiscordDelivery,
  type DiscordDeliveryClient,
} from "./discord-delivery.service.js";
import type { RabbitPublisher } from "./rabbit-publisher.js";

const command = (
  targetType: NotificationTargetType,
): DiscordNotificationSendCommand => ({
  notificationJobId: "job-123",
  provider: NotificationProvider.DISCORD,
  ownerType: NotificationOwnerType.GUILD,
  ownerId: "guild-123",
  guildId: "guild-123",
  title: "Boss alert",
  message: "Tanroth spawned",
  target: {
    targetId: "target-123",
    externalId:
      targetType === NotificationTargetType.DM ? "user-123" : "channel-123",
    targetType,
  },
});

const discordApiError = (code: number, status: number, message: string) =>
  new DiscordAPIError(
    { message, code },
    code,
    status,
    "POST",
    "https://discord.com/api/v10/channels/channel-123/messages",
    {},
  );

const rateLimitError = () =>
  new RateLimitError({
    timeToReset: 1000,
    limit: 5,
    method: "GET",
    hash: "hash",
    url: "https://discord.com/api/v10/channels/channel-123",
    route: "/channels/:id",
    majorParameter: "channel-123",
    global: false,
    retryAfter: 1000,
    sublimitTimeout: 0,
    scope: "user",
  });

const sendableChannel = (send: () => Promise<{ id: string }>) => ({
  type: ChannelType.GuildText,
  isTextBased: () => true,
  isSendable: () => true,
  send,
});

const deliverChannelMessage = async (
  client: DiscordDeliveryClient,
  options?: { stepTimeout?: Duration.Input },
) => {
  const published: unknown[] = [];

  const publish: RabbitPublisher["publish"] = (
    _exchange,
    _routingKey,
    payload,
  ) =>
    Effect.sync(() => {
      published.push(payload);
    });

  const logs: unknown[] = [];

  await Effect.runPromise(
    makeDiscordDelivery({ publish }, client, {
      stepTimeout: options?.stepTimeout ?? "10 seconds",
    })
      .sendNotification(command(NotificationTargetType.CHANNEL))
      .pipe(
        Effect.provide(
          Logger.layer([
            Logger.formatStructured.pipe(
              Logger.map((entry) => logs.push(entry.annotations)),
            ),
          ]),
        ),
      ),
  );

  return {
    result: published[0],
    log: logs[0],
  };
};

describe("Discord delivery", () => {
  test("sends a DM and publishes the delivery result", async () => {
    const send = mock(async () => ({ id: "message-1" }));
    const publish = mock(() => Effect.void);

    const client = {
      users: {
        fetch: mock(async () => ({ createDM: async () => ({ send }) })),
      },
      channels: { fetch: mock() },
    } satisfies DiscordDeliveryClient;

    await Effect.runPromise(
      makeDiscordDelivery({ publish }, client).sendNotification(
        command(NotificationTargetType.DM),
      ),
    );
    expect(send).toHaveBeenCalledWith({
      content: "**Boss alert**\nTanroth spawned",
      allowedMentions: undefined,
    });
    expect(publish).toHaveBeenCalledWith(
      "default",
      RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      expect.objectContaining({
        success: true,
        providerMessageId: "message-1",
      }),
    );
  });

  test("keeps allowed mentions for guild channels", async () => {
    const send = mock(async () => ({ id: "message-2" }));
    const publish = mock(() => Effect.void);

    const client = {
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () => ({
          type: ChannelType.GuildText,
          isTextBased: () => true,
          isSendable: () => true,
          send,
        })),
      },
    } satisfies DiscordDeliveryClient;

    const input = {
      ...command(NotificationTargetType.CHANNEL),
      content: "<@&123> alert",
      allowedMentions: { roles: ["123"] },
    };

    await Effect.runPromise(
      makeDiscordDelivery({ publish }, client).sendNotification(input),
    );
    expect(send).toHaveBeenCalledWith({
      content: "<@&123> alert",
      allowedMentions: { roles: ["123"] },
    });
  });

  test("publishes a non-retryable result for invalid channels", async () => {
    const publish = mock(() => Effect.void);

    const client = {
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () => ({
          type: ChannelType.DM,
          isTextBased: () => true,
          isSendable: () => true,
        })),
      },
    } satisfies DiscordDeliveryClient;

    await Effect.runPromise(
      makeDiscordDelivery({ publish }, client).sendNotification(
        command(NotificationTargetType.CHANNEL),
      ),
    );
    expect(publish).toHaveBeenCalledWith(
      "default",
      RabbitRoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      expect.objectContaining({
        success: false,
        retryable: false,
        errorMessage: "Discord channel is not text-based",
      }),
    );
  });

  test("reports a permanent send failure with the Discord code and failing step", async () => {
    const { result, log } = await deliverChannelMessage({
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () =>
          sendableChannel(async () => {
            throw discordApiError(50013, 403, "Missing Permissions");
          }),
        ),
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        retryable: false,
        errorCode: "50013",
        errorMessage: "Missing Permissions",
      }),
    );
    expect(log).toEqual(
      expect.objectContaining({
        operation: "send",
        errorCode: "50013",
        reason: "Missing Permissions",
        retryable: false,
      }),
    );
    expect(JSON.stringify(log)).not.toContain("channel-123");
    expect(JSON.stringify(log)).not.toContain("Tanroth");
  });

  test("marks rate limits and Discord outages on lookup as retryable", async () => {
    const rateLimited = await deliverChannelMessage({
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () => {
          throw rateLimitError();
        }),
      },
    });

    expect(rateLimited.result).toEqual(
      expect.objectContaining({ retryable: true, errorCode: "RATE_LIMITED" }),
    );
    expect(rateLimited.log).toEqual(
      expect.objectContaining({ operation: "fetch-channel", retryable: true }),
    );

    const outage = await deliverChannelMessage({
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () => {
          throw new HTTPError(
            502,
            "Bad Gateway",
            "GET",
            "https://discord.com/api/v10/channels/channel-123",
            {},
          );
        }),
      },
    });

    expect(outage.result).toEqual(
      expect.objectContaining({ retryable: true, errorCode: "HTTP_502" }),
    );

    const serverError = await deliverChannelMessage({
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () =>
          sendableChannel(async () => {
            throw discordApiError(0, 500, "Internal Server Error");
          }),
        ),
      },
    });

    expect(serverError.result).toEqual(
      expect.objectContaining({ retryable: true, errorCode: "0" }),
    );
  });

  test("retries a timed out lookup but not a timed out send", async () => {
    const never = () => new Promise<never>(() => undefined);

    const lookupTimeout = await deliverChannelMessage(
      { users: { fetch: mock() }, channels: { fetch: mock(never) } },
      { stepTimeout: "20 millis" },
    );

    expect(lookupTimeout.result).toEqual(
      expect.objectContaining({ retryable: true, errorCode: "LOOKUP_TIMEOUT" }),
    );
    expect(lookupTimeout.log).toEqual(
      expect.objectContaining({ operation: "fetch-channel" }),
    );

    const sendTimeout = await deliverChannelMessage(
      {
        users: { fetch: mock() },
        channels: { fetch: mock(async () => sendableChannel(never)) },
      },
      { stepTimeout: "20 millis" },
    );

    expect(sendTimeout.result).toEqual(
      expect.objectContaining({ retryable: false, errorCode: "SEND_TIMEOUT" }),
    );
    expect(sendTimeout.log).toEqual(
      expect.objectContaining({ operation: "send" }),
    );
  });

  test("reports a missing channel separately from an unsendable one", async () => {
    const missing = await deliverChannelMessage({
      users: { fetch: mock() },
      channels: { fetch: mock(async () => null) },
    });

    expect(missing.result).toEqual(
      expect.objectContaining({
        retryable: false,
        errorCode: "CHANNEL_NOT_FOUND",
      }),
    );
    expect(missing.log).toEqual(
      expect.objectContaining({ operation: "resolve-channel" }),
    );
  });

  test("propagates interruption to an active Discord SDK mutation", async () => {
    const fetchPending = new Promise<never>(() => undefined);
    const publish = mock(() => Effect.void);
    const fetch = mock(() => fetchPending);

    const client = {
      users: { fetch: mock() },
      channels: { fetch },
    } satisfies DiscordDeliveryClient;

    const fiber = Effect.runFork(
      makeDiscordDelivery({ publish }, client).sendNotification(
        command(NotificationTargetType.CHANNEL),
      ),
    );

    while (fetch.mock.calls.length === 0) await Promise.resolve();

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(publish).not.toHaveBeenCalled();
  });
});
