import { userCharacters } from "#src/database/schema";
import { makeBattleAnalyticsRead } from "../analytics/battle-analytics-read.service.js";
import { makeBattleCombatProfileRead } from "../analytics/battle-combat-profile-read.service.js";
import { expect, it } from "bun:test";
import { CacheFillTimeoutError } from "@lootlog/database/redis-cache-fill";
import { Cause, Effect, Exit } from "effect";
import { drizzleDatabaseEffect } from "#src/database/database";
import { makeBattleReadBudget } from "#src/database/battle-read-budget";
import { makeBattleAnalyticsQuery } from "#src/battles/analytics/battle-analytics-query.service";
import { makeBattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import {
  data,
  integration,
  useBattleRedisIntegration,
} from "./battle-creation-redis.integration.fixtures.js";

useBattleRedisIntegration();

it("invalidates only the user's cache generation and cannot restore a stale in-flight result", async () => {
  const decode = (text: string) => Number(text);

  const cached = (user: string, value: number) =>
    integration.services.cache.getOrSetJson(
      user,
      "summary",
      () => Effect.succeed(value),
      decode,
    );

  expect(await integration.runtime.runPromise(cached("one", 1))).toBe(1);
  expect(await integration.runtime.runPromise(cached("two", 2))).toBe(2);
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: result, resolve: finish } = Promise.withResolvers<number>();

  const oldRead = integration.runtime.runPromise(
    integration.services.cache.getOrSetJson(
      "one",
      "slow",
      () =>
        Effect.tryPromise(async () => {
          begin();

          return await result;
        }),
      decode,
    ),
  );

  await started;

  const before = await integration.runtime.runPromise(
    integration.services.redisApi.send<string>("INFO", "commandstats"),
  );

  await integration.runtime.runPromise(
    integration.services.cache.invalidateUserAnalytics("one"),
  );

  const after = await integration.runtime.runPromise(
    integration.services.redisApi.send<string>("INFO", "commandstats"),
  );

  expect(after.match(/cmdstat_scan:[^\r\n]*/)?.[0]).toBe(
    before.match(/cmdstat_scan:[^\r\n]*/)?.[0],
  );
  expect(await integration.runtime.runPromise(cached("one", 3))).toBe(3);
  expect(await integration.runtime.runPromise(cached("two", 4))).toBe(2);
  await integration.runtime.runPromise(
    integration.services.redis.del("battle-cache-generation:two"),
  );
  expect(await integration.runtime.runPromise(cached("two", 6))).toBe(6);
  expect(
    await integration.runtime.runPromise(
      integration.services.cache.getOrSetJson(
        "one",
        "slow",
        () => Effect.succeed(5),
        decode,
      ),
    ),
  ).toBe(5);
  finish(1);
  expect(await oldRead).toBe(1);
  expect(
    await integration.runtime.runPromise(
      integration.services.cache.getOrSetJson(
        "one",
        "slow",
        () => Effect.succeed(9),
        decode,
      ),
    ),
  ).toBe(5);
});

it("reloads corrupted metadata cache and shares invalidation with analytics", async () => {
  await integration.runtime.runPromise(
    integration.services.redis.set(
      "battle-cache-generation:owner",
      "test-generation",
    ),
  );

  const key =
    "battle-cache:v4:owner:test-generation:battle-characters:list:owner";

  await integration.runtime.runPromise(
    integration.services.redis.set(key, "{broken-json", 300),
  );
  expect(
    await integration.runtime.runPromise(
      integration.services.metadata.getUserCharacters("owner"),
    ),
  ).toEqual({ characters: [] });
  await integration.pool.query(
    `INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('new-uc','owner','hero','Hero','world')`,
  );
  await integration.runtime.runPromise(
    integration.services.cache.invalidateUserAnalytics("owner"),
  );
  expect(
    await integration.runtime.runPromise(
      integration.services.metadata.getUserCharacters("owner"),
    ),
  ).toEqual({
    characters: [
      {
        id: "hero",
        name: "Hero",
        world: "world",
        icon: "",
        lvl: null,
        prof: null,
      },
    ],
  });
});

