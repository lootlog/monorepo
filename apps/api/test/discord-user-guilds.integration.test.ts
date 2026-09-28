import { afterAll, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { DiscordAPIError, type REST, type ResponseLike } from "@discordjs/rest";
import { Effect, ManagedRuntime, Schema } from "effect";
import { Redis } from "effect/unstable/persistence";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { getCompleteUserGuildsCacheKey } from "#src/discord/discord-cache.util";
import { DiscordRateLimiterService } from "#src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "#src/discord/discord-rest-client.factory";
import { DiscordSyncDiagnosticsService } from "#src/discord/discord-sync-diagnostics.service";
import { DiscordUserGuildsClient } from "#src/discord/discord-user-guilds.client";
import { RedisService } from "#src/redis/redis.service";
import { RedlockService } from "#src/redis/redlock";
import { applicationLogger } from "#src/shared/application-logger";

const decodeCachedList = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      guilds: Schema.Array(Schema.Struct({ id: Schema.String })),
    }),
  ),
);

// Bun's Response body stream is typed apart from the one REST declares.
const discordResponse = (
  guilds: ReadonlyArray<{ readonly id: string }>,
): ResponseLike => {
  const response = Response.json(guilds);

  return {
    arrayBuffer: () => response.arrayBuffer(),
    body: null,
    bodyUsed: false,
    headers: response.headers,
    json: () => response.json(),
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: () => response.text(),
  };
};

describe("Discord user guild list cache against Dragonfly", () => {
  let redisRuntime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  let redis: RedisService;

  beforeAll(async () => {
    const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "");
    const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
    redisRuntime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${username}:${password}@${process.env.REDIS_HOST ?? "127.0.0.1"}:${Number(process.env.REDIS_PORT ?? 6379)}`,
      }),
    );
    redis = new RedisService(
      await redisRuntime.runPromise(Redis.Redis),
      {},
      (effect) => redisRuntime.runPromise(effect),
    );
  });

  afterAll(() => redisRuntime.dispose());

  // Everything but Discord's HTTP answer is the production wiring.
  const setUp = async (discord: REST["queueRequest"]) => {
    const identity = { userId: crypto.randomUUID(), discordId: "discord-1" };
    const cacheKey = getCompleteUserGuildsCacheKey(identity);

    const factory = new DiscordRestClientFactory({
      getIdpToken: () =>
        Effect.succeed({
          accessToken: "token",
          expiresIn: 3_600,
          scopes: [...DISCORD_AUTH_SCOPES],
        }),
    });

    const rest = await factory.getRestClient(
      identity.userId,
      identity.discordId,
    );

    spyOn(rest, "queueRequest").mockImplementation(discord);

    const client = new DiscordUserGuildsClient(
      applicationLogger,
      redis,
      new DiscordRateLimiterService(applicationLogger, redis),
      new RedlockService(redis),
      new DiscordSyncDiagnosticsService(applicationLogger, redis),
      factory,
      RuntimeEnvironment.PROD,
    );

    client.initialize();

    await redis.set(
      cacheKey,
      JSON.stringify({
        guilds: [{ id: "left-guild" }],
        fetchedAt: Date.now() - 20 * 60_000,
      }),
      24 * 60 * 60,
    );

    const cachedIds = async () => {
      const cached = await redis.get(cacheKey);

      return cached === null
        ? null
        : decodeCachedList(cached).guilds.map(({ id }) => id);
    };

    const waitFor = async (expected: string[] | null) => {
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (Bun.deepEquals(await cachedIds(), expected)) return;
        await Bun.sleep(20);
      }

      expect(await cachedIds()).toEqual(expected);
    };

    return { client, identity, waitFor };
  };

  it("returns a list past its max age without waiting for Discord, as not fresh, and replaces it in the background", async () => {
    const discord = Promise.withResolvers<ResponseLike>();
    const { client, identity, waitFor } = await setUp(() => discord.promise);

    const result = await client.getCachedCompleteUserGuilds(
      identity.userId,
      identity.discordId,
    );

    // Discord has not answered yet. A fresh flag here would let the caller
    // deactivate memberships from a list that may predate a join.
    expect(result.guilds.map(({ id }) => id)).toEqual(["left-guild"]);
    expect(result.fresh).toBe(false);

    discord.resolve(discordResponse([{ id: "current-guild" }]));
    await waitFor(["current-guild"]);
  });

  it("drops the old list when Discord rejects the user's authorization in the background", async () => {
    const { client, identity, waitFor } = await setUp(() =>
      Promise.reject(
        new DiscordAPIError(
          { code: 0, message: "401: Unauthorized" },
          0,
          401,
          "GET",
          "/users/@me/guilds",
          {},
        ),
      ),
    );

    await client.getCachedCompleteUserGuilds(
      identity.userId,
      identity.discordId,
    );

    await waitFor(null);
  });
});
