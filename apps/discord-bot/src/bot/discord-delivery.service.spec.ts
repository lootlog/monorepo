import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  NotificationOwnerType,
  NotificationProvider,
  NotificationTargetType,
  type DiscordNotificationSendCommand,
} from "@lootlog/types";
import { Test, type TestingModule } from "@nestjs/testing";
import { ChannelType, Client, DiscordAPIError } from "discord.js";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { DiscordDeliveryService } from "./discord-delivery.service";
import { RoutingKey } from "./enums/routing-key.enum";

describe("DiscordDeliveryService", () => {
  let service: DiscordDeliveryService;
  let amqpConnection: { publish: jest.Mock };
  let mockClient: {
    users: {
      fetch: jest.Mock;
    };
    channels: {
      fetch: jest.Mock;
    };
  };

  const createCommand = (
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
        targetType === NotificationTargetType.DM
          ? "discord-user-123"
          : "discord-channel-123",
      targetType,
    },
  });

  const createDiscordApiError = (code: number, message: string) => {
    const discordApiError = new Error(message) as DiscordAPIError;

    Object.setPrototypeOf(discordApiError, DiscordAPIError.prototype);
    Object.defineProperty(discordApiError, "code", {
      value: code,
      configurable: true,
    });

    return discordApiError;
  };

  beforeEach(async () => {
    amqpConnection = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    mockClient = {
      users: {
        fetch: jest.fn(),
      },
      channels: {
        fetch: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordDeliveryService,
        {
          provide: Client,
          useValue: mockClient,
        },
        {
          provide: AmqpConnection,
          useValue: amqpConnection,
        },
      ],
    }).compile();

    service = module.get<DiscordDeliveryService>(DiscordDeliveryService);
  });

  it("sends a direct message and publishes success result", async () => {
    const send = jest.fn().mockResolvedValue({
      id: "discord-message-1",
    });
    const createDM = jest.fn().mockResolvedValue({
      send,
    });
    mockClient.users.fetch.mockResolvedValue({
      createDM,
    });

    await service.sendNotification(createCommand(NotificationTargetType.DM));

    expect(mockClient.users.fetch).toHaveBeenCalledWith("discord-user-123");
    expect(createDM).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith({
      content: "**Boss alert**\nTanroth spawned",
    });
    expect(amqpConnection.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      expect.objectContaining({
        notificationJobId: "job-123",
        success: true,
        retryable: false,
        providerMessageId: "discord-message-1",
      }),
    );
  });

  it("sends a guild channel message without title prefix when title is empty", async () => {
    const send = jest.fn().mockResolvedValue({
      id: "discord-message-2",
    });
    mockClient.channels.fetch.mockResolvedValue({
      type: ChannelType.GuildText,
      isTextBased: () => true,
      isSendable: () => true,
      send,
    });

    const command = createCommand(NotificationTargetType.CHANNEL);
    command.title = " ";

    await service.sendNotification(command);

    expect(mockClient.channels.fetch).toHaveBeenCalledWith(
      "discord-channel-123",
    );
    expect(send).toHaveBeenCalledWith({
      content: "Tanroth spawned",
    });
    expect(amqpConnection.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      expect.objectContaining({
        notificationJobId: "job-123",
        success: true,
        retryable: false,
        providerMessageId: "discord-message-2",
      }),
    );
  });

  it("passes custom content and allowed mentions to guild channels", async () => {
    const send = jest.fn().mockResolvedValue({
      id: "discord-message-mentions",
    });
    mockClient.channels.fetch.mockResolvedValue({
      type: ChannelType.GuildText,
      isTextBased: () => true,
      isSendable: () => true,
      send,
    });

    const command = createCommand(NotificationTargetType.CHANNEL);
    command.content = "<@&123> @everyone Boss pojawi sie za chwile";
    command.allowedMentions = {
      parse: ["everyone"],
      roles: ["123"],
      repliedUser: false,
    };

    await service.sendNotification(command);

    expect(send).toHaveBeenCalledWith({
      content: "<@&123> @everyone Boss pojawi sie za chwile",
      allowedMentions: {
        parse: ["everyone"],
        roles: ["123"],
        repliedUser: false,
      },
    });
  });

  it("does not pass allowed mentions to direct messages", async () => {
    const send = jest.fn().mockResolvedValue({
      id: "discord-message-dm-mentions",
    });
    const createDM = jest.fn().mockResolvedValue({
      send,
    });
    mockClient.users.fetch.mockResolvedValue({
      createDM,
    });

    const command = createCommand(NotificationTargetType.DM);
    command.content = "<@&123> @here Test";
    command.allowedMentions = {
      parse: ["everyone"],
      roles: ["123"],
    };

    await service.sendNotification(command);

    expect(send).toHaveBeenCalledWith({
      content: "<@&123> @here Test",
      allowedMentions: undefined,
    });
  });

  it("publishes a retryable failure for invalid guild channels", async () => {
    mockClient.channels.fetch.mockResolvedValue({
      type: ChannelType.DM,
      isTextBased: () => true,
      isSendable: () => true,
    });

    await service.sendNotification(
      createCommand(NotificationTargetType.CHANNEL),
    );

    expect(amqpConnection.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      expect.objectContaining({
        notificationJobId: "job-123",
        success: false,
        retryable: true,
        errorCode: "Error",
        errorMessage: "Discord channel is not text-based",
      }),
    );
  });

  it("publishes a non-retryable failure for permanent Discord API errors", async () => {
    mockClient.channels.fetch.mockRejectedValue(
      createDiscordApiError(50_013, "Missing permissions"),
    );

    await service.sendNotification(
      createCommand(NotificationTargetType.CHANNEL),
    );

    expect(amqpConnection.publish).toHaveBeenCalledWith(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_DELIVERY_RESULT,
      expect.objectContaining({
        notificationJobId: "job-123",
        success: false,
        retryable: false,
        errorCode: "50013",
        errorMessage: "Missing permissions",
      }),
    );
  });
});
