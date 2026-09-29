import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { makeGuildStoreRedis } from "../../test/guild-store-fixtures.js";
import { describe, expect, mock, test } from "bun:test";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { getUserGuildsCacheKey } from "./cache-keys.js";
import { makeGuildStore } from "./guild-store.js";

const config = { apiUrl: "http://api.local" };

const options = { discordId: "discord-1", userId: "user-1" };

const guilds = [
  {
    guild: { id: "organization-1", ownerId: "owner-1" },
    roles: [],
  },
];

const httpResponse = (
  status: number,
  value: typeof guilds | Record<string, never>,
) => Response.json(value, { status });

describe("Gateway guild store", () => {
  test("serves a fresh Redis projection without outbound HTTP", async () => {
    const redis = makeGuildStoreRedis(
      options,
      JSON.stringify({ guilds, cachedAt: Date.now() }),
    );

    const get = mock(() => Effect.die("HTTP must not run"));

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(get).not.toHaveBeenCalled();
  });

  test("retries retryable GET failures and fills the established cache", async () => {
    const redis = makeGuildStoreRedis(options);
    let attempt = 0;

    const get = mock(() => {
      attempt += 1;

      return attempt === 1
        ? Effect.fail(new Error("transport"))
        : Effect.succeed(httpResponse(200, guilds));
    });

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(get).toHaveBeenCalledTimes(2);
    expect(redis.commits).toHaveLength(1);
    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(get).toHaveBeenCalledTimes(2);
  });

  test("does not retry a completed non-retryable response", async () => {
    const redis = makeGuildStoreRedis(options);
    const get = mock(() => Effect.succeed(httpResponse(404, {})));

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(store.getUserGuilds(options).pipe(Effect.flip)),
    ).resolves.toMatchObject({
      reason: "status",
      status: 404,
      retryable: false,
    });
    expect(get).toHaveBeenCalledTimes(1);
  });

  test.each([null, Date.now() - 901_000])(
    "reports a retryable API outage instead of an empty membership with cache timestamp %s",
    async (cachedAt) => {
      const redis = makeGuildStoreRedis(
        options,
        cachedAt === null ? null : JSON.stringify({ guilds, cachedAt }),
      );

      const get = mock(() => Effect.succeed(httpResponse(503, {})));

      const store = makeGuildStore(
        config,
        redis.store,
        httpClientFromResponses(get),
      );

      await expect(
        Effect.runPromise(store.getUserGuilds(options).pipe(Effect.flip)),
      ).resolves.toMatchObject({
        reason: "status",
        status: 503,
        retryable: true,
      });
      expect(get).toHaveBeenCalledTimes(3);
      expect(redis.commits).toEqual([]);
    },
  );

  test("serves a bounded stale projection during an outage without renewing its age", async () => {
    const stale = JSON.stringify({ guilds, cachedAt: Date.now() - 90_000 });
    const redis = makeGuildStoreRedis(options, stale);

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(() => Effect.succeed(httpResponse(503, {}))),
    );

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(redis.cache()).toBe(stale);
    expect(redis.commits).toEqual([]);
  });

  test("required freshness bypasses fresh cached grants and fails when API is unavailable", async () => {
    const redis = makeGuildStoreRedis(
      options,
      JSON.stringify({ guilds, cachedAt: Date.now() }),
    );

    let available = false;

    const get = mock(() =>
      Effect.succeed(available ? httpResponse(200, []) : httpResponse(503, {})),
    );

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(
        store
          .getUserGuilds(options, { freshness: "required" })
          .pipe(Effect.flip),
      ),
    ).resolves.toMatchObject({ reason: "status", retryable: true });

    available = true;

    await expect(
      Effect.runPromise(
        store.getUserGuilds(options, { freshness: "required" }),
      ),
    ).resolves.toEqual([]);
    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual([]);
    expect(get).toHaveBeenCalledTimes(4);
  });

  test("invalidation blocks cached grants during an API outage", async () => {
    const cachedAt = Date.now();

    const redis = makeGuildStoreRedis(
      options,
      JSON.stringify({ guilds, cachedAt }),
    );

    let available = false;

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(() =>
        Effect.succeed(
          available ? httpResponse(200, []) : httpResponse(503, {}),
        ),
      ),
    );

    await Effect.runPromise(store.invalidate(options));
    await expect(
      Effect.runPromise(store.getUserGuilds(options).pipe(Effect.flip)),
    ).resolves.toMatchObject({ reason: "status", retryable: true });

    available = true;

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual([]);
  });

  test("a failed in-flight request cannot fall back to permissions invalidated by another instance", async () => {
    const redis = makeGuildStoreRedis(options);

    const started = Promise.withResolvers<void>();
    const response = Promise.withResolvers<Response>();

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(() =>
        Effect.promise(() => {
          started.resolve();

          return response.promise;
        }),
      ),
    );

    const pending = Effect.runPromise(
      store.getUserGuilds(options).pipe(Effect.flip),
    );

    await started.promise;
    // Another gateway fills the projection, then a revocation invalidates it.
    await redis.store.command.set(
      getUserGuildsCacheKey(options.discordId, options.userId),
      JSON.stringify({ guilds, cachedAt: Date.now() }),
    );
    await Effect.runPromise(store.invalidate(options));
    response.resolve(httpResponse(404, {}));

    await expect(pending).resolves.toMatchObject({
      reason: "status",
      status: 404,
    });
  });

  test.each(["read", "commit", "invalidate"])(
    "reports Redis %s failure as retryable without accepting unchecked permissions",
    async (operation) => {
      const redis = makeGuildStoreRedis(options);

      const unavailable = () => Promise.reject(new Error("Redis unavailable"));

      if (operation === "read") redis.get.mockImplementation(unavailable);
      else if (operation === "commit")
        redis.evaluate.mockImplementation(unavailable);
      else redis.set.mockImplementation(unavailable);

      const store = makeGuildStore(
        config,
        redis.store,
        httpClientFromResponses(() =>
          Effect.succeed(httpResponse(200, guilds)),
        ),
      );

      const effect =
        operation === "invalidate"
          ? store.invalidate(options)
          : store.getUserGuilds(options);

      await expect(
        Effect.runPromise(effect.pipe(Effect.flip)),
      ).resolves.toMatchObject({
        reason: "cache",
        retryable: true,
      });
      expect(redis.commits).toEqual([]);
    },
  );

  test.each(["read", "commit", "invalidate"])(
    "bounds a stalled Redis %s and preserves the last projection for recovery",
    async (operation) => {
      const cached = JSON.stringify({ guilds, cachedAt: 0 });
      const redis = makeGuildStoreRedis(options, cached);

      if (operation === "read")
        redis.get.mockImplementation(() => new Promise(() => {}));
      else if (operation === "commit")
        redis.evaluate.mockImplementation(() => new Promise(() => {}));
      else redis.set.mockImplementation(() => new Promise(() => {}));

      const store = makeGuildStore(
        config,
        redis.store,
        httpClientFromResponses(() => Effect.succeed(httpResponse(200, []))),
      );

      const effect =
        operation === "invalidate"
          ? store.invalidate(options)
          : store.getUserGuilds(options, { freshness: "required" });

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const pending = yield* effect.pipe(Effect.flip, Effect.forkChild);
          yield* TestClock.adjust("11 seconds");

          return yield* Fiber.join(pending);
        }).pipe(Effect.provide(TestClock.layer())),
      );

      expect(result).toMatchObject({ reason: "cache", retryable: true });
      expect(redis.cache()).toBe(cached);
    },
  );

  test("concurrent joins of one user share a single permissions request", async () => {
    const redis = makeGuildStoreRedis(options);
    const response = Promise.withResolvers<Response>();
    const get = mock(() => Effect.promise(() => response.promise));

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(get),
    );

    const joins = Promise.all(
      Array.from({ length: 5 }, () =>
        Effect.runPromise(store.getUserGuilds(options)),
      ),
    );

    while (get.mock.calls.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 1));
    response.resolve(httpResponse(200, guilds));

    await expect(joins).resolves.toEqual(Array(5).fill(guilds));
    expect(get).toHaveBeenCalledTimes(1);
    expect(redis.commits).toHaveLength(1);
  });

  test("a join that observed an invalidation does not wait for an older request", async () => {
    const redis = makeGuildStoreRedis(options);
    const obsolete = Promise.withResolvers<Response>();
    let calls = 0;

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(() => {
        calls += 1;

        return calls === 1
          ? Effect.promise(() => obsolete.promise)
          : Effect.succeed(httpResponse(200, []));
      }),
    );

    const first = Effect.runPromise(store.getUserGuilds(options));

    while (calls === 0) await new Promise((resolve) => setTimeout(resolve, 1));
    await Effect.runPromise(store.invalidate(options));

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual([]);

    // The fenced response is discarded; the first join gets current access.
    obsolete.resolve(httpResponse(200, guilds));
    await expect(first).resolves.toEqual([]);
    expect(calls).toBe(2);
  });

  test("serves an aged projection immediately and refreshes it for the next join", async () => {
    const redis = makeGuildStoreRedis(
      options,
      JSON.stringify({ guilds, cachedAt: Date.now() - 90_000 }),
    );

    const response = Promise.withResolvers<Response>();
    const get = mock(() => Effect.promise(() => response.promise));

    const store = makeGuildStore(
      config,
      redis.store,
      httpClientFromResponses(get),
    );

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);

    response.resolve(httpResponse(200, []));

    while (redis.commits.length === 0)
      await new Promise((resolve) => setTimeout(resolve, 1));

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });
});
