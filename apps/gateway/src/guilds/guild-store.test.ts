import { describe, expect, mock, test } from "bun:test";
import { Effect, Fiber } from "effect";
import type { HttpClient as HttpClientValue } from "effect/unstable/http/HttpClient";
import { makeGuildStore } from "./guild-store.js";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type { RedisGatewayStore } from "#src/platform/redis-store";

const config = { apiUrl: "http://api.local" } as GatewayConfiguration;
const options = { discordId: "discord-1", userId: "user-1" };
const guilds = [
  {
    guild: { id: "organization-1", ownerId: "owner-1" },
    roles: [],
  },
];

const makeRedis = (cached: string | null = null) => {
  const get = mock(async () => cached);
  const set = mock(async () => "OK");
  const del = mock(async () => 1);
  return {
    store: { command: { get, set, del } } as unknown as RedisGatewayStore,
    get,
    set,
    del,
  };
};

const httpResponse = (status: number, value: unknown) => ({
  status,
  arrayBuffer: Effect.succeed(
    new TextEncoder().encode(JSON.stringify(value)).buffer,
  ),
});

describe("Gateway guild store", () => {
  test("serves a fresh Redis projection without outbound HTTP", async () => {
    const redis = makeRedis(JSON.stringify({ guilds, cachedAt: Date.now() }));
    const get = mock(() => Effect.die("HTTP must not run"));
    const store = makeGuildStore(config, redis.store, {
      get,
    } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(get).not.toHaveBeenCalled();
  });

  test("retries retryable GET failures and fills the established cache", async () => {
    const redis = makeRedis();
    let attempt = 0;
    const get = mock(() => {
      attempt += 1;
      return attempt === 1
        ? Effect.fail(new Error("transport"))
        : Effect.succeed(httpResponse(200, guilds));
    });
    const store = makeGuildStore(config, redis.store, {
      get,
    } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(get).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  test("does not retry a completed non-retryable response", async () => {
    const redis = makeRedis();
    const get = mock(() => Effect.succeed(httpResponse(404, {})));
    const store = makeGuildStore(config, redis.store, {
      get,
    } as unknown as HttpClientValue);

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  test("propagates interruption to the permissions request", async () => {
    const redis = makeRedis();
    let interrupted = false;
    const get = mock(() =>
      Effect.never.pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true;
          }),
        ),
      ),
    );
    const store = makeGuildStore(config, redis.store, {
      get,
    } as unknown as HttpClientValue);
    const fiber = Effect.runFork(store.getUserGuilds(options));
    while (get.mock.calls.length === 0) await Promise.resolve();

    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(interrupted).toBe(true);
  });
});
