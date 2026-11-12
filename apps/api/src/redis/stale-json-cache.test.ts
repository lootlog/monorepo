import { describe, expect, it } from "bun:test";
import { Effect, Schema } from "effect";
import { TestClock } from "effect/testing";
import type { RedisGetOrSetJsonBestEffortOptions } from "#src/redis/redis.service";
import {
  getOrSetStaleJson,
  type StaleJsonRedis,
} from "#src/redis/stale-json-cache";

const schema = Schema.Struct({ n: Schema.Number });

const fakeRedis = () => {
  const store = new Map<string, string>();
  const leases = new Set<string>();
  let writes = 0;

  const redis: StaleJsonRedis = {
    getOrSetJsonEffect: <T, E>(
      options: Omit<RedisGetOrSetJsonBestEffortOptions<T>, "factory"> & {
        factory: Effect.Effect<T, E>;
      },
    ) =>
      Effect.gen(function* () {
        const cached = store.get(options.key);

        if (cached !== undefined) return options.codec.parse(cached);

        const value = yield* options.factory;
        store.set(options.key, JSON.stringify(value));

        return value;
      }),
    setNX: async (key: string) => {
      if (leases.has(key)) return false;
      leases.add(key);

      return true;
    },
    setJson: async <T>(key: string, value: T) => {
      writes += 1;
      store.set(key, JSON.stringify(value));
    },
  };

  return { redis, writes: () => writes };
};

describe("getOrSetStaleJson", () => {
  it("serves an entry past its fresh age at once and refreshes it once in the background", async () => {
    const { redis, writes } = fakeRedis();
    let computed = 0;

    const read = () =>
      getOrSetStaleJson(redis, {
        key: "k",
        schema,
        freshSeconds: 60,
        retainSeconds: 600,
        factory: Effect.sync(() => ({ n: ++computed })),
        onError: () => {},
      });

    await Effect.runPromise(
      Effect.gen(function* () {
        const first = yield* read();
        expect(first.value).toEqual({ n: 1 });

        yield* TestClock.adjust("30 seconds");
        expect((yield* read()).value).toEqual({ n: 1 });
        expect(computed).toBe(1);

        yield* TestClock.adjust("40 seconds");
        // Two readers find it stale; only one refresh runs.
        const stale = yield* read();
        yield* read();
        expect(stale.value).toEqual({ n: 1 });
        yield* Effect.promise(() => new Promise((done) => setTimeout(done, 5)));
        expect(computed).toBe(2);
        expect(writes()).toBe(1);
        expect((yield* read()).value).toEqual({ n: 2 });
      }).pipe(Effect.provide(TestClock.layer())),
    );
  });
});
