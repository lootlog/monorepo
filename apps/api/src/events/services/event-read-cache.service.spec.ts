import type { RedisService } from "@lootlog/nest-shared/redis";
import { dateToTemporal } from "#src/db/temporal";
import { EventKillHistoryResponseDto } from "../dto/event-kill-response.dto.js";
import { EventReadCacheService } from "./event-read-cache.service.js";

type CachedPayload = {
  createdAt: Date | string;
  nested: {
    minSpawnTime: Date | string;
    label: string;
  };
  entries: Array<{ startedAt: Date | string }>;
};

describe("EventReadCacheService", () => {
  const redis = {
    getOrSetJsonBestEffort: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
    deleteByPattern: vi.fn<(...args: unknown[]) => Promise<number>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revives cached date fields returned from JSON storage", async () => {
    const createdAt = "2026-06-19T10:00:00.000Z";
    const minSpawnTime = "2026-06-19T11:00:00.000Z";
    const arbitraryIsoString = "2026-06-19T12:00:00.000Z";
    const service = new EventReadCacheService(redis as unknown as RedisService);

    redis.getOrSetJsonBestEffort.mockResolvedValue({
      createdAt,
      nested: {
        minSpawnTime,
        label: arbitraryIsoString,
      },
      entries: [{ startedAt: "2026-06-19T13:00:00.000Z" }],
    });

    const result = await service.getOrSet<CachedPayload>(
      "event-read:test",
      () =>
        Promise.resolve({
          createdAt: new Date(),
          nested: {
            minSpawnTime: new Date(),
            label: arbitraryIsoString,
          },
          entries: [{ startedAt: new Date() }],
        }),
    );

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.nested.minSpawnTime).toBeInstanceOf(Date);
    expect(result.entries[0]?.startedAt).toBeInstanceOf(Date);
    expect(result.nested.label).toBe(arbitraryIsoString);
  });

  it("serializes database temporal values before writing JSON cache", async () => {
    const createdAt = dateToTemporal(new Date("2026-06-19T10:00:00.000Z"));
    const service = new EventReadCacheService(redis as unknown as RedisService);

    redis.getOrSetJsonBestEffort.mockImplementation(async (options) => {
      const { factory } = options as { factory: () => Promise<unknown> };
      return JSON.parse(JSON.stringify(await factory()));
    });

    const result = await service.getOrSet("event-read:test", () =>
      Promise.resolve({
        createdAt,
      }),
    );

    expect(result.createdAt).toEqual(new Date("2026-06-19T10:00:00.000Z"));
  });

  it("revives cached event kill spawn dates before response encoding", async () => {
    const service = new EventReadCacheService(redis as unknown as RedisService);
    const freshKillHistory = {
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
    };
    const cachedKillHistory = JSON.parse(JSON.stringify(freshKillHistory));

    redis.getOrSetJsonBestEffort.mockResolvedValue(cachedKillHistory);

    const result = await service.getOrSet("event-read:test", () =>
      Promise.resolve(freshKillHistory),
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