it("coalesces concurrent analytics fills and retries factory failures without caching them", async () => {
  let calls = 0;
  const cache = integration.services.cache;

  const read = () =>
    cache.getOrSetJson(
      "burst",
      "summary",
      () =>
        Effect.gen(function* () {
          calls++;
          yield* Effect.sleep("80 millis");

          return 42;
        }),
      Number,
    );

  const results = await Promise.all(
    Array.from({ length: 8 }, () => integration.runtime.runPromise(read())),
  );

  expect(results).toEqual(Array(8).fill(42));
  expect(calls).toBe(1);
  const failure = { reason: "database failed" };
  let failures = 0;
  expect(
    await integration.runtime.runPromise(
      cache
        .getOrSetJson(
          "burst",
          "failure",
          () =>
            Effect.suspend(() => {
              failures++;

              return Effect.fail(failure);
            }),
          Number,
        )
        .pipe(Effect.flip),
    ),
  ).toBe(failure);
  expect(failures).toBe(1);
  expect(
    await integration.runtime.runPromise(
      cache.getOrSetJson("burst", "failure", () => Effect.succeed(7), Number),
    ),
  ).toBe(7);
});

it("does not retry a loader that fails without an error value", async () => {
  let calls = 0;

  const exit = await Effect.runPromiseExit(
    integration.services.redis.getOrSetJson({
      key: "undefined-failure",
      ttlSeconds: 30,
      codec: { stringify: JSON.stringify, parse: Number },
      factory: Effect.suspend(() => {
        calls++;

        return Effect.fail(undefined);
      }),
    }),
  );

  expect(exit).toEqual(Exit.fail(undefined));
  expect(calls).toBe(1);
});

it("times out best-effort cache waiters without duplicating the active fill", async () => {
  const key = "slow-cache-fill";
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: result, resolve: finish } = Promise.withResolvers<number>();
  let calls = 0;

  const options = {
    key,
    ttlSeconds: 30,
    codec: { stringify: JSON.stringify, parse: Number },
    waitTimeoutMs: 60,
    waitIntervalMs: 10,
    factory: Effect.promise(() => {
      calls++;
      begin();

      return result;
    }),
  };

  const owner = Effect.runPromise(
    integration.services.redis.getOrSetJson(options),
  );

  try {
    await started;

    const waiters = await Promise.all(
      Array.from({ length: 8 }, () =>
        Effect.runPromiseExit(integration.services.redis.getOrSetJson(options)),
      ),
    );

    for (const waiter of waiters) {
      expect(
        Exit.isFailure(waiter) && Cause.squash(waiter.cause),
      ).toBeInstanceOf(CacheFillTimeoutError);
    }

    expect(calls).toBe(1);
  } finally {
    finish(42);
    await owner;
  }

  expect(
    await integration.runtime.runPromise(integration.services.redis.get(key)),
  ).toBe("42");
});

it("prevents an expired cache owner from replacing its successor's cached result", async () => {
  const key = "expired-cache-fill";
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: result, resolve: finish } = Promise.withResolvers<number>();

  const options = {
    key,
    ttlSeconds: 30,
    lockTtlSeconds: 1,
    codec: { stringify: JSON.stringify, parse: Number },
  };

  const owner = Effect.runPromise(
    integration.services.redis.getOrSetJson({
      ...options,
      factory: Effect.promise(() => {
        begin();

        return result;
      }),
    }),
  );

  try {
    await started;
    await Bun.sleep(1_100);
    expect(
      await Effect.runPromise(
        integration.services.redis.getOrSetJson({
          ...options,
          factory: Effect.succeed(99),
        }),
      ),
    ).toBe(99);
  } finally {
    finish(42);
    expect(await owner).toBe(42);
  }

  expect(
    await integration.runtime.runPromise(integration.services.redis.get(key)),
  ).toBe("99");
});

