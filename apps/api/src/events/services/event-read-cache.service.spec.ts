import type { RedisService } from "@lootlog/nest-shared/redis";
import { EventReadCacheService } from "./event-read-cache.service";

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

  it("keeps fresh factory Date instances intact", async () => {
    const freshDate = new Date("2026-06-19T10:00:00.000Z");
    const service = new EventReadCacheService(redis as unknown as RedisService);

    redis.getOrSetJsonBestEffort.mockResolvedValue({
      updatedAt: freshDate,
    });

    const result = await service.getOrSet("event-read:test", () =>
      Promise.resolve({
        updatedAt: freshDate,
      }),
    );

    expect(result.updatedAt).toBe(freshDate);
  });
});
