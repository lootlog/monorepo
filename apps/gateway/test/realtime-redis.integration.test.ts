import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import { BunRedis } from "@effect/platform-bun";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { Permission } from "@lootlog/schema/permissions";
import {
  Effect,
  Fiber,
  ManagedRuntime,
  Metric,
  Predicate,
  Queue,
  Redacted,
  Result,
  Schedule,
} from "effect";
import { Redis } from "effect/unstable/persistence";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { RedisGatewayStore } from "#src/platform/redis-store";
import { GatewayMetrics } from "#src/realtime/gateway-metrics";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { PresenceStore } from "#src/realtime/presence-store";
import { OnlineHistory } from "#src/realtime/online-history";
import type {
  GameCharacterOffline,
  UserOnlineEventV1,
} from "@lootlog/protocol/rabbit/events";
import { AirTagService } from "#src/realtime/air-tag-service";
import { MapPingService } from "#src/realtime/map-ping-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { SessionData } from "#src/realtime/session";

let dragonfly: StartedTestContainer;

let redisPort: number;

const makeConfiguration = () =>
  ({
    environment: "test",
    port: 0,
    serviceName: "gateway",
    serviceNamespace: "test",
    apiUrl: "http://localhost",
    margonemSigningKeyUrl: "http://localhost/key",
    rabbitmqUri: Redacted.make("unused"),
    activityEventSignatureSecret: Redacted.make("test"),
    websocketPath: "/ws",
    allowedWebOrigins: new Set<string>(),
    allowedExtensionOrigins: new Set<string>(),
    redis: {
      host: dragonfly.getHost(),
      port: redisPort,
      username: "",
      password: Redacted.make(""),
      keyPrefix: "lootlog-realtime-integration:test",
    },
    maxBackpressureBytes: 1_048_576,
    maxBackpressureStrikes: 3,
  }) satisfies GatewayConfiguration;

const guilds = ["organization-1", "organization-2"].map((id) => ({
  guild: { id, ownerId: "owner" },
  roles: [
    {
      id: `role-${id}`,
      lvlRangeFrom: 0,
      lvlRangeTo: 500,
      permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
    },
  ],
}));

const makeSession = (connectionId: string): SessionData => ({
  discordId: `discord-${connectionId}`,
  userId: `user-${connectionId}`,
  connectionId,
  platform: "game",
  joined: true,
  guilds,
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "verified",
  presence: {
    userId: `user-${connectionId}`,
    sessionId: `presence-${connectionId}`,
    organizationIds: guilds.map(({ guild }) => guild.id),
    platform: "game",
    status: "online",
    confidence: "verified",
    isAfk: false,
    lastSeen: Date.now(),
    character: {
      world: "classic",
      name: `Hero-${connectionId}`,
      lvl: 300,
      icon: "hero.gif",
      characterId: `character-${connectionId}`,
      accountId: `account-${connectionId}`,
      prof: "w",
    },
    location: { mapId: 7, map: "Ithan", x: 1, y: 2 },
  },
  backpressureStrikes: 0,
});

const makeSocket = (connectionId: string) => {
  const frames: Uint8Array[] = [];

  const socket = {
    data: makeSession(connectionId),
    getBufferedAmount: () => 0,
    send: (bytes: Uint8Array) => {
      frames.push(bytes);

      return bytes.byteLength;
    },
    close: () => undefined,
  };

  return { socket, frames };
};

const eventsOfType = (frames: ReadonlyArray<Uint8Array>, type: string) => {
  const events: ReturnType<typeof decodeRealtimeFrame>[] = [];

  for (const frame of frames) {
    const decoded = decodeRealtimeFrame(frame);

    if ("type" in decoded && decoded.type === type) events.push(decoded);
  }

  return events;
};

const waitFor = async (predicate: () => boolean): Promise<void> => {
  const deadline = Date.now() + 2_000;

  while (!predicate()) {
    if (Date.now() >= deadline)
      throw new Error("Timed out waiting for realtime federation");
    await Bun.sleep(20);
  }
};