it("cancels a waiting best-effort reader without running its factory after lock release", async () => {
  const key = "cancelled-cache-waiter";
  const controller = new AbortController();
  await integration.runtime.runPromise(
    integration.services.redis.setNX(`${key}:single-flight`, "owner", 10),
  );
  let calls = 0;

  const reading = Effect.runPromiseExit(
    integration.services.redis.getOrSetJson({
      key,
      ttlSeconds: 30,
      waitTimeoutMs: 500,
      waitIntervalMs: 10,
      codec: { stringify: JSON.stringify, parse: Number },
      factory: Effect.sync(() => {
        calls++;

        return 42;
      }),
    }),
    { signal: controller.signal },
  );

  await Bun.sleep(30);
  controller.abort();
  expect(Exit.hasInterrupts(await reading)).toBe(true);
  await integration.runtime.runPromise(
    integration.services.redis.del(`${key}:single-flight`),
  );
  await Bun.sleep(30);
  expect(calls).toBe(0);
  expect(
    await integration.runtime.runPromise(integration.services.redis.get(key)),
  ).toBeNull();
});

it("interrupts a coalesced analytics factory and permits a subsequent fill", async () => {
  const controller = new AbortController();
  const { promise: started, resolve: begin } = Promise.withResolvers<void>();
  const { promise: canceled, resolve: cancel } = Promise.withResolvers<void>();

  const reading = Effect.runPromiseExit(
    integration.services.cache.getOrSetJson(
      "abort",
      "summary",
      () =>
        Effect.sync(begin).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Effect.sync(cancel)),
        ),
      Number,
    ),
    { signal: controller.signal },
  );

  await started;
  controller.abort();
  expect(Exit.hasInterrupts(await reading)).toBe(true);
  await canceled;

  const generation = await integration.runtime.runPromise(
    integration.services.redis.get("battle-cache-generation:abort"),
  );

  const key = `battle-cache:v4:abort:${generation}:summary`;
  expect(
    await integration.runtime.runPromise(integration.services.redis.get(key)),
  ).toBeNull();
  expect(
    await integration.runtime.runPromise(
      integration.services.cache.getOrSetJson(
        "abort",
        "summary",
        () => Effect.succeed(9),
        Number,
      ),
    ),
  ).toBe(9);
  expect(
    await integration.runtime.runPromise(
      integration.services.redis.get(`${key}:single-flight`),
    ),
  ).toBeNull();
  expect(
    await integration.runtime.runPromise(integration.services.redis.get(key)),
  ).toBe("9");
});

it("does not cache an older snapshot's character list under a newly invalidated generation", async () => {
  const database = await integration.runtime.runPromise(drizzleDatabaseEffect);
  const queryModule = makeBattleAnalyticsQuery(database);
  const budget = makeBattleReadBudget(database);
  const started = Promise.withResolvers<void>();
  const resume = Promise.withResolvers<void>();
  let pause = true;

  const read: typeof budget = (operation) =>
    budget(
      Effect.gen(function* () {
        if (pause) {
          pause = false;
          yield* database
            .select({ id: userCharacters.id })
            .from(userCharacters);
          started.resolve();
          yield* Effect.promise(() => resume.promise);
        }

        return yield* operation;
      }),
      { consistentSnapshot: true },
    );

  const analytics = makeBattleAnalytics(
    makeBattleAnalyticsRead(database, queryModule),
    makeBattleCombatProfileRead(database, queryModule),
    integration.services.cache,
    queryModule,
    read,
  );

  const owner = "snapshot-owner";

  const oldRead = integration.runtime.runPromise(
    analytics.getBattleAnalytics({}, owner),
  );

  try {
    await started.promise;
    await integration.runtime.runPromise(
      integration.services.battles.createBattle({ data, userId: owner }),
    );
    resume.resolve();
    expect((await oldRead).totalBattles).toBe(0);
    expect(
      (
        await integration.runtime.runPromise(
          analytics.getBattleAnalytics({}, owner),
        )
      ).totalBattles,
    ).toBe(1);
  } finally {
    resume.resolve();
    await oldRead;
  }
}, 10_000);
