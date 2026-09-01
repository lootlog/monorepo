import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "#src/test/mock-fn";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  EventEmitterService,
  type EventEmitPayloads,
} from "./event-emitter.service.js";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";

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

  const cases: {
    [K in keyof EventEmitPayloads]: [K, EventEmitPayloads[K]];
  }[keyof EventEmitPayloads][] = [
    [
      RoutingKey.EVENT_MAP_STATUS_UPDATE,
      { guildId: "guild-1", eventId: "event-1", mapId: "map-1" },
    ],
    [
      RoutingKey.EVENT_MAP_STATUS_UPDATE,
      {
        guildId: "guild-1",
        eventId: "event-1",
        mapId: "map-1",
        reason: "presence",
      },
    ],
    [
      RoutingKey.EVENT_HERO_KILLED,
      { guildId: "guild-1", eventId: "event-1", killId: "kill-1" },
    ],
    [
      RoutingKey.EVENT_RANKING_UPDATE,
      { guildId: "guild-1", eventId: "event-1" },
    ],
    [
      RoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
      { guildId: "guild-1", eventId: "event-1", heroId: "hero-1" },
    ],
    [
      RoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
      { guildId: "guild-1", eventId: "event-1", heroId: "hero-1" },
    ],
  ];

  it.each(cases)(
    "publishes %s with its payload to the default exchange",
    async (routingKey, payload) => {
      mockAmqpConnection.publish.mockResolvedValue(undefined);

      await service.emit(routingKey, payload);

      expect(mockAmqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        routingKey,
        payload,
      );
    },
  );

  it("swallows and logs a publish error instead of throwing", async () => {
    mockAmqpConnection.publish.mockRejectedValue(new Error("Connection lost"));

    await expect(
      service.emit(RoutingKey.EVENT_HERO_KILLED, {
        guildId: "guild-1",
        eventId: "event-1",
        killId: "kill-1",
      }),
    ).resolves.not.toThrow();

    expect(mockAmqpConnection.publish).toHaveBeenCalled();
  });
});