describe("realtime Dragonfly integration", () => {
  beforeAll(async () => {
    dragonfly = await new GenericContainer(
      "docker.dragonflydb.io/dragonflydb/dragonfly:v1.34.1",
    )
      .withCommand(["--logtostderr", "--proactor_threads=2"])
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(60_000)
      .start();
    redisPort = dragonfly.getMappedPort(6379);
  }, 60_000);

  afterAll(async () => {
    await dragonfly?.stop();
  });

  test.each([
    { refreshExpiryOnReject: false, includeTimestamp: false },
    { refreshExpiryOnReject: true, includeTimestamp: false },
    { refreshExpiryOnReject: true, includeTimestamp: true },
  ])(
    "sliding-window limits preserve expiry and Redis time (%j)",
    async (options) => {
      const client = new RedisClient(
        `redis://${dragonfly.getHost()}:${redisPort}`,
      );

      const key = `sliding-window:${crypto.randomUUID()}`;
      const script = slidingWindowRateLimitScript(options);
      const window = 60_000;

      try {
        // The cutoff is inclusive: this old attempt must release one slot.
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

  test("concurrent presence snapshots share Redis reads without sharing permissions or retaining stale state", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    const gate = Promise.withResolvers<void>();

    try {
      const redis = await runtime.runPromise(Redis.Redis);
      const configuration = makeConfiguration();

      const store = new RedisGatewayStore(
        redis,
        {
          ...configuration.redis,
          password: "",
          keyPrefix: `presence-snapshots:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      const hub = new RealtimeHub(configuration, store);
      let holdReads = false;
      const indexReads: string[] = [];
      let valueReads = 0;

      const presence = new PresenceStore(
        {
          command: {
            ...store.command,
            smembers: async (key) => {
              const keys = await store.command.smembers(key);

              if (holdReads) {
                indexReads.push(key);
                await gate.promise;
              }

              return keys;
            },
            mget: (keys) => {
              valueReads++;

              return store.command.mget(keys);
            },
          },
        },
        hub,
      );

      const source = makeSocket("snapshot-source").socket;
      source.data.guilds = guilds.filter(
        ({ guild }) => guild.id === "organization-1",
      );
      source.data.character = source.data.presence?.character;
      const location = { mapId: 7, map: "Ithan", x: 1, y: 2 };
      await Effect.runPromise(
        presence.publish(source, {
          organizationIds: ["organization-1"],
          location,
        }),
      );
      const basic = makeSession("snapshot-basic");
      const precise = makeSession("snapshot-precise");
      precise.guilds = guilds.map((entry) => ({
        ...entry,
        roles: entry.roles.map((role) => ({
          ...role,
          permissions: [
            ...role.permissions,
            Permission.LOOTLOG_PRESENCE_LOCATION_READ,
          ],
        })),
      }));

      holdReads = true;

      const snapshots = Promise.all([
        Effect.runPromise(presence.snapshot(basic, "organization-1")),
        Effect.runPromise(
          presence.snapshot(precise, "organization-1", "classic"),
        ),
        Effect.runPromise(presence.snapshot(precise, "organization-2")),
      ]);

      await waitFor(() => indexReads.length >= 2);
      holdReads = false;
      gate.resolve();

      const [basicSnapshot, preciseSnapshot, otherOrganization] =
        await snapshots;

      expect(indexReads.toSorted()).toEqual([
        "presence:index:organization-1",
        "presence:index:organization-2",
      ]);
      expect(valueReads).toBe(1);
      expect(basicSnapshot.presences).toHaveLength(1);
      expect(basicSnapshot.presences[0]).not.toHaveProperty("location");
      expect(preciseSnapshot.presences).toEqual([
        expect.objectContaining({
          sessionId: source.data.connectionId,
          organizationIds: ["organization-1"],
          location,
        }),
      ]);
      expect(otherOrganization.presences).toEqual([]);

      const moved = { ...location, x: 3 };
      await Effect.runPromise(
        presence.publish(source, {
          organizationIds: ["organization-1"],
          location: moved,
        }),
      );

      const updated = await Effect.runPromise(
        presence.snapshot(precise, "organization-1"),
      );

      expect(updated.presences[0]).toMatchObject({ location: moved });
      expect(updated.revision).toBeGreaterThan(preciseSnapshot.revision);
      await Effect.runPromise(presence.disconnect(source.data));

      const disconnected = await Effect.runPromise(
        presence.snapshot(precise, "organization-1"),
      );

      expect(disconnected.presences).toEqual([]);
      expect(disconnected.revision).toBeGreaterThan(updated.revision);
    } finally {
      gate.resolve();
      await runtime.dispose();
    }
  });

  test("gateway metrics deduplicate Discord accounts across characters and replicas and expire abandoned replicas", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `metrics-test:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      let now = Date.now();
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
      now = Date.now();
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
      // Simulate an abandoned replica using Redis time, without waiting for the lease.
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
      const result = await Effect.runPromise(Effect.exit(replicaB.sample()));
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
    } finally {
      await runtime.dispose();
    }
  });

  test("offline claims serialize with reconnect and retain expired-session delivery through a restart", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `offline-test:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      let now = Date.now();

      const hub = {
        instanceId: crypto.randomUUID(),
        publishPresence: async () => {},
        publishToScope: async () => {},
      };

      const events: GameCharacterOffline[] = [];
      let fails = false;

      const publish = (event: GameCharacterOffline) =>
        Effect.suspend(() => {
          if (fails) return Effect.fail(new Error("Rabbit unavailable"));
          events.push(event);

          return Effect.void;
        });

      let beforeClaim: (() => Promise<void>) | undefined;

      const command = {
        ...store.command,
        eval: async <A>(
          script: string,
          keyCount: number,
          ...args: ReadonlyArray<string | number>
        ): Promise<A> => {
          const callback = script.includes("-- presence:offline-claim")
            ? beforeClaim
            : undefined;

          if (callback) beforeClaim = undefined;
          await callback?.();

          return store.command.eval<A>(script, keyCount, ...args);
        },
      };

      const makePresence = () =>
        new PresenceStore(
          { command },
          hub,
          () => now,
          undefined,
          undefined,
          publish,
        );

      let presence = makePresence();
      const game = makeSocket("offline").socket;
      game.data.character = game.data.presence?.character;
      await Effect.runPromise(presence.publish(game, { organizationIds: [] }));
      await Effect.runPromise(presence.disconnect(game.data));
      now += 10_000;
      beforeClaim = async () => {
        await Effect.runPromise(
          presence.publish(game, { organizationIds: [] }),
        );
      };

      await Effect.runPromise(presence.sweepOffline());
      expect(events).toEqual([]);

      // Redis TTL can elapse while the gateway is down; metadata must retain identity.
      for (const { guild } of game.data.guilds)
        await store.command.del(
          `presence:${guild.id}:${game.data.connectionId}`,
        );
      now += PRESENCE_EXPIRY_MS + 10_000;
      presence = makePresence();
      await Effect.runPromise(presence.sweepExpired());
      fails = true;
      await Effect.runPromise(presence.sweepOffline().pipe(Effect.flip));
      presence = makePresence();
      fails = false;
      await Effect.runPromise(presence.sweepOffline());
      expect(events).toHaveLength(1);
      expect(events[0]?.characterId).toBe(game.data.character?.characterId);
      await Effect.runPromise(presence.sweepOffline());
      expect(events).toHaveLength(1);
    } finally {
      await runtime.dispose();
    }
  });

  test("offline decisions reread a later Organization group after a reconnect delayed by publication", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    const reconnectPublished = Promise.withResolvers<void>();
    const resumePublication = Promise.withResolvers<void>();
    let reconnecting: Promise<unknown> | undefined;

    try {
      const redis = await runtime.runPromise(Redis.Redis);
      const prefix = `offline-reconnect-test:${crypto.randomUUID()}`;

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: prefix,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      let now = Date.now();
      let pausePublication = false;
      const events: GameCharacterOffline[] = [];
      let afterFirstClaim: (() => Promise<void>) | undefined;

      const command = {
        ...store.command,
        eval: async <A>(
          script: string,
          keyCount: number,
          ...args: ReadonlyArray<string | number>
        ): Promise<A> => {
          const result = await store.command.eval<A>(script, keyCount, ...args);

          const callback = script.includes("-- presence:offline-claim")
            ? afterFirstClaim
            : undefined;

          if (callback) afterFirstClaim = undefined;
          await callback?.();

          return result;
        },
      };

      const presence = new PresenceStore(
        { command },
        {
          instanceId: crypto.randomUUID(),
          publishPresence: async () => {
            if (!pausePublication) return;
            reconnectPublished.resolve();
            await resumePublication.promise;
          },
          publishToScope: async () => {},
        },
        () => now,
        undefined,
        undefined,
        (event) =>
          Effect.sync(() => {
            events.push(event);
          }),
      );

      const first = makeSocket("group-first").socket;
      const second = makeSocket("group-second").socket;
      first.data.guilds = first.data.guilds.slice(0, 1);

      for (const socket of [first, second]) {
        socket.data.character = socket.data.presence?.character;
        await Effect.runPromise(
          presence.publish(socket, { organizationIds: [] }),
        );
        await Effect.runPromise(presence.disconnect(socket.data));
      }

      now += 10_000;
      const pending = await store.command.smembers("presence:offline:pending");

      const firstKey = pending.find((key) =>
        key.includes('"user-group-first"'),
      );

      const secondKey = pending.find((key) =>
        key.includes('"user-group-second"'),
      );

      if (!firstKey || !secondKey)
        throw new Error("Missing pending departures");
      // Both groups overlap organization-1. Its first snapshot must not be reused
      // after another group's claim waits on network I/O.
      await runtime.runPromise(
        redis.send(
          "RPUSH",
          `${prefix}:presence:offline:pending:overflow`,
          firstKey,
          secondKey,
        ),
      );
      afterFirstClaim = async () => {
        pausePublication = true;
        reconnecting = Effect.runPromise(
          presence.publish(second, { organizationIds: [] }),
        );
        await reconnectPublished.promise;
        expect(
          await store.command.get("presence:organization-1:group-second"),
        ).not.toBeNull();
        // Publication is still blocked, so the final reconnect cancellation has
        // not removed this exact pending value yet.
        expect(await store.command.get(secondKey)).not.toBeNull();
      };

      await Effect.runPromise(presence.sweepOffline());
      expect(events.map((event) => event.userId)).toEqual([first.data.userId]);
      expect(await store.command.smembers("presence:offline:pending")).toEqual(
        [],
      );
      expect(await store.command.smembers("presence:offline:outbox")).toEqual(
        [],
      );
    } finally {
      resumePublication.resolve();
      await reconnecting;
      await runtime.dispose();
    }
  });

  test("offline grouped claims preserve replacement departures and reconnect cancellation for each character", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `offline-group-test:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      let now = Date.now();
      const events: GameCharacterOffline[] = [];
      const claimSizes: number[] = [];
      let beforeClaim: (() => Promise<void>) | undefined;
      let afterClaim: (() => Promise<void>) | undefined;

      const command = {
        ...store.command,
        eval: async <A>(
          script: string,
          keyCount: number,
          ...args: ReadonlyArray<string | number>
        ): Promise<A> => {
          if (!script.includes("-- presence:offline-claim"))
            return store.command.eval<A>(script, keyCount, ...args);
          claimSizes.push((keyCount - 4) / 3);
          const before = beforeClaim;
          const after = afterClaim;
          beforeClaim = undefined;
          afterClaim = undefined;
          await before?.();
          const result = await store.command.eval<A>(script, keyCount, ...args);
          await after?.();

          return result;
        },
      };

      const presence = new PresenceStore(
        { command },
        {
          instanceId: crypto.randomUUID(),
          publishPresence: async () => {},
          publishToScope: async () => {},
        },
        () => now,
        undefined,
        undefined,
        (event) =>
          Effect.sync(() => {
            events.push(event);
          }),
      );

      const departed = makeSocket("departed").socket;
      const reconnected = makeSocket("reconnected").socket;
      const replacement = makeSocket("replacement").socket;
      replacement.data.guilds = [...replacement.data.guilds].reverse();

      for (const socket of [departed, reconnected, replacement]) {
        socket.data.character = socket.data.presence?.character;
        await Effect.runPromise(
          presence.publish(socket, { organizationIds: [] }),
        );
        await Effect.runPromise(presence.disconnect(socket.data));
      }

      now += 10_000;
      const pending = await store.command.smembers("presence:offline:pending");

      const replacementKey = pending.find((key) =>
        key.includes('"user-replacement"'),
      );

      if (!replacementKey) throw new Error("Missing replacement departure");

      const newerDeparture = JSON.stringify({
        userId: replacement.data.userId,
        discordId: replacement.data.discordId,
        characterId: replacement.data.character?.characterId,
        world: "classic",
        organizationIds: ["organization-2", "organization-1"],
        disconnectedAt: now,
      });

      beforeClaim = async () => {
        await Effect.runPromise(
          presence.publish(reconnected, { organizationIds: [] }),
        );
        await store.command.set(replacementKey, newerDeparture);
      };

      afterClaim = async () => {
        // The old departure is already durable in the outbox. Returning online
        // starts a new period and must not erase its accepted publication.
        await Effect.runPromise(
          presence.publish(departed, { organizationIds: [] }),
        );
      };

      await Effect.runPromise(presence.sweepOffline());
      expect(claimSizes).toEqual([3]);
      expect(events.map((event) => event.userId)).toEqual([
        departed.data.userId,
      ]);
      expect(await store.command.get(replacementKey)).toBe(newerDeparture);
      expect(await store.command.smembers("presence:offline:pending")).toEqual([
        replacementKey,
      ]);

      now += 10_000;
      await Effect.runPromise(presence.disconnect(departed.data));
      await Effect.runPromise(presence.sweepOffline());
      expect(events.map((event) => event.userId)).toEqual([
        departed.data.userId,
        replacement.data.userId,
      ]);
      now += 10_000;
      await Effect.runPromise(presence.sweepOffline());
      expect(events.map((event) => event.userId)).toEqual([
        departed.data.userId,
        replacement.data.userId,
        departed.data.userId,
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("heartbeats repair independently lost indexes and preserve the final observed expiry time", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `heartbeat-test:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      const events: GameCharacterOffline[] = [];
      let now = Date.now();

      const hub = {
        instanceId: crypto.randomUUID(),
        publishPresence: async () => {},
        publishToScope: async () => {},
      };

      const presence = new PresenceStore(
        store,
        hub,
        () => now,
        undefined,
        undefined,
        (event) =>
          Effect.sync(() => {
            events.push(event);
          }),
      );

      const game = makeSocket("heartbeat").socket;
      game.data.character = game.data.presence?.character;
      await Effect.runPromise(presence.publish(game, { organizationIds: [] }));

      for (const lostKey of [
        "presence:index:organization-1",
        "presence:organizations",
      ]) {
        await store.command.del(lostKey);
        now += 25_000;
        await Effect.runPromise(
          presence.heartbeat(game, game.data.connectionId),
        );
        expect(
          await store.command.smembers("presence:index:organization-1"),
        ).toContain("presence:organization-1:heartbeat");
        expect(
          await store.command.smembers("presence:organizations"),
        ).toContain("organization-1");
        expect(
          (
            await Effect.runPromise(
              presence.snapshot(game.data, "organization-1"),
            )
          ).presences[0]?.lastSeen,
        ).toBe(now);
      }

      // A full Redis loss must be recoverable without another presence.publish.
      await store.command.flushdb();
      now += 25_000;
      await Effect.runPromise(presence.heartbeat(game, game.data.connectionId));
      expect(
        (
          await Effect.runPromise(
            presence.snapshot(game.data, "organization-1"),
          )
        ).presences,
      ).toHaveLength(1);
      const lastSeen = now;

      for (const { guild } of guilds)
        await store.command.del(`presence:${guild.id}:heartbeat`);
      now += PRESENCE_EXPIRY_MS + 10_000;
      await Effect.runPromise(presence.sweepExpired());
      await Effect.runPromise(presence.sweepOffline());
      expect(events).toEqual([
        expect.objectContaining({
          disconnectedAt: lastSeen + PRESENCE_EXPIRY_MS,
        }),
      ]);
    } finally {
      await runtime.dispose();
    }
  });

  test("offline sweeps share bounded Organization work, drain scan overflow, and reject a lease lost during a read", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `offline-batch-test:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      const now = Date.now();
      const events: GameCharacterOffline[] = [];
      const readStarted = Promise.withResolvers<void>();
      const resumeRead = Promise.withResolvers<void>();
      let organizationReads = 0;
      const pendingBatchSizes: number[] = [];
      let pause = true;

      const command = {
        ...store.command,
        mget: async (keys: string[]) => {
          const captured = await store.command.mget(keys);

          if (keys[0]?.startsWith("presence:offline:"))
            pendingBatchSizes.push(keys.length);

          if (keys.includes("presence:organization-1:active")) {
            organizationReads++;

            if (pause) {
              readStarted.resolve();
              await resumeRead.promise;
            }
          }

          return captured;
        },
      };

      const hub = {
        instanceId: crypto.randomUUID(),
        publishPresence: async () => {},
        publishToScope: async () => {},
      };

      const makePresence = () =>
        new PresenceStore(
          { command },
          hub,
          () => now,
          undefined,
          undefined,
          (event) =>
            Effect.sync(() => {
              events.push(event);
            }),
        );

      const presence = makePresence();
      const active = makeSocket("active").socket;
      active.data.character = active.data.presence?.character;
      await Effect.runPromise(
        presence.publish(active, { organizationIds: [] }),
      );
      const keys: string[] = [];

      for (let index = 0; index < 250; index++) {
        const key = `presence:offline:pending-fixture:${index}`;
        keys.push(key);
        await store.command.set(
          key,
          JSON.stringify({
            userId: `departed-${index}`,
            discordId: `discord-${index}`,
            characterId: `character-${index}`,
            world: "classic",
            organizationIds: ["organization-1"],
            disconnectedAt: now - 10_000,
          } satisfies GameCharacterOffline),
        );
      }

      // Legacy replicas only write this set. The new sweep must backfill the due queue.
      await store.command.sadd("presence:offline:pending", ...keys);
      // Force the valid persisted overflow path, independently of Dragonfly's page sizes.
      await runtime.runPromise(
        redis.send(
          "RPUSH",
          `${store.channel.slice(0, -":realtime:federation:v1".length)}:presence:offline:pending:overflow`,
          ...keys.slice(0, 125),
        ),
      );
      const reusedSweep = presence.sweepOffline();
      const first = Effect.runPromise(reusedSweep);
      await readStarted.promise;
      await Effect.runPromise(makePresence().sweepOffline());
      expect(organizationReads).toBe(1);
      expect(events).toHaveLength(0);
      // The old owner captured an offline observation before the reconnect.
      // Keep the successor's lease held until that stale owner attempts its claim,
      // so value comparison alone cannot hide a missing lease check.
      await store.command.set(
        "presence:offline:sweep-lock",
        "successor",
        "PX",
        30_000,
      );
      const reconnected = makeSocket("reconnected").socket;
      reconnected.data = {
        ...reconnected.data,
        userId: "departed-0",
        character: {
          world: "classic",
          characterId: "character-0",
          accountId: "account-0",
          name: "Reconnected",
          lvl: 100,
          prof: "w",
          icon: "hero.gif",
        },
      };
      await Effect.runPromise(
        presence.publish(reconnected, { organizationIds: [] }),
      );
      pause = false;
      resumeRead.resolve();
      await first;
      expect(events).toHaveLength(0);
      expect(await store.command.smembers("presence:offline:outbox")).toEqual(
        [],
      );
      expect(
        await store.command.smembers("presence:offline:pending"),
      ).toHaveLength(250);
      expect(await store.command.get("presence:offline:sweep-lock")).toBe(
        "successor",
      );
      await store.command.del("presence:offline:sweep-lock");

      for (const index of ["pending", "outbox"]) {
        await store.command.set(
          `malformed-${index}`,
          '{"userId":"old-schema"}',
        );
        await store.command.sadd(
          `presence:offline:${index}`,
          `malformed-${index}`,
        );
      }

      for (let batch = 0; batch < 20 && events.length < 249; batch++) {
        await Effect.runPromise(reusedSweep);
      }

      expect(events).toHaveLength(249);
      expect(events.some(({ userId }) => userId === "departed-0")).toBe(false);
      expect(Math.max(...pendingBatchSizes)).toBeLessThanOrEqual(100);
      expect(organizationReads).toBeLessThan(10);
      expect(new Set(events.map((event) => event.userId)).size).toBe(249);
      expect(await store.command.smembers("presence:offline:pending")).toEqual(
        [],
      );
      expect(await store.command.smembers("presence:offline:outbox")).toEqual(
        [],
      );
      expect(await store.command.mget(keys)).toEqual(keys.map(() => null));

      const due = await runtime.runPromise(
        redis.send(
          "ZRANGE",
          `${store.channel.slice(0, -":realtime:federation:v1".length)}:presence:offline:due`,
          "0",
          "-1",
        ),
      );

      expect(due).toEqual([]);
      expect(
        await store.command.mget(["malformed-pending", "malformed-outbox"]),
      ).toEqual([null, null]);
    } finally {
      await runtime.dispose();
    }
  });

  test("online history survives publisher restart without counting gaps or web sessions", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `online-test:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      const start = Date.parse("2026-09-06T10:00:00Z");
      let now = start;
      const messages: UserOnlineEventV1[] = [];
      let fails = false;

      const publish = (event: UserOnlineEventV1) =>
        Effect.suspend(() => {
          if (fails) return Effect.fail(new Error("Rabbit unavailable"));
          messages.push(event);

          return Effect.void;
        });

      let history = new OnlineHistory(store.command, publish, () => now);
      const session = makeSession("online-one");
      session.character = session.presence?.character;

      const observeAt = async (seconds: number, final = false) => {
        now = start + seconds * 1000;
        await Effect.runPromise(history.observe(session, now, final));
      };

      const checkpoints = () =>
        messages.filter((event) => event.type === "checkpoint");

      await observeAt(0);
      await observeAt(25);
      await observeAt(50);
      now = start + 60_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(1);
      expect(checkpoints()[0]?.world).toBe("classic");
      expect(checkpoints()[0]?.endedAt).toBe(
        new Date(start + 50_000).toISOString(),
      );
      await observeAt(75);
      await observeAt(100);
      now = start + 110_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(1);
      now = start + 120_000;
      fails = true;
      await expect(Effect.runPromise(history.flush())).rejects.toThrow();
      history = new OnlineHistory(store.command, publish, () => now);
      fails = false;
      now = start + 180_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(2);
      expect(checkpoints()[1]?.segmentId).toBe(checkpoints()[0]?.segmentId);
      expect(checkpoints()[1]?.endedAt).toBe(
        new Date(start + 100_000).toISOString(),
      );
      await observeAt(200);
      await observeAt(225, true);
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(3);
      expect(checkpoints()[2]?.startedAt).toBe(
        new Date(start + 200_000).toISOString(),
      );
      expect(checkpoints()[2]?.endedAt).toBe(
        new Date(start + 225_000).toISOString(),
      );
      expect(session.guilds).toHaveLength(2);

      const web = {
        ...session,
        platform: "web-app" as const,
        connectionId: "web",
      };

      await Effect.runPromise(history.observe(web, now));
      await Effect.runPromise(history.observe(web, now + 30_000, true));
      now += 120_000;
      await Effect.runPromise(history.observe(session, now, true));
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(3);
      // A pre-upgrade segment and pending message retain unknown provenance.
      const legacyStart = now;
      const legacyId = session.connectionId + ":" + legacyStart;
      await store.command.eval(
        "redis.call('SET', KEYS[1], ARGV[1]); redis.call('HSET', KEYS[2], ARGV[2], ARGV[3]); redis.call('ZADD', KEYS[3], ARGV[4], ARGV[2]); redis.call('ZADD', KEYS[4], ARGV[4], ARGV[2]); return 1",
        4,
        "online-history:session:" + session.connectionId,
        "online-history:pending",
        "online-history:due",
        "online-history:age",
        JSON.stringify({
          started: legacyStart,
          lastSeen: legacyStart + 25_000,
        }),
        legacyId,
        JSON.stringify({
          userId: session.userId,
          sessionId: session.connectionId,
          segmentId: legacyId,
          started: legacyStart,
          ended: legacyStart + 25_000,
          final: false,
        }),
        legacyStart,
      );
      now = legacyStart + 50_000;
      await Effect.runPromise(history.observe(session, now));
      now = legacyStart + 100_000;
      await Effect.runPromise(history.flush());
      expect(
        checkpoints()
          .slice(3)
          .map(({ world }) => world),
      ).toEqual([undefined, "classic"]);
      expect(checkpoints()[4]?.startedAt).toBe(
        new Date(legacyStart + 25_000).toISOString(),
      );

      if (!session.character) throw new Error("Expected game character");
      session.character = { ...session.character, world: "luvia" };
      now = legacyStart + 75_000;
      await Effect.runPromise(history.observe(session, now));
      now = legacyStart + 175_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()[5]?.world).toBe("luvia");
      expect(checkpoints()[5]?.startedAt).toBe(
        new Date(legacyStart + 50_000).toISOString(),
      );
    } finally {
      await runtime.dispose();
    }
  });

  test("online history drains a bounded backlog and preserves updates during delivery", async () => {
    const runtime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
    );

    try {
      const redis = await runtime.runPromise(Redis.Redis);

      const store = new RedisGatewayStore(
        redis,
        {
          host: dragonfly.getHost(),
          port: redisPort,
          username: "",
          password: "",
          keyPrefix: `online-backlog:${crypto.randomUUID()}`,
        },
        (effect) => runtime.runPromise(effect),
        () => {},
      );

      const start = Date.parse("2026-09-06T10:00:00Z");
      let now = start;

      const sessions = Array.from({ length: 1250 }, (_, index) => {
        const session = makeSession(`backlog-${index}`);
        session.character = session.presence?.character;

        return session;
      });

      const messages: UserOnlineEventV1[] = [];
      let updatedSession: SessionData | undefined;
      let fail = false;

      const history = new OnlineHistory(
        store.command,
        (event) =>
          Effect.gen(function* () {
            if (fail && event.type === "checkpoint")
              return yield* Effect.fail(new Error("Rabbit unavailable"));
            messages.push(event);

            if (event.type === "checkpoint" && !updatedSession) {
              updatedSession = sessions.find(
                (session) => session.connectionId === event.sessionId,
              );

              if (!updatedSession) throw new Error("Missing session");
              yield* history.observe(updatedSession, start + 55_000);
            }
          }),
        () => now,
      );

      for (const session of sessions) {
        await Effect.runPromise(history.observe(session, start));
        await Effect.runPromise(history.observe(session, start + 50_000));
      }

      const checkpoints = () =>
        messages.filter((event) => event.type === "checkpoint");

      const pending = () =>
        store.command.eval<number>(
          "return redis.call('HLEN', KEYS[1])",
          1,
          "online-history:pending",
        );

      now = start + 60_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(1000);
      expect(new Set(checkpoints().map((event) => event.sessionId)).size).toBe(
        1000,
      );
      expect(await pending()).toBe(251);
      expect(
        messages.filter((event) => event.type === "collector"),
      ).toHaveLength(1);
      fail = true;
      await expect(Effect.runPromise(history.flush())).rejects.toThrow(
        "Rabbit unavailable",
      );
      expect(await pending()).toBe(251);
      fail = false;
      now += 60_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(1251);
      expect(new Set(checkpoints().map((event) => event.sessionId)).size).toBe(
        1250,
      );
      expect(await pending()).toBe(0);

      const updated = checkpoints().filter(
        (event) => event.sessionId === updatedSession?.connectionId,
      );

      expect(updated.map((event) => event.endedAt)).toEqual([
        new Date(start + 50_000).toISOString(),
        new Date(start + 55_000).toISOString(),
      ]);
      expect(updated[0]?.segmentId).toBe(updated[1]?.segmentId);
    } finally {
      await runtime.dispose();
    }
  }, 30_000);

  test.each([3000, 5000])(
    "online history refreshes batch leases and bounds slow drains (%i ms)",
    async (delay) => {
      const runtime = ManagedRuntime.make(
        BunRedis.layer({ url: `redis://${dragonfly.getHost()}:${redisPort}` }),
      );

      try {
        const redis = await runtime.runPromise(Redis.Redis);

        const store = new RedisGatewayStore(
          redis,
          {
            host: dragonfly.getHost(),
            port: redisPort,
            username: "",
            password: "",
            keyPrefix: `online-slow:${crypto.randomUUID()}`,
          },
          (effect) => runtime.runPromise(effect),
          () => {},
        );

        const start = Date.parse("2026-09-06T10:00:00Z");
        let now = start;
        const messages: UserOnlineEventV1[] = [];
        let fail = delay === 3000;
        let attempts = 0;

        const history = new OnlineHistory(
          store.command,
          (event) =>
            Effect.suspend(() => {
              if (event.type === "checkpoint") {
                attempts++;

                if (attempts === 1) now += delay;

                if (fail && attempts === 101)
                  return Effect.fail(new Error("Rabbit unavailable"));
              }

              messages.push(event);

              return Effect.void;
            }),
          () => now,
        );

        for (let index = 0; index < 250; index++) {
          const session = makeSession(`slow-${index}`);
          session.character = session.presence?.character;
          await Effect.runPromise(history.observe(session, start));
          await Effect.runPromise(history.observe(session, start + 50_000));
        }

        const checkpoints = () =>
          messages.filter((event) => event.type === "checkpoint");

        now = start + 60_000;

        if (fail)
          await expect(Effect.runPromise(history.flush())).rejects.toThrow(
            "Rabbit unavailable",
          );
        else await Effect.runPromise(history.flush());
        expect(checkpoints()).toHaveLength(100);
        expect(
          messages.filter((event) => event.type === "collector").at(-1)
            ?.observedAt,
        ).toBe(new Date(now).toISOString());
        fail = false;
        now = start + 120_000;
        await Effect.runPromise(history.flush());
        // The second claimed batch retains its complete 60-second lease, measured
        // from its own claim at 63 seconds, while unclaimed work can be drained.
        expect(checkpoints()).toHaveLength(delay === 3000 ? 150 : 250);
        now = start + 123_000;
        await Effect.runPromise(history.flush());
        expect(checkpoints()).toHaveLength(250);
        expect(
          new Set(checkpoints().map((event) => event.sessionId)).size,
        ).toBe(250);
      } finally {
        await runtime.dispose();
      }
    },
    30_000,
  );

  test("closing a subscription scope releases Redis without a shutdown defect", async () => {
    const channel = `shutdown:${crypto.randomUUID()}`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const redis = yield* Redis.Redis;
        yield* Effect.scoped(
          Effect.gen(function* () {
            const messages = yield* redis.subscribe(channel);
            yield* redis.send("PUBLISH", channel, "before shutdown");
            expect(yield* Queue.take(messages)).toEqual({
              channel,
              message: "before shutdown",
            });
          }),
        );

        // Dragonfly observes socket closure asynchronously on another connection.
        const subscriptions = yield* redis
          .send<[string, number]>("PUBSUB", "NUMSUB", channel)
          .pipe(
            Effect.repeat({
              until: ([, count]) => count === 0,
              schedule: Schedule.spaced("10 millis"),
            }),
          );

        expect(subscriptions).toEqual([channel, 0]);
        expect(yield* redis.send("PING")).toBe("PONG");
      }).pipe(
        Effect.provide(
          BunRedis.layer({
            url: `redis://${dragonfly.getHost()}:${redisPort}`,
          }),
        ),
        Effect.timeout("5 seconds"),
      ),
    );
  });

  test("SIGINT shuts down an active Redis subscription without logging a defect", async () => {
    const url = `redis://${dragonfly.getHost()}:${redisPort}`;

    const child = Bun.spawn(
      [
        process.execPath,
        "--eval",
        `
          import { BunRedis, BunRuntime } from "@effect/platform-bun";
          import { Effect } from "effect";
          import { Redis } from "effect/unstable/persistence";
          BunRuntime.runMain(Effect.gen(function* () {
            const redis = yield* Redis.Redis;
            yield* redis.subscribe("shutdown:signal");
            console.log("subscribed");
            yield* Effect.never;
          }).pipe(Effect.scoped, Effect.provide(BunRedis.layer({ url: ${JSON.stringify(url)} }))));
        `,
      ],
      {
        cwd: `${import.meta.dirname}/..`,
        stdout: "pipe",
        stderr: "pipe",
        timeout: 5_000,
        killSignal: "SIGKILL",
      },
    );

    const reader = child.stdout.getReader();
    const errors = new Response(child.stderr).text();

    try {
      const ready = await reader.read();
      expect(new TextDecoder().decode(ready.value)).toContain("subscribed");
      child.kill("SIGINT");
      expect(await child.exited).toBe(130);
      expect(await errors).toBe("");
    } finally {
      reader.releaseLock();
      child.kill();
      await child.exited;
    }
  }, 10_000);

  test("unexpected subscriber disconnection still reaches the Redis error channel", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const redis = yield* Redis.Redis;
        const messages = yield* redis.subscribe("shutdown:disconnect");
        const clients = yield* redis.send<string>("CLIENT", "LIST");

        const subscriberAddress = clients
          .split("\n")
          .find((client) => /\bflags=P\b/.test(client))
          ?.match(/\baddr=(\S+)/)?.[1];

        if (!subscriberAddress)
          throw new Error("Subscriber connection not found");
        yield* redis.send("CLIENT", "KILL", subscriberAddress);
        const taken = yield* Effect.result(Queue.take(messages));
        expect(Result.isFailure(taken)).toBe(true);
        expect(
          Result.isFailure(taken) &&
            Predicate.isTagged("RedisError")(taken.failure),
        ).toBe(true);
      }).pipe(
        Effect.scoped,
        Effect.provide(
          BunRedis.layer({
            url: `redis://${dragonfly.getHost()}:${redisPort}`,
          }),
        ),
        Effect.timeout("5 seconds"),
      ),
    );
  });

  test("Dragonfly federates two Gateway instances and preserves map/air contracts", async () => {
    const configuration = makeConfiguration();

    const firstRuntime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://127.0.0.1:${redisPort}` }),
    );

    const secondRuntime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://127.0.0.1:${redisPort}` }),
    );

    const firstRedis = await firstRuntime.runPromise(Redis.Redis);
    const secondRedis = await secondRuntime.runPromise(Redis.Redis);
    const firstBackgroundFibers: Array<Fiber.Fiber<void, unknown>> = [];
    const secondBackgroundFibers: Array<Fiber.Fiber<void, unknown>> = [];

    const firstStore = new RedisGatewayStore(
      firstRedis,
      {
        ...configuration.redis,
        password: Redacted.value(configuration.redis.password),
      },
      (effect) => firstRuntime.runPromise(effect),
      (_label, effect) => {
        firstBackgroundFibers.push(firstRuntime.runFork(effect));
      },
    );

    const secondStore = new RedisGatewayStore(
      secondRedis,
      {
        ...configuration.redis,
        password: Redacted.value(configuration.redis.password),
      },
      (effect) => secondRuntime.runPromise(effect),
      (_label, effect) => {
        secondBackgroundFibers.push(secondRuntime.runFork(effect));
      },
    );

    await Promise.all([firstStore.connect(), secondStore.connect()]);

    try {
      await firstStore.command.flushdb();
      const firstHub = new RealtimeHub(configuration, firstStore);
      const secondHub = new RealtimeHub(configuration, secondStore);
      await secondRuntime.runPromise(secondHub.start());
      const source = makeSocket("source");
      const recipient = makeSocket("recipient");
      firstHub.register(source.socket);
      secondHub.register(recipient.socket);
      const visibleFeed = makeSocket("visible-feed");
      const hiddenFeed = makeSocket("hidden-feed");

      for (const target of [visibleFeed, hiddenFeed]) {
        Object.assign(target.socket.data, {
          platform: "web-app",
          supportsFeed: true,
        });
        target.socket.data.guilds = [
          {
            guild: { id: "organization-1", ownerId: "other-owner" },
            roles: [
              {
                id: "feed-role",
                lvlRangeFrom: 0,
                lvlRangeTo: target === visibleFeed ? 500 : 99,
                permissions: [
                  Permission.LOOTLOG_LOOTS_READ,
                  Permission.LOOTLOG_LOOTS_HEROES_READ,
                ],
              },
            ],
          },
        ];
        secondHub.register(target.socket);
        secondHub.subscribe(target.socket, {
          topic: "organization.loots",
          organizationId: "organization-1",
        });
      }

      await firstHub.publishToScope(
        { topic: "organization.loots", organizationId: "organization-1" },
        { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
        "persisted-kill-1",
        {
          recipientPlatform: "web-app",
          sourceNpcs: [{ level: 100, type: "HERO" }],
        },
      );
      await waitFor(() => visibleFeed.frames.length === 1);
      expect(hiddenFeed.frames).toHaveLength(0);
      expect(decodeRealtimeFrame(visibleFeed.frames[0]!)).toEqual({
        v: 1,
        type: "kills.changed",
        data: { guildId: "organization-1" },
      });

      const timerTargets = [firstHub, secondHub].flatMap((hub, index) =>
        [false, true].map((allowed) => {
          const target = makeSocket(`timer-${index}-${allowed}`);
          target.socket.data.guilds = [
            {
              guild: { id: "organization-1", ownerId: "owner" },
              roles: [
                {
                  id: "timer-role",
                  lvlRangeFrom: 200,
                  lvlRangeTo: 500,
                  permissions: allowed
                    ? [
                        Permission.LOOTLOG_TIMERS_READ,
                        Permission.LOOTLOG_TIMERS_TITANS_READ,
                      ]
                    : [Permission.LOOTLOG_TIMERS_READ],
                },
                {
                  id: "empty",
                  lvlRangeFrom: 0,
                  lvlRangeTo: 500,
                  permissions: [],
                },
              ],
            },
          ];
          hub.register(target.socket);
          hub.subscribe(target.socket, {
            topic: "organization.timers",
            organizationId: "organization-1",
          });

          return { ...target, allowed };
        }),
      );

      await firstHub.publishToScope(
        { topic: "organization.timers", organizationId: "organization-1" },
        {
          v: 1,
          type: "timer.created",
          data: {
            organizationId: "organization-1",
            payload: {
              guildId: "organization-1",
              npc: { type: "TITAN", lvl: 250 },
            },
          },
        },
      );
      await firstHub.publishToScope(
        { topic: "organization.timers", organizationId: "organization-1" },
        {
          v: 1,
          type: "timer.deleted",
          data: {
            organizationId: "organization-1",
            payload: {
              guildId: "organization-1",
              routing: { tier: "titans", npcLevel: 250 },
            },
          },
        },
      );
      await waitFor(() =>
        timerTargets
          .filter((target) => target.allowed)
          .every((target) => target.frames.length === 2),
      );

      for (const target of timerTargets.filter((target) => !target.allowed))
        expect(target.frames).toHaveLength(0);
      // Even full tier grants do not authorize an out-of-range timer.
      await firstHub.publishToScope(
        { topic: "organization.timers", organizationId: "organization-1" },
        {
          v: 1,
          type: "timer.created",
          data: {
            organizationId: "organization-1",
            payload: {
              guildId: "organization-1",
              npc: { type: "TITAN", lvl: 105 },
            },
          },
        },
      );
      await firstHub.publishToScope(
        { topic: "organization.timers", organizationId: "organization-1" },
        {
          v: 1,
          type: "timer.created",
          data: {
            organizationId: "organization-1",
            payload: {
              guildId: "organization-1",
              npc: { type: "TITAN", lvl: 500 },
            },
          },
        },
      );
      await waitFor(() =>
        timerTargets
          .filter((target) => target.allowed)
          .every((target) => target.frames.length === 3),
      );

      for (const target of timerTargets.filter((target) => !target.allowed))
        expect(target.frames).toHaveLength(0);

      for (const organizationId of ["organization-1", "organization-2"]) {
        secondHub.subscribe(recipient.socket, {
          topic: "map.pings",
          organizationId,
          world: "classic",
          mapId: 7,
        });
      }

      const mapPings = new MapPingService(firstStore, firstHub);

      for (let index = 0; index < 5; index += 1) {
        await expect(
          mapPings.send(source.socket, {
            expectedMapId: 7,
            type: "enemy",
            x: index,
            y: index,
          }),
        ).resolves.toMatchObject({ status: "accepted" });
      }

      await expect(
        mapPings.send(source.socket, {
          expectedMapId: 7,
          type: "enemy",
          x: 6,
          y: 6,
        }),
      ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });
      await waitFor(
        () => eventsOfType(recipient.frames, "map-ping.received").length >= 5,
      );
      expect(eventsOfType(source.frames, "map-ping.received")).toHaveLength(0);
      expect(eventsOfType(recipient.frames, "map-ping.received")).toHaveLength(
        5,
      );

      await firstStore.command.set(
        "air-tag:disabled:organization-2:classic",
        "1",
      );
      const sourceAirTags = new AirTagService(firstStore, firstHub);
      const recipientAirTags = new AirTagService(secondStore, secondHub);
      await sourceAirTags.updateSubscription(source.socket, {
        requestId: "source-subscription",
        enabled: true,
        expectedMapId: 7,
      });
      await recipientAirTags.updateSubscription(recipient.socket, {
        requestId: "recipient-subscription",
        enabled: true,
        expectedMapId: 7,
      });

      const observation = {
        targetId: "target-1",
        nickname: "Enemy",
        relation: 3 as const,
        x: 10,
        y: 11,
      };

      await expect(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation, { ...observation, x: 12 }],
        }),
      ).resolves.toEqual({
        status: "accepted",
        acceptedScopes: 1,
        acceptedTargets: 1,
      });
      await waitFor(
        () => eventsOfType(recipient.frames, "air-tag.updated").length === 1,
      );
      expect(eventsOfType(source.frames, "air-tag.updated")).toHaveLength(0);

      const reconnected = makeSocket("reconnected");
      secondHub.register(reconnected.socket);

      const rejoined = await recipientAirTags.updateSubscription(
        reconnected.socket,
        {
          requestId: "reconnected-subscription",
          enabled: true,
          expectedMapId: 7,
        },
      );

      expect(rejoined).toMatchObject({
        status: "accepted",
        scopes: [{ targets: [{ targetId: "target-1", x: 12 }] }],
      });

      for (let index = 0; index < 14; index += 1) {
        const acknowledgement = await sourceAirTags.publishObservations(
          source.socket,
          { expectedMapId: 7, observations: [observation] },
        );

        expect(acknowledgement).toMatchObject({ status: "accepted" });
      }

      await expect(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation],
        }),
      ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });

      await Bun.sleep(10_100);
      const afterExpiry = makeSocket("after-expiry");

      const expiredSnapshot = await recipientAirTags.updateSubscription(
        afterExpiry.socket,
        {
          requestId: "expired-subscription",
          enabled: true,
          expectedMapId: 7,
        },
      );

      expect(expiredSnapshot).toMatchObject({
        status: "accepted",
        scopes: [{ targets: [] }],
      });
    } finally {
      await Promise.all([firstStore.close(), secondStore.close()]);
    }
  }, 20_000);
});
