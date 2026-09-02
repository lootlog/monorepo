import type { JsonCodec, RedisService } from "#src/redis/redis.service";
import { EventKillHistoryResponseDto } from "../dto/event-kill-response.dto.js";
import { EventReadCacheService } from "./event-read-cache.service.js";

type RedisGetOrSetArgs = {
  key: string;
  factory: () => Promise<unknown>;
  codec: JsonCodec;
};

describe("EventReadCacheService", () => {
  const redis = {
    getOrSetJsonBestEffort: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    deleteByPattern: vi.fn<(...args: unknown[]) => Promise<number>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate a cache hit: the stored value goes through the caller's codec
    // exactly as it would in Redis, so the test exercises the real round-trip.
    redis.getOrSetJsonBestEffort.mockImplementation(
      async (...args: unknown[]) => {
        const { factory, codec } = args[0] as RedisGetOrSetArgs;
        return codec.parse(codec.stringify(await factory()));
      },
    );
  });

  it("round-trips nested and array Date values through the cache codec", async () => {
    const service = new EventReadCacheService(redis as unknown as RedisService);

    const result = await service.getOrSet("event-read:test", () =>
      Promise.resolve({
        createdAt: new Date("2026-06-19T10:00:00.000Z"),
        label: "2026-06-19T12:00:00.000Z",
        nested: { minSpawnTime: new Date("2026-06-19T11:00:00.000Z") },
        entries: [{ startedAt: new Date("2026-06-19T13:00:00.000Z") }],
      }),
    );

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.nested.minSpawnTime).toBeInstanceOf(Date);
    expect(result.entries[0]?.startedAt).toBeInstanceOf(Date);
    // A plain ISO string stays a string; only real Date instances survive as Date.
    expect(result.label).toBe("2026-06-19T12:00:00.000Z");
  });

  it("feeds revived Date values into response DTO encoding", async () => {
    const service = new EventReadCacheService(redis as unknown as RedisService);

    const result = await service.getOrSet("event-read:test", () =>
      Promise.resolve({
        data: [
          {
            id: "kill-1",
            heroNpcId: "hero-1",
            killedAt: new Date("2026-06-19T11:00:00.000Z"),
            minSpawnTimeAtKill: new Date("2026-06-19T09:00:00.000Z"),
            maxSpawnTimeAtKill: new Date("2026-06-19T12:00:00.000Z"),
            isManualClose: false,
            heroNpc: {
              id: "hero-1",
              npcId: 1,
              npcName: "Hero",
              npcIcon: null,
              npcLvl: 300,
            },
            points: [],
          },
        ],
        nextCursor: null,
      }),
    );

    const encoded = EventKillHistoryResponseDto.schema.encode(result);

    expect(encoded.data[0]?.minSpawnTimeAtKill).toBe(
      "2026-06-19T09:00:00.000Z",
    );
    expect(encoded.data[0]?.maxSpawnTimeAtKill).toBe(
      "2026-06-19T12:00:00.000Z",
    );
  });
});
