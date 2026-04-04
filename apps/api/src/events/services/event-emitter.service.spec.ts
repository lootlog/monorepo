import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { EventEmitterService } from "./event-emitter.service";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";

describe("EventEmitterService", () => {
  let service: EventEmitterService;

  const mockAmqpConnection = {
    publish: mockFn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventEmitterService,
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<EventEmitterService>(EventEmitterService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("emitMapStatusUpdate", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const mapId = "map-1";

    it("should publish map status update to RabbitMQ", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitMapStatusUpdate(guildId, eventId, mapId);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_MAP_STATUS_UPDATE,
        {
          guildId,
          eventId,
          mapId,
          reason: undefined,
        },
      );
    });

    it("should publish map status update with reason", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitMapStatusUpdate(guildId, eventId, mapId, "presence");

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_MAP_STATUS_UPDATE,
        {
          guildId,
          eventId,
          mapId,
          reason: "presence",
        },
      );
    });

    it("should handle publish errors gracefully", async () => {
      mockAmqpConnection.publish.mockRejectedValue(
        new Error("Connection lost"),
      );

      // Should not throw
      await expect(
        service.emitMapStatusUpdate(guildId, eventId, mapId),
      ).resolves.not.toThrow();

      expect(mockAmqpConnection.publish).toHaveBeenCalled();
    });
  });

  describe("emitHeroKilled", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const killId = "kill-1";

    it("should publish hero killed event to RabbitMQ", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitHeroKilled(guildId, eventId, killId);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_HERO_KILLED,
        {
          guildId,
          eventId,
          killId,
        },
      );
    });

    it("should handle publish errors gracefully", async () => {
      mockAmqpConnection.publish.mockRejectedValue(
        new Error("Connection lost"),
      );

      await expect(
        service.emitHeroKilled(guildId, eventId, killId),
      ).resolves.not.toThrow();
    });
  });

  describe("emitRespawnWindowOpened", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should publish respawn window opened event", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitRespawnWindowOpened(guildId, eventId, heroId);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
        { guildId, eventId, heroId },
      );
    });

    it("should handle publish errors gracefully", async () => {
      mockAmqpConnection.publish.mockRejectedValue(
        new Error("Connection lost"),
      );

      await expect(
        service.emitRespawnWindowOpened(guildId, eventId, heroId),
      ).resolves.not.toThrow();
    });
  });

  describe("emitRespawnWindowClosed", () => {
    const guildId = "guild-1";
    const eventId = "event-1";
    const heroId = "hero-1";

    it("should publish respawn window closed event", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitRespawnWindowClosed(guildId, eventId, heroId);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
        { guildId, eventId, heroId },
      );
    });

    it("should handle publish errors gracefully", async () => {
      mockAmqpConnection.publish.mockRejectedValue(
        new Error("Connection lost"),
      );

      await expect(
        service.emitRespawnWindowClosed(guildId, eventId, heroId),
      ).resolves.not.toThrow();
    });
  });

  describe("emitTimerUpdate", () => {
    const mockTimer = {
      guildId: "guild-1",
      world: "tempest",
      npcId: 123,
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(),
    };

    it("should publish timer update", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitTimerUpdate(mockTimer);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_TIMERS_UPDATE,
        mockTimer,
      );
    });

    it("should handle publish errors gracefully", async () => {
      mockAmqpConnection.publish.mockRejectedValue(
        new Error("Connection lost"),
      );

      await expect(service.emitTimerUpdate(mockTimer)).resolves.not.toThrow();
    });
  });

  describe("emitRankingUpdate", () => {
    const guildId = "guild-1";
    const eventId = "event-1";

    it("should publish ranking update event", async () => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emitRankingUpdate(guildId, eventId);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.EVENT_RANKING_UPDATE,
        {
          guildId,
          eventId,
        },
      );
    });

    it("should handle publish errors gracefully", async () => {
      mockAmqpConnection.publish.mockRejectedValue(
        new Error("Connection lost"),
      );

      await expect(
        service.emitRankingUpdate(guildId, eventId),
      ).resolves.not.toThrow();
    });
  });
});
