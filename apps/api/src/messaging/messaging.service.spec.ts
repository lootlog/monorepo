import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { MessagingService } from "./messaging.service.js";
import { GuildsService } from "#src/guilds/guilds.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { NpcType } from "#src/generated/prisma/client";
import { getNpcTypeByWt } from "@lootlog/types";
import { ReadyRoomService } from "#src/messaging/ready-room/ready-room.service";
import { NotificationRateLimiterService } from "#src/messaging/notification-rate-limiter.service";

const { mockUuid } = vi.hoisted(() => ({
  mockUuid: vi.fn<() => string>(() => "mock-uuid"),
}));

vi.mock("uuid", () => ({
  v4: mockUuid,
}));

describe("MessagingService", () => {
  let service: MessagingService;

  const mockLogger = { log: mockFn() };

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  const mockGuildsService = {
    getGuildsForRequiredPermissions: mockFn(),
  };

  const mockRedisService = {
    get: mockFn(),
    set: mockFn(),
    del: mockFn(),
  };

  const mockReadyRoomService = {
    create: mockFn(),
  };

  const mockNotificationRateLimiter = {
    consume: mockFn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: AmqpConnection, useValue: mockAmqpConnection },
        { provide: GuildsService, useValue: mockGuildsService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ReadyRoomService, useValue: mockReadyRoomService },
        {
          provide: NotificationRateLimiterService,
          useValue: mockNotificationRateLimiter,
        },
      ],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    vi.clearAllMocks();
    mockNotificationRateLimiter.consume.mockResolvedValue({ accepted: true });
  });

  describe("sendNotification", () => {
    const discordId = "123456";
    const userId = "user-1";

    it("keeps npc coordinates in published payloads", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild-1" },
        { id: "guild-2" },
      ]);

      const result = await service.sendNotification(userId, discordId, {
        npc: {
          id: 911169,
          hpp: 0,
          location: "Glusza Swistu",
          name: "Debug Tytan #228",
          wt: 102,
          x: 10,
          y: 10,
          lvl: 306,
          prof: "h",
          icon: "tyt/maddok-tytan2.gif",
          type: 2,
        },
        world: "gordion",
        guildIds: ["guild-1", "guild-2"],
      });

      const expectedNpcType = getNpcTypeByWt(NpcType, 102, "h", 2);

      expect(result).toEqual({
        notificationId: "mock-uuid",
        guildIds: ["guild-1", "guild-2"],
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        "notification:mock-uuid",
        expect.any(String),
        1800,
      );
      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(2);
      expect(mockAmqpConnection.publish).toHaveBeenNthCalledWith(
        1,
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_NOTIFICATIONS_SEND,
        {
          createdAt: expect.any(String),
          discordId,
          guildId: "guild-1",
          notificationId: "mock-uuid",
          npc: {
            hpp: 0,
            icon: "tyt/maddok-tytan2.gif",
            id: 911169,
            location: "Glusza Swistu",
            lvl: 306,
            name: "Debug Tytan #228",
            prof: "h",
            type: expectedNpcType,
            wt: 102,
            x: 10,
            y: 10,
          },
          world: "gordion",
        },
      );
      expect(mockAmqpConnection.publish).toHaveBeenNthCalledWith(
        2,
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_NOTIFICATIONS_SEND,
        {
          createdAt: expect.any(String),
          discordId,
          guildId: "guild-2",
          notificationId: "mock-uuid",
          npc: {
            hpp: 0,
            icon: "tyt/maddok-tytan2.gif",
            id: 911169,
            location: "Glusza Swistu",
            lvl: 306,
            name: "Debug Tytan #228",
            prof: "h",
            type: expectedNpcType,
            wt: 102,
            x: 10,
            y: 10,
          },
          world: "gordion",
        },
      );
    });

    it("creates an NPC party gathering in the Ready Room with the notification id", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild-1" },
      ]);

      await service.sendNotification(userId, discordId, {
        npc: {
          id: 911169,
          location: "Glusza Swistu",
          name: "Debug Tytan #228",
          wt: 102,
          lvl: 306,
          icon: "tyt/maddok-tytan2.gif",
          type: 2,
        },
        character: {
          lvl: 250,
          nick: "Organizer",
          accountId: "account-1",
          characterId: "character-1",
          prof: "w",
          icon: "organizer.gif",
        },
        world: "gordion",
        guildIds: ["guild-1"],
        isGatheringParty: true,
      });

      expect(mockReadyRoomService.create).toHaveBeenCalledWith({
        notificationId: "mock-uuid",
        organizerDiscordId: discordId,
        organizerCharacter: {
          lvl: 250,
          nick: "Organizer",
          accountId: "account-1",
          characterId: "character-1",
          prof: "w",
          icon: "organizer.gif",
        },
        guildIds: ["guild-1"],
        world: "gordion",
      });
    });

    it("rejects a rate-limited request before creating notification side effects", async () => {
      mockNotificationRateLimiter.consume.mockResolvedValue({
        accepted: false,
        retryAfterMs: 1_250,
      });

      const error = await service
        .sendNotification(userId, discordId, {
          message: "alarm",
          world: "gordion",
          guildIds: ["guild-1", "guild-2"],
        })
        .catch((caughtError: unknown) => caughtError);

      expect(error).toMatchObject({
        status: 429,
        response: {
          message: "NOTIFICATION_RATE_LIMITED",
          retryAfterMs: 1_250,
        },
      });
      expect(mockNotificationRateLimiter.consume).toHaveBeenCalledWith(userId);
      expect(mockUuid).not.toHaveBeenCalled();
      expect(
        mockGuildsService.getGuildsForRequiredPermissions,
      ).not.toHaveBeenCalled();
      expect(mockReadyRoomService.create).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
      expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
    });

    it("creates no notification side effects when rate limiting is unavailable", async () => {
      mockNotificationRateLimiter.consume.mockRejectedValue(
        new Error("rate limiter unavailable"),
      );

      await expect(
        service.sendNotification(userId, discordId, {
          message: "alarm",
          world: "gordion",
          guildIds: ["guild-1"],
        }),
      ).rejects.toThrow("rate limiter unavailable");

      expect(mockUuid).not.toHaveBeenCalled();
      expect(
        mockGuildsService.getGuildsForRequiredPermissions,
      ).not.toHaveBeenCalled();
      expect(mockReadyRoomService.create).not.toHaveBeenCalled();
      expect(mockRedisService.set).not.toHaveBeenCalled();
      expect(mockAmqpConnection.publish).not.toHaveBeenCalled();
    });

    it("publishes one message event per allowed guild with one notification id", async () => {
      mockGuildsService.getGuildsForRequiredPermissions.mockResolvedValue([
        { id: "guild-1" },
        { id: "guild-2" },
        { id: "guild-3" },
      ]);

      await service.sendNotification(userId, discordId, {
        message: "alarm",
        world: "gordion",
        guildIds: ["guild-1", "guild-2"],
      });

      expect(mockAmqpConnection.publish).toHaveBeenCalledTimes(2);
      expect(mockAmqpConnection.publish).toHaveBeenNthCalledWith(
        1,
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_NOTIFICATIONS_SEND,
        expect.objectContaining({
          guildId: "guild-1",
          notificationId: "mock-uuid",
        }),
      );
      expect(mockAmqpConnection.publish).toHaveBeenNthCalledWith(
        2,
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_NOTIFICATIONS_SEND,
        expect.objectContaining({
          guildId: "guild-2",
          notificationId: "mock-uuid",
        }),
      );
    });
  });
});
