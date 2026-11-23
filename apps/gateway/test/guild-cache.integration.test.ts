import { describe, expect, test } from "bun:test";
import { Effect } from "effect";
import type { RedisScriptReply } from "#src/platform/redis-store";
import { makeGuildStore } from "#src/guilds/guild-store";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import { httpClientFromResponses } from "./http-fixtures.js";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  uniquePrefix,
  makeConfiguration,
  guilds,
  openStore,
  waitFor,
} from "./realtime-redis-fixtures.js";

describe("realtime Dragonfly integration: guild cache", () => {
  useDragonfly();

  test("guild cache invalidation denies stale permissions across stores", async () => {
    const keyPrefix = uniquePrefix();
    await using first = await openStore(keyPrefix);
    await using second = await openStore(keyPrefix);
    const configuration = makeConfiguration();
    const options = { discordId: "discord-cache", userId: "user-cache" };
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);

    const lastGuilds = [
      {
        guild: { id: "organization-1", ownerId: "owner-1" },
        roles: [],
      },
    ];

    let available = true;

    const store = makeGuildStore(
      configuration,
      first.store,
      httpClientFromResponses(() =>
        Effect.succeed(
          available
            ? Response.json(lastGuilds)
            : Response.json({}, { status: 503 }),
        ),
      ),
    );

    const remote = makeGuildStore(
      configuration,
      second.store,
      httpClientFromResponses(() => Effect.succeed(Response.json([]))),
    );

    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual(lastGuilds);
    expect(
      Number(
        await first.runtime.runPromise(
          first.redis.send("TTL", `${keyPrefix}:${cacheKey}`),
        ),
      ),
    ).toBeGreaterThan(CACHE_TTL.MAX_STALE_CACHE_AGE - 5);

    available = false;

    await Effect.runPromise(remote.invalidate(options));
    await expect(
      Effect.runPromise(store.getUserGuilds(options).pipe(Effect.flip)),
    ).resolves.toMatchObject({
      reason: "status",
      retryable: true,
    });

    await expect(
      Effect.runPromise(remote.getUserGuilds(options)),
    ).resolves.toEqual([]);
    await expect(
      Effect.runPromise(store.getUserGuilds(options)),
    ).resolves.toEqual([]);
  });

  test("a revisioned guild projection that no longer decodes is replaced by a fresh response", async () => {
    await using redis = await openStore();
    const options = { discordId: "discord-schema", userId: "user-schema" };
    const cacheKey = getUserGuildsCacheKey(options.discordId, options.userId);

    await redis.store.command.set(
      cacheKey,
      JSON.stringify({ guilds: [{}], cachedAt: 0, revision: "revision-1" }),
      "EX",
      120,
    );

    const guildStore = makeGuildStore(
      makeConfiguration(),
      redis.store,
      httpClientFromResponses(() => Effect.succeed(Response.json(guilds))),
    );

    await expect(
      Effect.runPromise(guildStore.getUserGuilds(options)),
    ).resolves.toEqual(guilds);
    expect(
      JSON.parse((await redis.store.command.get(cacheKey)) ?? "null"),
    ).toMatchObject({ guilds, revision: "revision-1" });
  });

  test.each(["empty", "populated"])(
    "in-flight permission fetch cannot undo another gateway's invalidation of a %s cache",
    async (cacheState) => {
      const keyPrefix = uniquePrefix();
      await using first = await openStore(keyPrefix);
      await using second = await openStore(keyPrefix);
      const configuration = makeConfiguration();
      const response = Promise.withResolvers<Response>();

      try {
        const options = { discordId: "discord-race", userId: "user-race" };

        const cacheKey = getUserGuildsCacheKey(
          options.discordId,
          options.userId,
        );

        if (cacheState === "populated") {
          await first.store.command.set(
            cacheKey,
            JSON.stringify({ guilds, cachedAt: Date.now() - 700_000 }),
            "EX",
            900,
          );
        }

        const started = Promise.withResolvers<void>();
        const commits: RedisScriptReply[] = [];

        const firstStore = makeGuildStore(
          configuration,
          {
            command: {
              ...first.store.command,
              eval: async (...args) => {
                const committed =
                  await first.store.command.eval<RedisScriptReply>(...args);

                commits.push(committed);

                return committed;
              },
            },
          },
          httpClientFromResponses(() =>
            Effect.promise(() => {
              started.resolve();

              return response.promise;
            }),
          ),
        );

        const secondStore = makeGuildStore(
          configuration,
          second.store,
          httpClientFromResponses(() => Effect.succeed(Response.json([]))),
        );

        const request = Effect.runPromise(firstStore.getUserGuilds(options));

        await started.promise;
        await Effect.runPromise(secondStore.invalidate(options));
        await Effect.runPromise(secondStore.getUserGuilds(options));
        response.resolve(Response.json(guilds));

        await expect(request).resolves.toEqual(
          cacheState === "populated" ? guilds : [],
        );
        await waitFor(() => commits.length === 1);
        expect(commits).toEqual([0]);
        await expect(
          Effect.runPromise(firstStore.getUserGuilds(options)),
        ).resolves.toEqual([]);
      } finally {
        response.resolve(Response.json([]));
      }
    },
  );
});
