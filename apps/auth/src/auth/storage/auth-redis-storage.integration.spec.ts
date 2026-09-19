import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Layer, ManagedRuntime, Redacted } from "effect";
import { Redis } from "effect/unstable/persistence";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import {
  AuthRedisStorage,
  createAuthRedisConnection,
} from "./auth-redis-storage.js";

describe("auth Redis storage", () => {
  let redis: StartedTestContainer;

  beforeAll(async () => {
    redis = await new GenericContainer("redis:7-alpine")
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .start();
  }, 60_000);

  afterAll(async () => {
    await redis?.stop();
  });

  it("persists the first OAuth state before the Redis connection is warm", async () => {
    const runtime = ManagedRuntime.make(
      AuthRedisStorage.layer.pipe(
        Layer.provide(
          createAuthRedisConnection({
            host: redis.getHost(),
            port: redis.getMappedPort(6379),
            username: "",
            password: Redacted.make(""),
          }),
        ),
      ),
    );

    try {
      const { secondaryStorage } = await runtime.runPromise(AuthRedisStorage);
      const key = `verification:${crypto.randomUUID()}`;
      await secondaryStorage.set(key, "oauth-state", 600);
      expect(await secondaryStorage.get(key)).toBe("oauth-state");
      expect(await secondaryStorage.getAndDelete(key)).toBe("oauth-state");
      expect(await secondaryStorage.get(key)).toBeNull();
    } finally {
      await runtime.dispose();
    }
  });

  it("shares an atomic API key budget across auth instances without extending its window", async () => {
    const createRuntime = () =>
      ManagedRuntime.make(
        AuthRedisStorage.layer.pipe(
          Layer.provideMerge(
            createAuthRedisConnection({
              host: redis.getHost(),
              port: redis.getMappedPort(6379),
              username: "",
              password: Redacted.make(""),
            }),
          ),
        ),
      );

    const first = createRuntime();
    const second = createRuntime();

    try {
      const firstStorage = await first.runPromise(AuthRedisStorage);
      const secondStorage = await second.runPromise(AuthRedisStorage);
      const connection = await first.runPromise(Redis.Redis);
      const keyId = crypto.randomUUID();
      const redisKey = `auth:api-key-rate-limit:${keyId}`;

      const decisions = await Promise.all(
        Array.from({ length: 130 }, (_, index) =>
          index % 2 === 0
            ? first.runPromise(firstStorage.consumeApiKeyRateLimit(keyId))
            : second.runPromise(secondStorage.consumeApiKeyRateLimit(keyId)),
        ),
      );

      expect(decisions.filter(Boolean)).toHaveLength(120);
      const otherKeyId = crypto.randomUUID();
      expect(
        await first.runPromise(firstStorage.consumeApiKeyRateLimit(otherKeyId)),
      ).toBe(true);

      const otherRedisKey = `auth:api-key-rate-limit:${otherKeyId}`;
      await first.runPromise(
        connection.send("PEXPIRE", otherRedisKey, "10000"),
      );
      expect(
        await second.runPromise(
          secondStorage.consumeApiKeyRateLimit(otherKeyId),
        ),
      ).toBe(true);
      expect(
        await first.runPromise(connection.send<number>("PTTL", otherRedisKey)),
      ).toBeLessThanOrEqual(10_000);

      const initialTtl = await first.runPromise(
        connection.send<number>("PTTL", redisKey),
      );

      expect(initialTtl).toBeGreaterThan(0);
      expect(initialTtl).toBeLessThanOrEqual(60_000);
      await first.runPromise(connection.send("PEXPIRE", redisKey, "10000"));
      expect(
        await second.runPromise(secondStorage.consumeApiKeyRateLimit(keyId)),
      ).toBe(false);

      const shortenedTtl = await first.runPromise(
        connection.send<number>("PTTL", redisKey),
      );

      expect(shortenedTtl).toBeGreaterThan(0);
      expect(shortenedTtl).toBeLessThanOrEqual(10_000);
      await first.runPromise(connection.send("PEXPIRE", redisKey, "1"));
      await Bun.sleep(10);
      expect(
        await second.runPromise(secondStorage.consumeApiKeyRateLimit(keyId)),
      ).toBe(true);
      expect(
        await first.runPromise(connection.send<string>("GET", redisKey)),
      ).toBe("1");
      await first.runPromise(connection.send("DEL", redisKey));
      await first.runPromise(connection.send("LPUSH", redisKey, "wrong-type"));
      await expect(
        first.runPromise(firstStorage.consumeApiKeyRateLimit(keyId)),
      ).rejects.toThrow();
    } finally {
      await Promise.all([first.dispose(), second.dispose()]);
    }
  });
});
