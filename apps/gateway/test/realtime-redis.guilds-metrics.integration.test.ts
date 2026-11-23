import { RpcUnavailableError } from "@lootlog/rpc/errors";
import { describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import { Effect, Metric } from "effect";
import type { RedisScriptReply } from "#src/platform/redis-store";
import { GatewayMetrics } from "#src/realtime/gateway-metrics";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { makeGuildStore } from "#src/guilds/guild-store";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import {
  depart,
  eventsOfType,
  gameSocket,
  guilds,
  locationReadGuilds,
  makeSession,
  makeSocket,
  presenceStore,
  uniquePrefix,
  useDragonfly,
  waitFor,
} from "./realtime-redis.integration.fixtures.js";

describe("realtime Dragonfly integration: guilds and metrics", () => {
  const { makeConfiguration, openStore, redisUrl } = useDragonfly();

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

    const store = makeGuildStore(configuration, first.store, {
      getUserGuildPermissions: () =>
        available
          ? Effect.succeed(lastGuilds)
          : Effect.fail(new RpcUnavailableError({ message: "unavailable" })),
    });

    const remote = makeGuildStore(configuration, second.store, {
      getUserGuildPermissions: () => Effect.succeed([]),
    });

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

    const guildStore = makeGuildStore(makeConfiguration(), redis.store, {
      getUserGuildPermissions: () => Effect.succeed(guilds),
    });

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
          {
            getUserGuildPermissions: () =>
              Effect.promise(() => {
                started.resolve();

                return response.promise;
              }).pipe(
                Effect.flatMap((res) =>
                  Effect.promise(async () => {
                    // SAFETY: test fixture resolves `Response.json(guilds)` with the `guilds` array defined in this file.
                    return (await res.json()) as typeof guilds;
                  }),
                ),
              ),
          },
        );

        const secondStore = makeGuildStore(configuration, second.store, {
          getUserGuildPermissions: () => Effect.succeed([]),
        });

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

  test.each([
    { refreshExpiryOnReject: false, includeTimestamp: false },
    { refreshExpiryOnReject: true, includeTimestamp: false },
    { refreshExpiryOnReject: true, includeTimestamp: true },
  ])(
    "sliding-window limits preserve expiry and Redis time (%j)",
    async (options) => {
      const client = new RedisClient(redisUrl());
      const key = `sliding-window:${crypto.randomUUID()}`;
      const script = slidingWindowRateLimitScript(options);
      const window = 60_000;

      try {
        const seededAt = Number(
          await client.send("EVAL", [
            `local time = redis.call("TIME")
         local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
         redis.call("ZADD", KEYS[1], now - 60000, "expired", now, "active")
         return now`,
            "1",
            key,
          ]),
        );

        const accepted = await client.send("EVAL", [
          script,
          "1",
          key,
          String(window),
          "2",
          "accepted",
        ]);

        expect(accepted).toEqual(
          options.includeTimestamp ? [1, expect.any(Number), 0] : [1, 0],
        );
        expect(await client.send("ZRANGE", [key, "0", "-1"])).toEqual(
          expect.arrayContaining(["active", "accepted"]),
        );
        expect(Number(await client.send("PTTL", [key]))).toBeGreaterThan(
          59_000,
        );

        await client.send("PEXPIRE", [key, "50000"]);

        const rejected = await client.send("EVAL", [
          script,
          "1",
          key,
          String(window),
          "2",
          "rejected",
        ]);

        expect(rejected).toEqual(
          options.includeTimestamp
            ? [0, expect.any(Number), expect.any(Number)]
            : [0, expect.any(Number)],
        );

        if (!Array.isArray(rejected))
          throw new Error("Expected rate-limit tuple");
        const retryAfter = Number(rejected.at(-1));
        expect(retryAfter).toBeGreaterThan(59_000);
        expect(retryAfter).toBeLessThanOrEqual(window);

        if (options.includeTimestamp) {
          expect(Number(rejected[1])).toBeGreaterThanOrEqual(seededAt);
          expect(Number(rejected[1]) + retryAfter).toBe(seededAt + window);
        }

        expect(await client.send("ZCARD", [key])).toBe(2);
        const ttl = Number(await client.send("PTTL", [key]));

        if (options.refreshExpiryOnReject) expect(ttl).toBeGreaterThan(59_000);
        else expect(ttl).toBeLessThanOrEqual(50_000);
      } finally {
        await client.send("DEL", [key]);
        client.close();
      }
    },
  );

  test("presence snapshots follow a session's moves and removal with increasing revisions", async () => {
    await using redis = await openStore();
    const presence = presenceStore({ redis: redis.store });

    const source = gameSocket("snapshot-source", {
      memberships: guilds.slice(0, 1),
    });

    const viewer = {
      ...makeSession("snapshot-viewer"),
      guilds: locationReadGuilds,
    };

    const location = { mapId: 7, map: "Ithan", x: 1, y: 2 };

    const snapshot = () =>
      Effect.runPromise(presence.snapshot(viewer, "organization-1"));

    await Effect.runPromise(
      presence.publish(source, {
        organizationIds: ["organization-1"],
        location,
      }),
    );

    const published = await snapshot();

    expect(published.presences).toEqual([
      expect.objectContaining({
        sessionId: source.data.connectionId,
        organizationIds: ["organization-1"],
        location,
      }),
    ]);

    const moved = { ...location, x: 3 };

    await Effect.runPromise(
      presence.publish(source, {
        organizationIds: ["organization-1"],
        location: moved,
      }),
    );
    await Effect.runPromise(presence.flushDeltas);

    const updated = await snapshot();

    expect(updated.presences).toEqual([
      expect.objectContaining({ location: moved }),
    ]);
    expect(updated.revision).toBeGreaterThan(published.revision);
    await depart(presence, source);
    await Effect.runPromise(presence.flushDeltas);

    const disconnected = await snapshot();

    expect(disconnected.presences).toEqual([]);
    expect(disconnected.revision).toBeGreaterThan(updated.revision);
    expect(
      await redis.store.command.smembers("presence:index:organization-1"),
    ).toEqual([]);
    expect(
      await redis.store.command.get("presence:organization-1:snapshot-source"),
    ).toBeNull();
  });

  test("gateway metrics deduplicate Discord accounts across characters and replicas and expire abandoned replicas", async () => {
    await using redis = await openStore();
    const { store } = redis;
    const first = makeSocket("metrics-first").socket;
    const duplicate = makeSocket("metrics-duplicate").socket;
    Object.assign(duplicate, {
      data: {
        ...duplicate.data,
        discordId: first.data.discordId,
        userId: first.data.userId,
      },
    });
    const second = makeSocket("metrics-second").socket;
    const web = makeSocket("metrics-web").socket;
    const webSession = { ...web.data, platform: "web-app" as const };
    Object.assign(web, { data: webSession });
    let now = Date.now();
    const firstHub = new RealtimeHub(makeConfiguration(), store);
    const secondHub = new RealtimeHub(makeConfiguration(), store);
    firstHub.register(first);
    firstHub.register(web);
    secondHub.register(duplicate);
    secondHub.register(second);
    const replicaA = new GatewayMetrics(store.command, firstHub, () => now);
    const replicaB = new GatewayMetrics(store.command, secondHub, () => now);
    await Effect.runPromise(replicaA.sample());
    expect(await Effect.runPromise(replicaB.sample())).toEqual({
      connections: 4,
      gameSessions: 3,
      uniquePlayers: 2,
    });
    firstHub.detach(first);
    expect(await Effect.runPromise(replicaA.sample())).toEqual({
      connections: 3,
      gameSessions: 2,
      uniquePlayers: 2,
    });
    await store.command.eval(
      `
        local value = cjson.decode(redis.call('HGET', KEYS[1], ARGV[1]))
        value.at = value.at - 30000
        redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(value))
        return 1
      `,
      1,
      "realtime:metrics:instances:v2",
      secondHub.instanceId,
    );
    expect(await Effect.runPromise(replicaA.sample())).toEqual({
      connections: 1,
      gameSessions: 0,
      uniquePlayers: 0,
    });
    expect(await Effect.runPromise(replicaB.sample())).toEqual({
      connections: 3,
      gameSessions: 2,
      uniquePlayers: 2,
    });
    now += PRESENCE_EXPIRY_MS;
    expect(await Effect.runPromise(replicaB.sample())).toEqual({
      connections: 3,
      gameSessions: 0,
      uniquePlayers: 0,
    });

    const observed = Metric.gauge(
      "lootlog_gateway_cluster_observed_at_seconds",
      { attributes: { unit: "s" } },
    );

    const lastSuccess = Effect.runSync(Metric.value(observed)).value;
    await store.command.del("realtime:metrics:instances:v2");
    await store.command.set(
      "realtime:metrics:instances:v2",
      "invalid Redis type",
    );
    now += 10_000;
    const result = await Effect.runPromiseExit(replicaB.sample());
    expect(result._tag).toBe("Failure");
    expect(Effect.runSync(Metric.value(observed)).value).toBe(lastSuccess);
    expect(
      Effect.runSync(
        Metric.value(
          Metric.gauge("lootlog_gateway_cluster_connections", {
            attributes: { unit: "" },
          }),
        ),
      ).value,
    ).toBe(3);
  });

  test("gateway metrics tell each global chat channel its cluster-wide players and listeners", async () => {
    await using redis = await openStore();

    const listener = (id: string, world: string) => {
      const target = makeSocket(id);
      const { data } = target.socket;

      Object.assign(target.socket, {
        data: {
          ...data,
          presence: data.presence?.character && {
            ...data.presence,
            character: { ...data.presence.character, world },
          },
        },
      });

      return target;
    };

    const firstHub = new RealtimeHub(makeConfiguration(), redis.store);
    const secondHub = new RealtimeHub(makeConfiguration(), redis.store);
    const gordionA = listener("chat-gordion-a", "gordion");
    const sharedA = listener("chat-shared-a", "gordion");
    const gordionB = listener("chat-gordion-b", "classic");
    const sharedB = listener("chat-shared-b", "classic");
    const gordion = { topic: "global.chat.world", world: "gordion" } as const;

    for (const [hub, target, scope] of [
      [firstHub, gordionA, gordion],
      [firstHub, sharedA, { topic: "global.chat" }],
      [secondHub, gordionB, gordion],
      [secondHub, sharedB, { topic: "global.chat" }],
    ] as const) {
      hub.register(target.socket);
      hub.subscribe(target.socket, scope);
    }

    await Effect.runPromise(
      new GatewayMetrics(redis.store.command, secondHub).sample(),
    );
    await Effect.runPromise(
      new GatewayMetrics(redis.store.command, firstHub).sample(),
    );

    const stats = (frames: string[]) =>
      eventsOfType(frames, "global-chat.stats");

    expect(stats(gordionA.frames)).toEqual([
      {
        v: 1,
        type: "global-chat.stats",
        data: { world: "gordion", online: 2, listeners: 2 },
      },
    ]);
    expect(stats(sharedA.frames)).toEqual([
      { v: 1, type: "global-chat.stats", data: { online: 4, listeners: 2 } },
    ]);
    expect(stats(gordionB.frames)).toEqual([
      {
        v: 1,
        type: "global-chat.stats",
        data: { world: "gordion", online: 0, listeners: 1 },
      },
    ]);
    expect(stats(sharedB.frames)).toEqual([
      { v: 1, type: "global-chat.stats", data: { online: 2, listeners: 1 } },
    ]);
  });
});
