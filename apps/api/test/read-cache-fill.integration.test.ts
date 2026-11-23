import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { makeReadCacheFixture } from "./read-cache-fixtures.js";
import { Redis } from "effect/persistence";
import { makeRedisService, type RedisService } from "#src/redis/redis.service";

const fixture = makeReadCacheFixture();

const { runtime, codec, prefix, fromPromise, pexpire } = fixture;

let cache: RedisService;

describe("Read cache Dragonfly single-flight fills", () => {
  beforeAll(async () => {
    cache = await fixture.connect();
  });

  afterAll(fixture.close);

  it("gives every report after the first the value the first one claimed", async () => {
    const key = `boss-kill-${crypto.randomUUID()}`;

    const claims = await Promise.all(
      ["a", "b", "c"].map((value) =>
        Effect.runPromise(cache.setNxGet(key, value, 30)),
      ),
    );

    const first = ["a", "b", "c"][claims.indexOf(null)];

    expect(claims.filter((held) => held === null)).toHaveLength(1);
    expect(claims.filter((held) => held !== null)).toEqual([first!, first!]);
    expect(await Effect.runPromise(cache.setNxGet(key, "d", 30))).toBe(first!);
  });

  it("shares a fill slower than the former two-second deadline across service instances", async () => {
    const second = makeRedisService(await runtime.runPromise(Redis.Redis), {
      prefix,
    });

    const started = Promise.withResolvers<void>();
    let executions = 0;

    const options = {
      key: "slow-fill",
      ttlSeconds: 30,
      codec,
      factory: fromPromise(async () => {
        executions++;
        started.resolve();
        await Bun.sleep(2_150);

        return { value: 1 };
      }),
    };

    const owner = Effect.runPromise(cache.getOrSetJson(options));
    await started.promise;

    const waiters = Array.from({ length: 8 }, () =>
      Effect.runPromise(second.getOrSetJson(options)),
    );

    const values = await Promise.all([owner, ...waiters]);
    expect(executions).toBe(1);

    for (const value of values) expect(value).toEqual({ value: 1 });
  }, 10_000);

  it("fails busy best-effort reads without running SQL and leaves the owner intact", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const owner = Effect.runPromise(
      cache.getOrSetJson({
        key: "busy-fill",
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;
    let executions = 0;

    try {
      const waiters = Array.from({ length: 8 }, () =>
        Effect.runPromise(
          cache.getOrSetJson({
            key: "busy-fill",
            codec,
            ttlSeconds: 30,
            waitTimeoutMs: 20,
            waitIntervalMs: 1,
            factory: fromPromise(async () => {
              executions++;

              return { value: 2 };
            }),
          }),
        ),
      );

      const results = await Promise.allSettled(waiters);
      expect(
        results.every(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof Error &&
            result.reason.message === "Cache fill wait timed out",
        ),
      ).toBe(true);
      expect(executions).toBe(0);
      expect(
        await Effect.runPromise(cache.get("busy-fill:single-flight")),
      ).not.toBeNull();
    } finally {
      finish.resolve();
      await owner;
    }

    expect(await Effect.runPromise(cache.getJson("busy-fill", codec))).toEqual({
      value: 1,
    });
  });

  it("allows a waiting reader to recover after the owner fails", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const owner = Effect.runPromise(
      cache.getOrSetJson({
        key: "failed-fill",
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;
          throw new Error("loader failed");
        }),
      }),
    );

    const ownerResult = Promise.allSettled([owner]);
    await started.promise;

    const waiter = Effect.runPromise(
      cache.getOrSetJson({
        key: "failed-fill",
        codec,
        ttlSeconds: 30,
        waitIntervalMs: 1,
        factory: fromPromise(async () => ({ value: 2 })),
      }),
    );

    finish.resolve();
    expect((await ownerResult)[0]?.status).toBe("rejected");
    expect(await waiter).toEqual({ value: 2 });
    expect(
      await Effect.runPromise(cache.getJson("failed-fill", codec)),
    ).toEqual({ value: 2 });
  });

  it("does not let an expired owner overwrite or unlock its successor", async () => {
    const started = Promise.withResolvers<void>();
    const finish = Promise.withResolvers<void>();

    const owner = Effect.runPromise(
      cache.getOrSetJson({
        key: "expired-fill",
        codec,
        ttlSeconds: 30,
        factory: fromPromise(async () => {
          started.resolve();
          await finish.promise;

          return { value: 1 };
        }),
      }),
    );

    await started.promise;

    try {
      await pexpire("expired-fill:single-flight", 0);
      await Effect.runPromise(
        cache.setNX("expired-fill:single-flight", "successor", 10),
      );
      await Effect.runPromise(cache.setJson("expired-fill", { value: 2 }));
    } finally {
      finish.resolve();
    }

    expect(await owner).toEqual({ value: 1 });
    expect(
      await Effect.runPromise(cache.getJson("expired-fill", codec)),
    ).toEqual({ value: 2 });
    expect(
      await Effect.runPromise(cache.get("expired-fill:single-flight")),
    ).toBe("successor");
  });

  it("cancels a waiting Effect read without invoking its factory after owner failure", async () => {
    await Effect.runPromise(
      cache.setNX("cancelled-fill:single-flight", "owner", 10),
    );
    const controller = new AbortController();
    let executions = 0;

    const result = Effect.runPromiseExit(
      cache.getOrSetJson({
        key: "cancelled-fill",
        codec,
        ttlSeconds: 30,
        waitIntervalMs: 1,
        factory: Effect.sync(() => {
          executions++;

          return { value: 2 };
        }),
      }),
      { signal: controller.signal },
    );

    await Bun.sleep(10);
    controller.abort();
    await result;
    await Effect.runPromise(cache.del("cancelled-fill:single-flight"));
    await Bun.sleep(20);
    expect(executions).toBe(0);
    expect(await Effect.runPromise(cache.get("cancelled-fill"))).toBeNull();
  });

  it("preserves typed factory errors across the Promise cache boundary", async () => {
    const failure = await Effect.runPromise(
      cache
        .getOrSetJson({
          key: "event-read:v2:errors:event:details:e30",
          scopes: ["event-read:v2:errors", "event-read:v2:errors:event"],
          codec,
          ttlSeconds: 10,
          factory: Effect.fail("query failed"),
        })
        .pipe(Effect.flip),
    );

    expect(failure).toBe("query failed");
  });
});
