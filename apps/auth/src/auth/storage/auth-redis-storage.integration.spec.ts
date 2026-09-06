import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Layer, ManagedRuntime, Redacted } from "effect";
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
});
