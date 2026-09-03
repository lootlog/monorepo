import { vi } from "#test/bun-test";
import { Effect, Schema } from "effect";
import type { JsonCodec, RedisService } from "#src/redis/redis.service";
import { EventKillHistoryResponse } from "#src/events/kills/event-kill-response.schema";
import { makeEventReadCache } from "#src/events/catalog/event-read-cache.service";

describe("EventReadCache", () => {
  const NestedDates = Schema.Struct({
    createdAt: Schema.Date,
    label: Schema.String,
    nested: Schema.Struct({ minSpawnTime: Schema.Date }),
    entries: Schema.Array(Schema.Struct({ startedAt: Schema.Date })),
  });
  let stored: string | null = null;
  const redis = {
    getJson: vi.fn(async (_key: string, codec: JsonCodec<unknown>) =>
      stored === null ? null : codec.parse(stored),
    ),
    setJson: vi.fn(
      async (
        _key: string,
        value: unknown,
        _ttl: number,
        codec: JsonCodec<unknown>,
      ) => {
        stored = codec.stringify(value);
      },
    ),
    deleteByPattern: vi.fn<(...args: unknown[]) => Promise<number>>(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    stored = null;
  });

  it("round-trips nested and array Date values through the cache codec", async () => {
    const service = makeEventReadCache(redis as unknown as RedisService);

    const value = {
      createdAt: new Date("2026-06-19T10:00:00.000Z"),
      label: "2026-06-19T12:00:00.000Z",
      nested: { minSpawnTime: new Date("2026-06-19T11:00:00.000Z") },
      entries: [{ startedAt: new Date("2026-06-19T13:00:00.000Z") }],
    };
    await Effect.runPromise(
      service.getOrSet("event-read:test", NestedDates, () =>
        Effect.succeed(value),
      ),
    );
    const result = await Effect.runPromise(
      service.getOrSet("event-read:test", NestedDates, () =>
        Effect.die("cache miss"),
      ),
    );

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.nested.minSpawnTime).toBeInstanceOf(Date);
    expect(result.entries[0]?.startedAt).toBeInstanceOf(Date);
    // A plain ISO string stays a string; only real Date instances survive as Date.
    expect(result.label).toBe("2026-06-19T12:00:00.000Z");
  });

  it("feeds revived Date values into response DTO encoding", async () => {
    const service = makeEventReadCache(redis as unknown as RedisService);

    const value = {
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
    await Effect.runPromise(
      service.getOrSet("event-read:test", EventKillHistoryResponse, () =>
        Effect.succeed(value),
      ),
    );
    const result = await Effect.runPromise(
      service.getOrSet("event-read:test", EventKillHistoryResponse, () =>
        Effect.die("cache miss"),
      ),
    );

    const encoded = Schema.encodeSync(EventKillHistoryResponse)(result);

    expect(encoded.data[0]?.minSpawnTimeAtKill).toBe(
      "2026-06-19T09:00:00.000Z",
    );
    expect(encoded.data[0]?.maxSpawnTimeAtKill).toBe(
      "2026-06-19T12:00:00.000Z",
    );
  });
});
