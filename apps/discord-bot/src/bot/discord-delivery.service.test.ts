import { describe, expect, mock, test } from "bun:test";
import {
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
  type DiscordNotificationSendCommand,
} from "@lootlog/schema/notifications";
import { ChannelType, type Client } from "discord.js";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { DiscordDeliveryService } from "./discord-delivery.service.js";

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

describe("DiscordDeliveryService", () => {
  test("sends a DM and publishes the delivery result", async () => {
    const send = mock(async () => ({ id: "message-1" }));
    const publish = mock(async () => undefined);
    const client = {
      users: {
        fetch: mock(async () => ({ createDM: async () => ({ send }) })),
      },
      channels: { fetch: mock() },
    } as unknown as Client;
    await new DiscordDeliveryService({ publish }, client).sendNotification(
      command(NotificationTargetType.DM),
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
    const publish = mock(async () => undefined);
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
    } as unknown as Client;
    const input = {
      ...command(NotificationTargetType.CHANNEL),
      content: "<@&123> alert",
      allowedMentions: { roles: ["123"] },
    };
    await new DiscordDeliveryService({ publish }, client).sendNotification(
      input,
    );
    expect(send).toHaveBeenCalledWith({
      content: "<@&123> alert",
      allowedMentions: { roles: ["123"] },
    });
  });

  test("publishes a non-retryable result for invalid channels", async () => {
    const publish = mock(async () => undefined);
    const client = {
      users: { fetch: mock() },
      channels: {
        fetch: mock(async () => ({
          type: ChannelType.DM,
          isTextBased: () => true,
          isSendable: () => true,
        })),
      },
    } as unknown as Client;
    await new DiscordDeliveryService({ publish }, client).sendNotification(
      command(NotificationTargetType.CHANNEL),
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
});
