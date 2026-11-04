import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { RedisClient } from "bun";
import { slidingWindowRateLimitScript } from "@lootlog/database/sliding-window-rate-limit";
import { BunRedis } from "@effect/platform-bun";
import {
  decodeRealtimeFrame,
  tryDecodeRealtimeFrameValue,
} from "@lootlog/protocol/realtime/codec";
import { Permission } from "@lootlog/schema/permissions";
import {
  Effect,
  Fiber,
  ManagedRuntime,
  Metric,
  Queue,
  Redacted,
  Result,
  Schedule,
} from "effect";
import { Redis } from "effect/persistence";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import {
  decodeFederatedRealtimeMessage,
  type RedisGatewayCommands,
  type RedisScriptReply,
  RedisGatewayStore,
} from "#src/platform/redis-store";
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
import { BattlePingService } from "#src/realtime/battle-ping-service";
import { NpcPresenceService } from "#src/realtime/npc-presence-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { makeGuildStore } from "#src/guilds/guild-store";
import { CACHE_TTL, getUserGuildsCacheKey } from "#src/guilds/cache-keys";
import { httpClientFromResponses } from "./http-fixtures.js";
import { membership } from "./realtime-fixtures.js";

let dragonfly: StartedTestContainer;

let redisPort: number;

const redisUrl = () => `redis://${dragonfly.getHost()}:${redisPort}`;

const uniquePrefix = () => `realtime-integration:${crypto.randomUUID()}`;

const makeConfiguration = (keyPrefix = uniquePrefix()) =>
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
      keyPrefix,
    },
    maxBackpressureBytes: 1_048_576,
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

const locationReadGuilds = guilds.map((entry) => ({
  ...entry,
  roles: entry.roles.map((role) => ({
    ...role,
    permissions: [
      ...role.permissions,
      Permission.LOOTLOG_PRESENCE_LOCATION_READ,
    ],
  })),
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
});

const makeSocket = (connectionId: string) => {
  const frames: string[] = [];

  const socket = {
    data: makeSession(connectionId),
    getBufferedAmount: () => 0,
    send: (text: string) => {
      frames.push(text);

      return text.length;
    },
    close: () => undefined,
  };

  return { socket, frames };
};

/**
 * A game connection with a character that has not published presence yet.
 * Connections sharing `user` and `character` play the same character.
 */
const gameSocket = (
  connectionId: string,
  {
    memberships = guilds,
    user,
    character,
  }: {
    readonly memberships?: SessionData["guilds"];
    readonly user?: string;
    readonly character?: string;
  } = {},
) => {
  const { socket } = makeSocket(connectionId);
  const playing = socket.data.presence?.character;

  socket.data = {
    ...socket.data,
    guilds: memberships,
    ...(user && { userId: `user-${user}`, discordId: `discord-${user}` }),
    character: playing && {
      ...playing,
      ...(character && { characterId: `character-${character}` }),
    },
    presence: undefined,
  };

  return socket;
};

/** A web session following the Organization's loot feed up to `lvlRangeTo`. */
const feedSocket = (connectionId: string, lvlRangeTo = 500) => {
  const target = makeSocket(connectionId);

  target.socket.data = {
    ...target.socket.data,
    platform: "web-app",
    guilds: [
      membership(
        "organization-1",
        [Permission.LOOTLOG_LOOTS_READ, Permission.LOOTLOG_LOOTS_HEROES_READ],
        { ownerId: "other-owner", roleId: "feed-role", lvlRangeTo },
      ),
    ],
  };

  return target;
};

const lootFeed = {
  topic: "organization.loots",
  organizationId: "organization-1",
} as const;

const OFFLINE_DUE_INDEX = "presence:offline:due";

const dueDepartures = (store: RedisGatewayStore) =>
  store.command.eval<string[]>(
    "return redis.call('ZRANGE', KEYS[1], 0, -1)",
    1,
    OFFLINE_DUE_INDEX,
  );

const addDueDepartures = (store: RedisGatewayStore, ...keys: string[]) =>
  store.command.eval(
    "for _, member in ipairs(ARGV) do redis.call('ZADD', KEYS[1], 0, member) end return 1",
    1,
    OFFLINE_DUE_INDEX,
    ...keys,
  );

// Publishes to every Lootlog of the session, as a client whose character catches for all of them.
const joinedOrganizations = (target: GatewaySocket) =>
  target.data.guilds.map(({ guild }) => guild.id);

const setSocketPresence = (
  socket: GatewaySocket,
  presence: SessionData["presence"],
) => {
  socket.data.presence = presence;
};

type OpenStore = {
  readonly store: RedisGatewayStore;
  readonly redis: Redis.Redis["Service"];
  readonly runtime: ManagedRuntime.ManagedRuntime<Redis.Redis, never>;
  readonly [Symbol.asyncDispose]: () => Promise<void>;
};

/**
 * A Gateway store on its own Redis connection. Disposal interrupts the
 * background work it started, such as federation subscriptions.
 */
const openStore = async (keyPrefix = uniquePrefix()): Promise<OpenStore> => {
  const runtime = ManagedRuntime.make(BunRedis.layer({ url: redisUrl() }));
  const background: Array<Fiber.Fiber<void, unknown>> = [];
  const redis = await runtime.runPromise(Redis.Redis);

  const store = new RedisGatewayStore(
    redis,
    { ...makeConfiguration(keyPrefix).redis, password: "" },
    (effect) => runtime.runPromise(effect),
    (_label, effect) => {
      background.push(runtime.runFork(effect));
    },
  );

  return {
    store,
    redis,
    runtime,
    [Symbol.asyncDispose]: async () => {
      await Effect.runPromise(Fiber.interruptAll(background));
      await runtime.dispose();
    },
  };
};

/** A started Gateway instance; instances sharing a key prefix federate. */
const startFederatedInstance = async (configuration: GatewayConfiguration) => {
  const instance = await openStore(configuration.redis.keyPrefix);
  const hub = new RealtimeHub(configuration, instance.store);

  await instance.runtime.runPromise(hub.start());

  return { ...instance, hub };
};

/** Two federated instances whose air tags reach only organization-1. */
const startAirTagInstances = async () => {
  const configuration = makeConfiguration();
  const first = await startFederatedInstance(configuration);
  const second = await startFederatedInstance(configuration);

  await first.store.command.set("air-tag:disabled:organization-2:classic", "1");

  return {
    first,
    second,
    sourceAirTags: new AirTagService(first.store, first.hub),
    recipientAirTags: new AirTagService(second.store, second.hub),
    [Symbol.asyncDispose]: async () => {
      await second[Symbol.asyncDispose]();
      await first[Symbol.asyncDispose]();
    },
  };
};

/** A publisher that records events, or fails while `fail` is set. */
const recorder = <E>() => {
  const events: E[] = [];

  const recording = {
    events,
    fail: false,
    publish: (event: E) =>
      Effect.suspend(() => {
        if (recording.fail) return Effect.fail(new Error("Rabbit unavailable"));
        recording.events.push(event);

        return Effect.void;
      }),
  };

  return recording;
};

const presenceHub = (
  publishPresence: RealtimeHub["publishPresence"] = async () => {},
) => ({
  setPresence: setSocketPresence,
  publishPresence,
});

type PresenceStoreArguments = ConstructorParameters<typeof PresenceStore>;

const presenceStore = ({
  redis,
  hub = presenceHub(),
  now = Date.now,
  publishOffline,
}: {
  readonly redis: PresenceStoreArguments[0];
  readonly hub?: PresenceStoreArguments[1];
  readonly now?: () => number;
  readonly publishOffline?: PresenceStoreArguments[5];
}) => new PresenceStore(redis, hub, now, undefined, undefined, publishOffline);

type ScriptHook = () => Promise<void>;

type ScriptInterception = {
  before?: ScriptHook;
  after?: ScriptHook;
  readonly results: number[];
  readonly command: RedisGatewayCommands;
};

/**
 * Records the results of one tagged Lua script. A hook set on the
 * interception runs around the next call of that script only.
 */
const interceptScript = (
  command: RedisGatewayCommands,
  tag: `-- presence:${string}`,
): ScriptInterception => {
  const interception: ScriptInterception = {
    results: [],
    command: {
      ...command,
      eval: async <A>(
        script: string,
        keyCount: number,
        ...args: ReadonlyArray<string | number>
      ): Promise<A> => {
        if (!script.includes(tag))
          return command.eval<A>(script, keyCount, ...args);

        const { before, after } = interception;

        interception.before = undefined;
        interception.after = undefined;
        await before?.();

        const result = await command.eval<A>(script, keyCount, ...args);

        interception.results.push(Number(result));
        await after?.();

        return result;
      },
    },
  };

  return interception;
};

const connect = async (
  presence: PresenceStore,
  ...sockets: GatewaySocket[]
) => {
  for (const socket of sockets)
    await Effect.runPromise(
      presence.publish(socket, {
        organizationIds: joinedOrganizations(socket),
      }),
    );
};

const depart = async (presence: PresenceStore, ...sockets: GatewaySocket[]) => {
  for (const socket of sockets)
    await Effect.runPromise(presence.disconnect(socket.data));
};

const departure = (
  name: string,
  disconnectedAt: number,
): GameCharacterOffline => ({
  userId: `user-${name}`,
  discordId: `discord-${name}`,
  characterId: `character-${name}`,
  world: "classic",
  organizationIds: ["organization-1"],
  disconnectedAt,
});

const OFFLINE_OUTBOX_INDEX = "presence:offline:outbox";

const OFFLINE_SWEEP_LOCK = "presence:offline:sweep-lock";

/** Hands the offline sweep lease to another replica. */
const takeOverOfflineSweep = async (store: RedisGatewayStore) => {
  await store.command.set(OFFLINE_SWEEP_LOCK, "successor", "PX", 30_000);
};

const clanEnemyFields = ({
  targetId,
  nickname,
  clan,
  lvl,
  prof,
}: {
  targetId: string;
  nickname: string;
  clan: { id: number; name: string };
  lvl: number;
  prof: string;
}) => ({ targetId, nickname, clan, lvl, prof });

const observation = {
  targetId: "target-1",
  nickname: "Enemy",
  relation: 3 as const,
  x: 10,
  y: 11,
};

const clanEnemy = {
  targetId: "clan-enemy",
  nickname: "Rival",
  clan: { id: 5, name: "Rivals" },
  relation: 6 as const,
  x: 3,
  y: 4,
  lvl: 250,
  prof: "m",
  stasis: true,
};

/** Revision of a federated `air-tag.scope-updated` frame for `mapId`. */
const federatedAirTagRevision = (
  raw: string,
  mapId: number,
): number | undefined => {
  const { event } = decodeFederatedRealtimeMessage(raw);

  if (event === undefined) return undefined;
  const decoded = Result.getOrThrow(tryDecodeRealtimeFrameValue(event));

  return "type" in decoded &&
    decoded.type === "air-tag.scope-updated" &&
    decoded.data.mapId === mapId
    ? decoded.data.revision
    : undefined;
};

const moveAirTagSocket = (
  socket: GatewaySocket,
  location: { mapId: number; map: string },
) => {
  const presence = socket.data.presence;

  if (!presence) throw new Error("Missing air tag presence");
  setSocketPresence(socket, { ...presence, location });
};

/** A web or game session on `location` that may read precise locations. */
const threatWatcher = (connectionId: string, readsLocation = true) => {
  const target = makeSocket(connectionId);

  if (readsLocation) target.socket.data.guilds = locationReadGuilds;
  moveAirTagSocket(target.socket, { mapId: 8, map: "Karka-han" });

  return target;
};

type RealtimeFrame = ReturnType<typeof decodeRealtimeFrame>;

const eventsOfType = <T extends string>(
  frames: ReadonlyArray<string>,
  type: T,
) => {
  const isType = (
    decoded: RealtimeFrame,
  ): decoded is Extract<RealtimeFrame, { type: T }> =>
    "type" in decoded && decoded.type === type;

  return frames.flatMap((frame) => {
    const decoded = decodeRealtimeFrame(frame);

    return isType(decoded) ? [decoded] : [];
  });
};

const waitFor = async (
  predicate: () => boolean | Promise<boolean>,
  timeoutMs = 2_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (!(await predicate())) {
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

        // A stale projection is served at once and refreshed in the background,
        // so the obsolete commit is awaited before the cache is read.
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

        // A projection read before the invalidation carries the authority of a
        // session that joined then; a join that waited gets current access.
        // The obsolete response itself is never accepted.
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
    await Effect.runPromise(presence.flushDeltas());

    const updated = await snapshot();

    expect(updated.presences).toEqual([
      expect.objectContaining({ location: moved }),
    ]);
    expect(updated.revision).toBeGreaterThan(published.revision);
    await depart(presence, source);
    await Effect.runPromise(presence.flushDeltas());

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
    // Who plays where differs from who follows which channel.
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
    // The second replica sampled before the first one reported its listeners.
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

  test("offline claims serialize with reconnect and retain expired-session delivery through a restart", async () => {
    await using redis = await openStore();
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const claims = interceptScript(
      redis.store.command,
      "-- presence:offline-claim",
    );

    const makePresence = () =>
      presenceStore({
        redis: { command: claims.command },
        now: () => now,
        publishOffline: offline.publish,
      });

    let presence = makePresence();
    const game = gameSocket("offline");
    await connect(presence, game);
    await depart(presence, game);
    now += 10_000;
    claims.before = () => connect(presence, game);

    await Effect.runPromise(presence.sweepOffline());
    expect(claims.results).toHaveLength(1);
    expect(offline.events).toEqual([]);
    // The reconnect leaves no cancelled departure in the character index.
    expect(
      await redis.store.command.smembers(
        `presence:offline:character:${JSON.stringify([game.data.userId, game.data.character?.world, game.data.character?.characterId])}`,
      ),
    ).toEqual([]);

    // Redis TTL can elapse while the gateway is down; metadata must retain identity.
    for (const { guild } of game.data.guilds)
      await redis.store.command.del(
        `presence:${guild.id}:${game.data.connectionId}`,
      );
    now += PRESENCE_EXPIRY_MS + 10_000;
    presence = makePresence();
    await Effect.runPromise(presence.sweepExpired());
    offline.fail = true;
    await Effect.runPromise(presence.sweepOffline().pipe(Effect.flip));
    presence = makePresence();
    offline.fail = false;
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toHaveLength(1);
    expect(offline.events[0]?.characterId).toBe(
      game.data.character?.characterId,
    );
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toHaveLength(1);
  });

  test("offline decisions reread a later Organization group after a reconnect delayed by publication", async () => {
    await using redis = await openStore();
    const reconnectStored = Promise.withResolvers<void>();
    const resumeReconnect = Promise.withResolvers<void>();
    let reconnecting: Promise<unknown> | undefined;

    try {
      let now = Date.now();
      let pauseReconnect = false;
      const offline = recorder<GameCharacterOffline>();

      const claims = interceptScript(
        redis.store.command,
        "-- presence:offline-claim",
      );

      const command = {
        ...claims.command,
        // Reconnect cancellation starts by listing the character's departures.
        smembers: async (key: string) => {
          if (pauseReconnect && key.startsWith("presence:offline:character:")) {
            pauseReconnect = false;
            reconnectStored.resolve();
            await resumeReconnect.promise;
          }

          return redis.store.command.smembers(key);
        },
      };

      const presence = presenceStore({
        redis: { command },
        now: () => now,
        publishOffline: offline.publish,
      });

      const first = gameSocket("group-first", {
        memberships: guilds.slice(0, 1),
      });

      const second = gameSocket("group-second");

      for (const socket of [first, second]) {
        await connect(presence, socket);
        await depart(presence, socket);
      }

      now += 10_000;
      const pending = await dueDepartures(redis.store);

      const firstKey = pending.find((key) =>
        key.includes('"user-group-first"'),
      );

      const secondKey = pending.find((key) =>
        key.includes('"user-group-second"'),
      );

      if (!firstKey || !secondKey)
        throw new Error("Missing pending departures");
      // Equal due scores sort by member, so the first user's group is claimed
      // first. Both groups overlap organization-1. Its first snapshot must not
      // be reused after another group's claim waits on network I/O.
      claims.after = async () => {
        pauseReconnect = true;
        reconnecting = connect(presence, second);
        await reconnectStored.promise;
        expect(
          await redis.store.command.get("presence:organization-1:group-second"),
        ).not.toBeNull();
        // Cancellation is still blocked, so the reconnect has not removed this
        // exact pending value yet.
        expect(await redis.store.command.get(secondKey)).not.toBeNull();
      };

      await Effect.runPromise(presence.sweepOffline());
      expect(offline.events.map((event) => event.userId)).toEqual([
        first.data.userId,
      ]);
      expect(await dueDepartures(redis.store)).toEqual([]);
      expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual(
        [],
      );
    } finally {
      resumeReconnect.resolve();
      await reconnecting;
    }
  });

  test("offline grouped claims preserve replacement departures and reconnect cancellation for each character", async () => {
    await using redis = await openStore();
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const claims = interceptScript(
      redis.store.command,
      "-- presence:offline-claim",
    );

    const presence = presenceStore({
      redis: { command: claims.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const departed = gameSocket("departed");
    const reconnected = gameSocket("reconnected");

    const replacement = gameSocket("replacement", {
      memberships: [...guilds].reverse(),
    });

    for (const socket of [departed, reconnected, replacement]) {
      await connect(presence, socket);
      await depart(presence, socket);
    }

    now += 10_000;
    const pending = await dueDepartures(redis.store);

    const replacementKey = pending.find((key) =>
      key.includes('"user-replacement"'),
    );

    if (!replacementKey) throw new Error("Missing replacement departure");

    claims.before = async () => {
      await connect(presence, reconnected);
      // A brief reconnect replaces the captured departure with a newer one.
      await connect(presence, replacement);
      await depart(presence, replacement);
    };

    // The old departure is already durable in the outbox. Returning online
    // starts a new period and must not erase its accepted publication.
    claims.after = () => connect(presence, departed);

    await Effect.runPromise(presence.sweepOffline());
    // One atomic decision for the group; only the unchanged departure completes.
    expect(claims.results).toEqual([1]);
    expect(offline.events.map((event) => event.userId)).toEqual([
      departed.data.userId,
    ]);
    expect(await redis.store.command.get(replacementKey)).toBeNull();
    expect(await dueDepartures(redis.store)).toEqual([
      expect.stringContaining('"user-replacement"'),
    ]);

    now += 10_000;
    await depart(presence, departed);
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events.map((event) => event.userId)).toEqual([
      departed.data.userId,
      replacement.data.userId,
    ]);
    now += 10_000;
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events.map((event) => event.userId)).toEqual([
      departed.data.userId,
      replacement.data.userId,
      departed.data.userId,
    ]);
  });

  test("a later exit of a character supersedes its pending departure and an earlier one cannot replace it", async () => {
    await using redis = await openStore();
    const start = Date.now();
    let now = start;
    const offline = recorder<GameCharacterOffline>();

    const presence = presenceStore({
      redis: redis.store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const lagging = presenceStore({
      redis: redis.store,
      now: () => now - 5_000,
      publishOffline: offline.publish,
    });

    const [firstTab, secondTab, laggingTab] = [
      "first-tab",
      "second-tab",
      "lagging-tab",
    ].map((id) => gameSocket(id, { user: "player", character: "hero" }));

    if (!firstTab || !secondTab || !laggingTab)
      throw new Error("Missing game tabs");
    await connect(presence, firstTab, secondTab);
    await connect(lagging, laggingTab);
    await depart(presence, firstTab);
    now += 5_000;
    await depart(presence, secondTab);
    // A replica whose clock lags reports an exit older than the pending one.
    await depart(lagging, laggingTab);
    expect(await dueDepartures(redis.store)).toHaveLength(1);

    now = start + 10_000;
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([]);

    now = start + 15_000;
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([
      expect.objectContaining({
        userId: "user-player",
        disconnectedAt: start + 5_000,
      }),
    ]);
  });

  test("heartbeats repair a lost Organization index and preserve the final observed expiry time", async () => {
    await using redis = await openStore();
    const { store } = redis;
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const presence = presenceStore({
      redis: store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const game = gameSocket("heartbeat");
    await connect(presence, game);

    await store.command.del("presence:index:organization-1");
    now += 25_000;
    await Effect.runPromise(presence.heartbeat(game, game.data.connectionId));
    expect(
      await store.command.smembers("presence:index:organization-1"),
    ).toContain("presence:organization-1:heartbeat");
    expect(
      (await Effect.runPromise(presence.snapshot(game.data, "organization-1")))
        .presences[0]?.lastSeen,
    ).toBe(now);

    // A full Redis loss must be recoverable without another presence.publish.
    await store.command.flushdb();
    now += 25_000;
    await Effect.runPromise(presence.heartbeat(game, game.data.connectionId));
    expect(
      (await Effect.runPromise(presence.snapshot(game.data, "organization-1")))
        .presences,
    ).toHaveLength(1);
    const lastSeen = now;

    for (const { guild } of guilds)
      await store.command.del(`presence:${guild.id}:heartbeat`);
    now += PRESENCE_EXPIRY_MS + 10_000;
    await Effect.runPromise(presence.sweepExpired());
    expect(
      await store.command.smembers("presence:index:organization-1"),
    ).toEqual([]);
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([
      expect.objectContaining({
        disconnectedAt: lastSeen + PRESENCE_EXPIRY_MS,
      }),
    ]);
  });

  test("an idle expiry sweep reads no payloads and a burst expires in bounded reads", async () => {
    await using redis = await openStore();
    let now = Date.now();
    let removed = 0;
    const payloadReads: number[] = [];

    const presence = presenceStore({
      redis: {
        command: {
          ...redis.store.command,
          mget: (keys) => {
            payloadReads.push(keys.length);

            return redis.store.command.mget(keys);
          },
        },
      },
      hub: presenceHub(async (...[, event]) => {
        if (event.type === "presence.delta")
          removed += event.data.changes.filter(
            ({ action }) => action === "remove",
          ).length;
      }),
      now: () => now,
    });

    const sweep = async () => {
      await Effect.runPromise(presence.sweepExpired());
      await Effect.runPromise(presence.flushDeltas());
    };

    for (let index = 0; index < 205; index++)
      await connect(
        presence,
        gameSocket(`burst-${index}`, { memberships: guilds.slice(0, 1) }),
      );

    await Effect.runPromise(presence.flushDeltas());
    await sweep();
    expect(payloadReads).toEqual([]);
    expect(removed).toBe(0);

    now += PRESENCE_EXPIRY_MS;
    await sweep();
    expect(payloadReads.length).toBeGreaterThan(0);
    expect(Math.max(...payloadReads)).toBeLessThanOrEqual(200);
    expect(removed).toBe(205);
    expect(
      (
        await Effect.runPromise(
          presence.snapshot(makeSession("burst-viewer"), "organization-1"),
        )
      ).presences,
    ).toEqual([]);

    await sweep();
    expect(removed).toBe(205);
  });

  test("an expired session's departure replaces an older pending exit of the same character", async () => {
    await using redis = await openStore();
    const start = Date.now();
    let now = start;
    const offline = recorder<GameCharacterOffline>();

    const presence = presenceStore({
      redis: redis.store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const abandoned = gameSocket("abandoned", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    const exited = gameSocket("exited", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    await connect(presence, abandoned, exited);
    now += 1_000;
    await depart(presence, exited);

    const [olderExit] = await dueDepartures(redis.store);

    if (!olderExit) throw new Error("Missing pending exit");

    now = start + PRESENCE_EXPIRY_MS;
    await Effect.runPromise(presence.sweepExpired());
    expect(await redis.store.command.get(olderExit)).toBeNull();
    const departures = await dueDepartures(redis.store);

    expect(departures).toHaveLength(1);
    expect(departures).not.toContain(olderExit);

    // The older exit's grace already ended; only the expiry departure remains.
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([]);

    now += 10_000;
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([
      expect.objectContaining({
        userId: "user-player",
        disconnectedAt: start + PRESENCE_EXPIRY_MS,
      }),
    ]);
  });

  test("an expiry captured before another exit of its character is scheduled retries instead of adding a second departure", async () => {
    await using redis = await openStore();
    const start = Date.now();
    let now = start;
    const offline = recorder<GameCharacterOffline>();

    const removals = interceptScript(
      redis.store.command,
      "-- presence:expiry-remove",
    );

    const presence = presenceStore({
      redis: { command: removals.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const abandoned = gameSocket("abandoned", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    const active = gameSocket("active", {
      memberships: guilds.slice(0, 1),
      user: "player",
      character: "hero",
    });

    await connect(presence, abandoned, active);
    now = start + PRESENCE_EXPIRY_MS;
    await Effect.runPromise(
      presence.heartbeat(active, active.data.connectionId),
    );

    removals.before = async () => {
      now += 1_000;
      await depart(presence, active);
    };

    await Effect.runPromise(presence.sweepExpired());
    expect(removals.results).toEqual([0]);
    expect(await dueDepartures(redis.store)).toHaveLength(1);

    await Effect.runPromise(presence.sweepExpired());
    expect(removals.results).toEqual([0, 1]);
    expect(await dueDepartures(redis.store)).toHaveLength(1);

    now += 10_000;
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([
      expect.objectContaining({
        userId: "user-player",
        disconnectedAt: start + PRESENCE_EXPIRY_MS + 1_000,
      }),
    ]);
  });

  test("two expiry replicas retain a session refreshed after candidate capture", async () => {
    const keyPrefix = uniquePrefix();
    await using firstRedis = await openStore(keyPrefix);
    await using secondRedis = await openStore(keyPrefix);
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();
    let removed = 0;
    const game = gameSocket("expiry-race", { memberships: guilds.slice(0, 1) });
    const organizationId = "organization-1";
    const key = `presence:${organizationId}:${game.data.connectionId}`;
    const metadataKey = `presence:metadata:${organizationId}:${game.data.connectionId}`;
    const dueMember = JSON.stringify([organizationId, game.data.connectionId]);

    const hub = () =>
      presenceHub(async (...[, event]) => {
        if (
          event.type === "presence.delta" &&
          event.data.changes.some(({ action }) => action === "remove")
        )
          removed++;
      });

    const removals = interceptScript(
      firstRedis.store.command,
      "-- presence:expiry-remove",
    );

    const first = presenceStore({
      redis: { command: removals.command },
      hub: hub(),
      now: () => now,
      publishOffline: offline.publish,
    });

    const second = presenceStore({
      redis: secondRedis.store,
      hub: hub(),
      now: () => now,
      publishOffline: offline.publish,
    });

    const flushBoth = () =>
      Effect.runPromise(
        Effect.all([first.flushDeltas(), second.flushDeltas()]),
      );

    await connect(first, game);
    await flushBoth();
    now += PRESENCE_EXPIRY_MS;

    removals.before = async () => {
      // Another replica cannot claim the batch while the first holds its lease.
      await Effect.runPromise(second.sweepExpired());
      await Effect.runPromise(second.heartbeat(game, game.data.connectionId));
    };

    await Effect.runPromise(first.sweepExpired());
    await Effect.runPromise(second.sweepExpired());
    now += 10_000;
    await Effect.runPromise(second.sweepOffline());
    await flushBoth();
    expect(removals.results).toEqual([0]);
    expect(removed).toBe(0);
    expect(offline.events).toEqual([]);
    expect(
      (await Effect.runPromise(second.snapshot(game.data, organizationId)))
        .presences,
    ).toEqual([expect.objectContaining({ sessionId: "expiry-race" })]);
    expect(
      Number(
        await secondRedis.store.command.eval(
          "return redis.call('ZSCORE', KEYS[1], ARGV[1])",
          1,
          "presence:expiry:due",
          dueMember,
        ),
      ),
    ).toBe(now - 10_000 + PRESENCE_EXPIRY_MS);

    now += PRESENCE_EXPIRY_MS;
    await Effect.runPromise(second.sweepExpired());
    await Effect.runPromise(first.sweepExpired());
    await Effect.runPromise(first.sweepOffline());
    await flushBoth();
    expect(await firstRedis.store.command.get(key)).toBeNull();
    expect(await firstRedis.store.command.get(metadataKey)).toBeNull();
    expect(removed).toBe(1);
    expect(offline.events).toHaveLength(1);
    expect(offline.events[0]?.disconnectedAt).toBe(now - 10_000);
  });

  test("an expired sweeper lease cannot recreate a departure already delivered by its successor", async () => {
    await using redis = await openStore();
    const { store } = redis;
    let now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const successor = presenceStore({
      redis: store,
      now: () => now,
      publishOffline: offline.publish,
    });

    const game = gameSocket("lost-expiry-lease", {
      memberships: guilds.slice(0, 1),
    });

    await connect(successor, game);
    now += PRESENCE_EXPIRY_MS + 10_000;
    let transferred = false;

    const predecessor = presenceStore({
      redis: {
        command: {
          ...store.command,
          mget: async (keys) => {
            const values = await store.command.mget(keys);

            if (
              !transferred &&
              keys.includes("presence:organization-1:lost-expiry-lease")
            ) {
              transferred = true;
              await store.command.del("presence:expiry:sweep-lock");
              await Effect.runPromise(successor.sweepExpired());
              await Effect.runPromise(successor.sweepOffline());
              expect(offline.events).toHaveLength(1);
            }

            return values;
          },
        },
      },
      now: () => now,
      publishOffline: offline.publish,
    });

    await Effect.runPromise(predecessor.sweepExpired());
    await Effect.runPromise(successor.sweepOffline());
    expect(transferred).toBe(true);
    expect(offline.events).toHaveLength(1);
    expect(await dueDepartures(store)).toEqual([]);
  });

  test("offline sweeps share bounded Organization work, drain a backlog in bounded batches, and reject a lease lost during a read", async () => {
    await using redis = await openStore();
    const { store } = redis;
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();
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

    const makePresence = () =>
      presenceStore({
        redis: { command },
        now: () => now,
        publishOffline: offline.publish,
      });

    const presence = makePresence();
    await connect(presence, gameSocket("active"));
    const keys: string[] = [];

    for (let index = 0; index < 250; index++) {
      const key = `presence:offline:fixture:${index}`;
      keys.push(key);
      await store.command.set(
        key,
        JSON.stringify({
          ...departure(String(index), now - 10_000),
          userId: `departed-${index}`,
        }),
      );
    }

    await addDueDepartures(store, ...keys);
    const reusedSweep = presence.sweepOffline();
    const first = Effect.runPromise(reusedSweep);
    await readStarted.promise;
    await Effect.runPromise(makePresence().sweepOffline());
    expect(organizationReads).toBe(1);
    expect(offline.events).toHaveLength(0);
    // The old owner captured an offline observation before the reconnect.
    // Keep the successor's lease held until that stale owner attempts its claim,
    // so value comparison alone cannot hide a missing lease check.
    await takeOverOfflineSweep(store);
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
    await connect(presence, reconnected);
    pause = false;
    resumeRead.resolve();
    await first;
    expect(offline.events).toHaveLength(0);
    expect(await store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual([]);
    expect(await dueDepartures(store)).toHaveLength(250);
    expect(await store.command.get(OFFLINE_SWEEP_LOCK)).toBe("successor");
    await store.command.del(OFFLINE_SWEEP_LOCK);

    await store.command.set("malformed-due", '{"userId":"old-schema"}');
    await addDueDepartures(store, "malformed-due");
    await store.command.set("malformed-outbox", '{"userId":"old-schema"}');
    await store.command.sadd(OFFLINE_OUTBOX_INDEX, "malformed-outbox");

    for (let batch = 0; batch < 20 && offline.events.length < 249; batch++) {
      await Effect.runPromise(reusedSweep);
    }

    expect(offline.events).toHaveLength(249);
    expect(offline.events.some(({ userId }) => userId === "departed-0")).toBe(
      false,
    );
    expect(Math.max(...pendingBatchSizes)).toBeLessThanOrEqual(100);
    expect(organizationReads).toBeLessThan(10);
    expect(new Set(offline.events.map((event) => event.userId)).size).toBe(249);
    expect(await store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual([]);
    expect(await store.command.mget(keys)).toEqual(keys.map(() => null));

    expect(await dueDepartures(store)).toEqual([]);
    expect(
      await store.command.mget(["malformed-due", "malformed-outbox"]),
    ).toEqual([null, null]);
  });

  test("invalid-record cleanup keeps a departure rewritten after it was read", async () => {
    await using redis = await openStore();
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const drops = interceptScript(
      redis.store.command,
      "-- presence:offline-drop",
    );

    const presence = presenceStore({
      redis: { command: drops.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const key = "presence:offline:rewritten";
    const rewritten = departure("rewritten", now - 10_000);
    await redis.store.command.set(key, '{"userId":"old-schema"}');
    await addDueDepartures(redis.store, key);
    drops.before = async () => {
      await redis.store.command.set(key, JSON.stringify(rewritten));
    };

    await Effect.runPromise(presence.sweepOffline());
    expect(drops.results).toEqual([0]);
    expect(await redis.store.command.get(key)).toBe(JSON.stringify(rewritten));
    expect(await dueDepartures(redis.store)).toEqual([key]);
    expect(offline.events).toEqual([]);

    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([rewritten]);
    expect(await dueDepartures(redis.store)).toEqual([]);
  });

  test("an offline sweep that loses its lease before renewing it publishes no captured outbox record", async () => {
    await using redis = await openStore();
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const renewals = interceptScript(
      redis.store.command,
      "-- presence:offline-renew",
    );

    const presence = presenceStore({
      redis: { command: renewals.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const key = "presence:offline:captured";
    const captured = departure("captured", now - 10_000);
    await redis.store.command.set(key, JSON.stringify(captured));
    await redis.store.command.sadd(OFFLINE_OUTBOX_INDEX, key);

    renewals.before = () => takeOverOfflineSweep(redis.store);

    await Effect.runPromise(presence.sweepOffline());
    expect(renewals.results).toEqual([0]);
    expect(offline.events).toEqual([]);
    expect(await redis.store.command.get(key)).toBe(JSON.stringify(captured));
    expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual([
      key,
    ]);
    expect(await redis.store.command.get(OFFLINE_SWEEP_LOCK)).toBe("successor");

    await redis.store.command.del(OFFLINE_SWEEP_LOCK);
    await Effect.runPromise(presence.sweepOffline());
    expect(offline.events).toEqual([captured]);
    expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual(
      [],
    );
  });

  test("an offline sweep stops publishing once an acknowledgement finds its lease lost", async () => {
    await using redis = await openStore();
    const now = Date.now();
    const offline = recorder<GameCharacterOffline>();

    const acknowledgements = interceptScript(
      redis.store.command,
      "-- presence:offline-ack",
    );

    const presence = presenceStore({
      redis: { command: acknowledgements.command },
      now: () => now,
      publishOffline: offline.publish,
    });

    const keys = ["presence:offline:first", "presence:offline:second"];

    for (const [index, key] of keys.entries()) {
      await redis.store.command.set(
        key,
        JSON.stringify(departure(`outbox-${index}`, now - 10_000)),
      );
      await redis.store.command.sadd(OFFLINE_OUTBOX_INDEX, key);
    }

    acknowledgements.before = () => takeOverOfflineSweep(redis.store);

    await Effect.runPromise(presence.sweepOffline());
    expect(acknowledgements.results).toEqual([-1]);
    expect(offline.events).toHaveLength(1);
    expect(
      (await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toSorted(),
    ).toEqual(keys);
    expect(await redis.store.command.get(OFFLINE_SWEEP_LOCK)).toBe("successor");

    await redis.store.command.del(OFFLINE_SWEEP_LOCK);
    await Effect.runPromise(presence.sweepOffline());
    expect(new Set(offline.events.map(({ userId }) => userId))).toEqual(
      new Set(["user-outbox-0", "user-outbox-1"]),
    );
    expect(await redis.store.command.smembers(OFFLINE_OUTBOX_INDEX)).toEqual(
      [],
    );
  });

  test("online history survives publisher restart without counting gaps or web sessions", async () => {
    await using redis = await openStore();
    const { store } = redis;
    const start = Date.parse("2026-09-06T10:00:00Z");
    let now = start;
    const online = recorder<UserOnlineEventV1>();
    let history = new OnlineHistory(store.command, online.publish, () => now);
    const session = makeSession("online-one");
    session.character = session.presence?.character;

    const observeAt = async (seconds: number, final = false) => {
      now = start + seconds * 1000;
      await Effect.runPromise(history.observe(session, now, final));
    };

    const checkpoints = () =>
      online.events.filter((event) => event.type === "checkpoint");

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
    online.fail = true;
    await expect(Effect.runPromise(history.flush())).rejects.toThrow();
    history = new OnlineHistory(store.command, online.publish, () => now);
    online.fail = false;
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
  });

  test("online history drains a bounded backlog and preserves updates during delivery", async () => {
    await using redis = await openStore();
    const { store } = redis;
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
    expect(messages.filter((event) => event.type === "collector")).toHaveLength(
      1,
    );
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
  }, 30_000);

  test.each([
    { delay: 3000, failSecondBatch: true },
    { delay: 5000, failSecondBatch: false },
  ])(
    "online history refreshes batch leases and bounds slow drains (first delivery takes $delay ms, second batch fails: $failSecondBatch)",
    async ({ delay, failSecondBatch }) => {
      await using redis = await openStore();
      const start = Date.parse("2026-09-06T10:00:00Z");
      let now = start;
      const messages: UserOnlineEventV1[] = [];
      let fail = failSecondBatch;
      let attempts = 0;

      const history = new OnlineHistory(
        redis.store.command,
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
      // The failed second batch retains its complete 60-second lease, measured
      // from its own claim at 63 seconds, while unclaimed work can be drained.
      expect(checkpoints()).toHaveLength(failSecondBatch ? 150 : 250);
      now = start + 123_000;
      await Effect.runPromise(history.flush());
      expect(checkpoints()).toHaveLength(250);
      expect(new Set(checkpoints().map((event) => event.sessionId)).size).toBe(
        250,
      );
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
        Effect.provide(BunRedis.layer({ url: redisUrl() })),
        Effect.timeout("5 seconds"),
      ),
    );
  });

  test("SIGINT shuts down an active Redis subscription without logging a defect", async () => {
    const child = Bun.spawn(
      [
        process.execPath,
        "--eval",
        `
          import { BunRedis, BunRuntime } from "@effect/platform-bun";
          import { Effect } from "effect";
          import { Redis } from "effect/persistence";
          BunRuntime.runMain(Effect.gen(function* () {
            const redis = yield* Redis.Redis;
            yield* redis.subscribe("shutdown:signal");
            console.log("subscribed");
            yield* Effect.never;
          }).pipe(Effect.scoped, Effect.provide(BunRedis.layer({ url: ${JSON.stringify(redisUrl())} }))));
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

  test.each([
    { lostFrame: false, closed: false },
    { lostFrame: true, closed: true },
  ] as const)(
    "a dropped federation subscription closes sessions only when frames may be lost (lost frame: $lostFrame)",
    async ({ lostFrame, closed }) => {
      const configuration = makeConfiguration();
      await using control = await openStore(configuration.redis.keyPrefix);

      const subscriberAddresses = async () =>
        new Set(
          (
            await control.runtime.runPromise(
              control.redis.send<string>("CLIENT", "LIST"),
            )
          )
            .split("\n")
            .filter((client) => /\bflags=P\b/.test(client))
            .flatMap((client) => client.match(/\baddr=(\S+)/)?.[1] ?? []),
        );

      const follow = (hub: RealtimeHub, connectionId: string) => {
        const target = feedSocket(connectionId);
        const closes: Array<{ code?: number; reason?: string }> = [];

        target.socket.close = (code?: number) => {
          closes.push({ code, reason: hub.unavailableReason() });
        };

        hub.register(target.socket);
        hub.subscribe(target.socket, lootFeed);

        return { ...target, closes };
      };

      const publishKill = (hub: RealtimeHub) =>
        hub.publishToScope(
          lootFeed,
          { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
          crypto.randomUUID(),
          {
            recipientPlatform: "web-app",
            sourceNpcs: [{ level: 100, type: "HERO" }],
          },
        );

      const before = await subscriberAddresses();
      await using affected = await startFederatedInstance(configuration);

      const [affectedSubscriber] = [...(await subscriberAddresses())].filter(
        (address) => !before.has(address),
      );

      if (!affectedSubscriber)
        throw new Error("Affected subscriber connection not found");
      await using healthy = await startFederatedInstance(configuration);
      const stale = follow(affected.hub, "stale");
      await publishKill(healthy.hub);
      await waitFor(() => stale.frames.length === 1);

      // A frame numbered but never delivered stands for one published while
      // the subscriber was away.
      if (lostFrame)
        await control.runtime.runPromise(
          control.redis.send(
            "INCR",
            `${configuration.redis.keyPrefix}:realtime:federation:v1:sequence`,
          ),
        );
      const subscribed = (await subscriberAddresses()).size;
      await control.runtime.runPromise(
        control.redis.send("CLIENT", "KILL", affectedSubscriber),
      );

      if (closed) {
        await waitFor(() => stale.closes.length === 1, 5_000);
        // Readiness was withdrawn before the socket closed, so no session was admitted into the gap.
        expect(stale.closes).toEqual([
          { code: 1013, reason: "federation-unavailable" },
        ]);
        expect(affected.hub.getLocalSockets()).toEqual([]);
        expect(stale.socket.data.closing).toBe(true);
      }

      // CLIENT KILL returns before the instance notices, and a frame published
      // before it resubscribes is really lost: wait for the new subscriber.
      // Dragonfly may list a killed connection until its thread closes it.
      await waitFor(async () => {
        const addresses = await subscriberAddresses();

        return (
          !addresses.has(affectedSubscriber) && addresses.size >= subscribed
        );
      }, 5_000);
      await waitFor(
        () => affected.hub.unavailableReason() === undefined,
        5_000,
      );
      const current = follow(affected.hub, "current");
      await publishKill(healthy.hub);
      await waitFor(() => current.frames.length === 1);

      if (closed) {
        expect(stale.frames).toHaveLength(1);
        expect(stale.closes).toHaveLength(1);
      } else {
        await waitFor(() => stale.frames.length === 2);
        expect(stale.closes).toEqual([]);
      }
    },
  );

  test("federated loot and timer frames keep their routing through Dragonfly", async () => {
    const configuration = makeConfiguration();
    await using first = await startFederatedInstance(configuration);
    await using second = await startFederatedInstance(configuration);
    const visibleFeed = feedSocket("visible-feed");
    const hiddenFeed = feedSocket("hidden-feed", 99);

    for (const target of [visibleFeed, hiddenFeed]) {
      second.hub.register(target.socket);
      second.hub.subscribe(target.socket, lootFeed);
    }

    await first.hub.publishToScope(
      lootFeed,
      { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
      "persisted-kill-1",
      {
        recipientPlatform: "web-app",
        sourceNpcs: [{ level: 100, type: "HERO" }],
      },
    );
    await waitFor(() => visibleFeed.frames.length === 1);
    expect(hiddenFeed.frames).toHaveLength(0);
    expect(eventsOfType(visibleFeed.frames, "kills.changed")).toEqual([
      { v: 1, type: "kills.changed", data: { guildId: "organization-1" } },
    ]);

    const timers = {
      topic: "organization.timers",
      organizationId: "organization-1",
    } as const;

    const timerTargets = [first.hub, second.hub].flatMap((hub, index) =>
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
        hub.subscribe(target.socket, timers);

        return { ...target, allowed };
      }),
    );

    const titanCreated = (lvl: number) =>
      first.hub.publishToScope(timers, {
        v: 1,
        type: "timer.created",
        data: {
          organizationId: "organization-1",
          payload: { guildId: "organization-1", npc: { type: "TITAN", lvl } },
        },
      });

    const delivered = (count: number) =>
      waitFor(() =>
        timerTargets
          .filter((target) => target.allowed)
          .every((target) => target.frames.length === count),
      );

    await titanCreated(250);
    await first.hub.publishToScope(timers, {
      v: 1,
      type: "timer.deleted",
      data: {
        organizationId: "organization-1",
        payload: {
          guildId: "organization-1",
          routing: { tier: "titans", npcLevel: 250 },
        },
      },
    });
    await delivered(2);

    for (const target of timerTargets.filter((target) => !target.allowed))
      expect(target.frames).toHaveLength(0);
    // Even full tier grants do not authorize an out-of-range timer.
    await titanCreated(105);
    await titanCreated(500);
    await delivered(3);

    for (const target of timerTargets.filter((target) => !target.allowed))
      expect(target.frames).toHaveLength(0);
  });

  test("federated map pings share one budget and leave battle pings their own", async () => {
    const configuration = makeConfiguration();
    await using first = await startFederatedInstance(configuration);
    await using second = await startFederatedInstance(configuration);
    const source = makeSocket("source");
    const recipient = makeSocket("recipient");
    first.hub.register(source.socket);
    second.hub.register(recipient.socket);

    for (const organizationId of ["organization-1", "organization-2"]) {
      second.hub.subscribe(recipient.socket, {
        topic: "map.pings",
        organizationId,
        world: "classic",
        mapId: 7,
      });
    }

    const localWildcard = makeSocket("local-wildcard");
    const remoteWildcard = makeSocket("remote-wildcard");
    first.hub.register(localWildcard.socket);
    second.hub.register(remoteWildcard.socket);

    for (const { hub, target } of [
      { hub: first.hub, target: source },
      { hub: first.hub, target: localWildcard },
      { hub: second.hub, target: remoteWildcard },
    ]) {
      for (const organizationId of ["organization-1", "organization-2"])
        hub.subscribe(target.socket, { topic: "map.pings", organizationId });
    }

    const mapPings = new MapPingService(first.store, first.hub);

    for (let index = 0; index < 5; index += 1) {
      await expect(
        Effect.runPromise(
          mapPings.send(source.socket, {
            expectedMapId: 7,
            type: "enemy",
            x: index,
            y: index,
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });

      if (index === 2) {
        await waitFor(
          () =>
            eventsOfType(remoteWildcard.frames, "map-ping.received").length ===
            3,
        );
        const presence = remoteWildcard.socket.data.presence;

        if (!presence) throw new Error("Missing remote presence");
        second.hub.setPresence(remoteWildcard.socket, {
          ...presence,
          location: { mapId: 8, map: "Another map" },
        });
      }
    }

    await expect(
      Effect.runPromise(
        mapPings.send(source.socket, {
          expectedMapId: 7,
          type: "enemy",
          x: 6,
          y: 6,
        }),
      ),
    ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });
    await waitFor(
      () => eventsOfType(recipient.frames, "map-ping.received").length >= 5,
    );
    expect(eventsOfType(source.frames, "map-ping.received")).toHaveLength(0);
    expect(eventsOfType(recipient.frames, "map-ping.received")).toHaveLength(5);
    expect(
      eventsOfType(localWildcard.frames, "map-ping.received"),
    ).toHaveLength(5);
    expect(
      eventsOfType(remoteWildcard.frames, "map-ping.received"),
    ).toHaveLength(3);

    const battleRecipient = makeSocket("battle-recipient");
    const battleBystander = makeSocket("battle-bystander");

    for (const [target, characterId] of [
      [battleRecipient, "100"],
      [battleBystander, "200"],
    ] as const) {
      const presence = target.socket.data.presence;

      if (!presence?.character) throw new Error("Missing battle ping presence");
      target.socket.data = {
        ...target.socket.data,
        presence: {
          ...presence,
          character: { ...presence.character, characterId },
        },
      };
      second.hub.register(target.socket);
      second.hub.subscribe(target.socket, {
        topic: "map.pings",
        organizationId: "organization-1",
        world: "classic",
        mapId: 7,
      });
    }

    // The exhausted map ping budget must not block battle pings.
    await expect(
      Effect.runPromise(
        new BattlePingService(first.store, first.hub).send(source.socket, {
          expectedMapId: 7,
          type: "attack",
          warriorId: -1,
          recipientCharacterIds: ["100"],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    await waitFor(
      () =>
        eventsOfType(battleRecipient.frames, "battle-ping.received").length ===
        1,
    );
    expect(
      eventsOfType(battleBystander.frames, "battle-ping.received"),
    ).toHaveLength(0);
    expect(eventsOfType(recipient.frames, "battle-ping.received")).toHaveLength(
      0,
    );
  });

  test("air-tag observations federate per enabled Lootlog, limit each connection and expire idle targets", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const source = makeSocket("source");
    const recipient = makeSocket("recipient");
    first.hub.register(source.socket);
    second.hub.register(recipient.socket);
    await Effect.runPromise(
      sourceAirTags.updateSubscription(source.socket, {
        requestId: "source-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );
    await Effect.runPromise(
      recipientAirTags.updateSubscription(recipient.socket, {
        requestId: "recipient-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation, { ...observation, x: 12 }],
        }),
      ),
    ).resolves.toEqual({
      status: "accepted",
      acceptedScopes: 1,
      acceptedTargets: 1,
    });
    await waitFor(
      () =>
        eventsOfType(recipient.frames, "air-tag.scope-updated").length === 1,
    );
    expect(eventsOfType(source.frames, "air-tag.scope-updated")).toHaveLength(
      0,
    );

    const reconnected = makeSocket("reconnected");
    second.hub.register(reconnected.socket);

    const rejoined = await Effect.runPromise(
      recipientAirTags.updateSubscription(reconnected.socket, {
        requestId: "reconnected-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    expect(rejoined).toMatchObject({
      status: "accepted",
      scopes: [{ targets: [{ targetId: "target-1", x: 12 }] }],
    });

    for (let index = 0; index < 14; index += 1) {
      const acknowledgement = await Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation],
        }),
      );

      expect(acknowledgement).toMatchObject({ status: "accepted" });
    }

    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation],
        }),
      ),
    ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });

    await Bun.sleep(10_100);
    const afterExpiry = makeSocket("after-expiry");

    const expiredSnapshot = await Effect.runPromise(
      recipientAirTags.updateSubscription(afterExpiry.socket, {
        requestId: "expired-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    expect(expiredSnapshot).toMatchObject({
      status: "accepted",
      scopes: [{ targets: [] }],
    });
  }, 30_000);

  test("air-tag threats reach location readers once per change and keep the last reported details", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const source = makeSocket("source");
    first.hub.register(source.socket);
    await Effect.runPromise(
      sourceAirTags.updateSubscription(source.socket, {
        requestId: "source-subscription",
        enabled: true,
        expectedMapId: 7,
      }),
    );

    const watcher = threatWatcher("threat-watcher");
    const locationBlind = threatWatcher("location-blind", false);

    for (const target of [watcher, locationBlind]) {
      second.hub.register(target.socket);
      second.hub.subscribe(target.socket, {
        topic: "organization.presence",
        organizationId: "organization-1",
      });
    }

    const publishThreat = async (sighting: typeof clanEnemy) =>
      expect(
        Effect.runPromise(
          sourceAirTags.publishObservations(source.socket, {
            expectedMapId: 7,
            observations: [sighting, observation],
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });

    const threatEvents = () =>
      eventsOfType(watcher.frames, "air-tag.map-threat-updated");

    await publishThreat(clanEnemy);
    // Unchanged and recently reported, so it stays quiet.
    await publishThreat({ ...clanEnemy, x: 9 });
    // A change inside the throttle window goes out when the window ends, without another sighting.
    await publishThreat({ ...clanEnemy, stasis: false });
    await waitFor(() => threatEvents().length === 2);

    // Older game clients omit level, profession and stasis; the last values stay.
    const {
      lvl: _lvl,
      prof: _prof,
      stasis: _stasis,
      ...legacySighting
    } = clanEnemy;

    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [legacySighting],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });
    // A changed threat would go out once the one-second throttle window ends.
    await Bun.sleep(1_200);
    expect(threatEvents()).toMatchObject([
      {
        data: {
          guildId: "organization-1",
          world: "classic",
          mapId: 7,
          mapName: "Ithan",
          revision: expect.any(Number),
          enemies: [
            {
              ...clanEnemyFields(clanEnemy),
              stasis: true,
              ageMs: expect.any(Number),
            },
          ],
        },
      },
      {
        data: {
          enemies: [{ ...clanEnemyFields(clanEnemy), stasis: false }],
        },
      },
    ]);

    // Unverified characters and clanless clan enemies never feed the timers.
    source.socket.data.confidence = "reported";
    await publishThreat({ ...clanEnemy, targetId: "unverified" });
    source.socket.data.confidence = "verified";
    const { clan: _clan, ...clanless } = clanEnemy;
    await expect(
      Effect.runPromise(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [{ ...clanless, targetId: "clanless" }],
        }),
      ),
    ).resolves.toMatchObject({ status: "accepted" });

    await expect(
      Effect.runPromise(
        recipientAirTags.fetchMapThreats(
          watcher.socket,
          "organization-1",
          "classic",
        ),
      ),
    ).resolves.toMatchObject({
      threats: [
        {
          mapId: 7,
          mapName: "Ithan",
          enemies: [
            { targetId: "clan-enemy", lvl: 250, prof: "m", stasis: false },
          ],
        },
      ],
    });
    await expect(
      Effect.runPromise(
        recipientAirTags.fetchMapThreats(
          locationBlind.socket,
          "organization-1",
          "classic",
        ),
      ),
    ).resolves.toBeNull();
    expect(
      eventsOfType(locationBlind.frames, "air-tag.map-threat-updated"),
    ).toHaveLength(0);
  });

  test("an air-tag target leaves once no observer still sees it and one saw it leave the map", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const watcher = threatWatcher("threat-watcher");
    second.hub.register(watcher.socket);
    second.hub.subscribe(watcher.socket, {
      topic: "organization.presence",
      organizationId: "organization-1",
    });

    const scopeRecipient = makeSocket("scope-recipient");
    const firstObserver = makeSocket("first-observer");
    const secondObserver = makeSocket("second-observer");
    const bystander = makeSocket("bystander");
    const observers = [firstObserver, secondObserver, bystander];

    for (const target of [...observers, scopeRecipient])
      moveAirTagSocket(target.socket, { mapId: 9, map: "Nithal" });

    observers.forEach((target) => first.hub.register(target.socket));
    second.hub.register(scopeRecipient.socket);
    await Promise.all(
      observers.map((target) =>
        Effect.runPromise(
          sourceAirTags.updateSubscription(target.socket, {
            requestId: `${target.socket.data.connectionId}-subscription`,
            enabled: true,
            expectedMapId: 9,
          }),
        ),
      ),
    );
    await Effect.runPromise(
      recipientAirTags.updateSubscription(scopeRecipient.socket, {
        requestId: "scope-recipient-subscription",
        enabled: true,
        expectedMapId: 9,
      }),
    );

    const scopeUpdates = () =>
      eventsOfType(scopeRecipient.frames, "air-tag.scope-updated").map(
        ({ data }) => data,
      );

    const mapThreats = () =>
      eventsOfType(watcher.frames, "air-tag.map-threat-updated").flatMap(
        ({ data }) =>
          data.mapId === 9
            ? [data.enemies.map(({ targetId }) => targetId)]
            : [],
      );

    const wanderer = { ...clanEnemy, targetId: "wanderer" };
    const lurker = { ...observation, targetId: "lurker" };

    const report = (
      target: ReturnType<typeof makeSocket>,
      batch: Omit<
        Parameters<AirTagService["publishObservations"]>[1],
        "expectedMapId"
      >,
    ) =>
      expect(
        Effect.runPromise(
          sourceAirTags.publishObservations(target.socket, {
            expectedMapId: 9,
            ...batch,
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });

    await report(firstObserver, { observations: [wanderer, lurker] });
    await report(secondObserver, { observations: [wanderer, lurker] });
    await waitFor(() => scopeUpdates().length === 1);
    await waitFor(() => mapThreats().length === 1);
    // One frame per batch; the second observer's identical sighting stays quiet.
    expect(scopeUpdates()).toMatchObject([
      {
        mapId: 9,
        targets: [{ targetId: "wanderer" }, { targetId: "lurker" }],
        removedTargetIds: [],
      },
    ]);

    // The second observer still sees both.
    await report(firstObserver, {
      observations: [],
      departures: [
        { targetId: "wanderer", reason: "left-map" },
        { targetId: "lurker", reason: "out-of-sight" },
      ],
    });
    await report(secondObserver, {
      observations: [],
      departures: [
        { targetId: "wanderer", reason: "out-of-sight" },
        { targetId: "lurker", reason: "out-of-sight" },
      ],
    });
    // Nobody sees the lurker, but nobody saw it leave, and a connection that
    // never reported it cannot remove it.
    await report(bystander, {
      observations: [],
      departures: [{ targetId: "lurker", reason: "left-map" }],
    });
    await waitFor(() => scopeUpdates().length === 2);
    await waitFor(() => mapThreats().length === 2);
    await Bun.sleep(100);
    expect(scopeUpdates()[1]).toMatchObject({
      targets: [],
      removedTargetIds: ["wanderer"],
    });

    // Revisions increase, so recipients can drop a frame that is not newer.
    const [sighted, departed] = scopeUpdates().map(({ revision }) => revision);

    expect(departed).toBeGreaterThan(sighted ?? Number.POSITIVE_INFINITY);
    // The last clan enemy left: an empty list clears the timers at once.
    expect(mapThreats()).toEqual([["wanderer"], []]);

    const afterDeparture = makeSocket("after-departure");
    setSocketPresence(
      afterDeparture.socket,
      scopeRecipient.socket.data.presence,
    );
    await expect(
      Effect.runPromise(
        recipientAirTags.updateSubscription(afterDeparture.socket, {
          requestId: "after-departure-subscription",
          enabled: true,
          expectedMapId: 9,
        }),
      ),
    ).resolves.toMatchObject({
      status: "accepted",
      scopes: [{ targets: [{ targetId: "lurker" }] }],
    });
  });

  test("air-tag updates cross Redis only for maps another replica follows", async () => {
    await using airTags = await startAirTagInstances();
    const { first, second, sourceAirTags, recipientAirTags } = airTags;
    const channelUpdates: number[] = [];
    const channelListener = new RedisClient(redisUrl());

    try {
      await channelListener.subscribe(first.store.channel, (raw) => {
        const revision = federatedAirTagRevision(raw, 11);

        if (revision !== undefined) channelUpdates.push(revision);
      });

      const soloObserver = makeSocket("solo-observer");
      const localWatcher = makeSocket("local-watcher");
      const remoteWatcher = makeSocket("remote-watcher");

      for (const target of [soloObserver, localWatcher, remoteWatcher])
        moveAirTagSocket(target.socket, { mapId: 11, map: "Solo" });

      first.hub.register(soloObserver.socket);
      first.hub.register(localWatcher.socket);
      second.hub.register(remoteWatcher.socket);

      for (const target of [soloObserver, localWatcher])
        await Effect.runPromise(
          sourceAirTags.updateSubscription(target.socket, {
            requestId: `${target.socket.data.connectionId}-subscription`,
            enabled: true,
            expectedMapId: 11,
          }),
        );

      const soloUpdates = (target: ReturnType<typeof makeSocket>) =>
        eventsOfType(target.frames, "air-tag.scope-updated").length;

      const reportSolo = (x: number) =>
        expect(
          Effect.runPromise(
            sourceAirTags.publishObservations(soloObserver.socket, {
              expectedMapId: 11,
              observations: [{ ...observation, targetId: "solo", x }],
            }),
          ),
        ).resolves.toMatchObject({ status: "accepted" });

      await reportSolo(1);
      await waitFor(() => soloUpdates(localWatcher) === 1);
      await Bun.sleep(100);
      expect(channelUpdates).toHaveLength(0);

      await Effect.runPromise(
        recipientAirTags.updateSubscription(remoteWatcher.socket, {
          requestId: "remote-watcher-subscription",
          enabled: true,
          expectedMapId: 11,
        }),
      );
      await reportSolo(2);
      await waitFor(() => soloUpdates(remoteWatcher) === 1);
      expect(soloUpdates(localWatcher)).toBe(2);
      expect(channelUpdates).toHaveLength(1);

      // A lapsed registration returns with the next refresh while a socket still follows the map.
      await first.store.command.del(
        "{air-tag:organization-1:classic:11}:replicas",
      );
      await reportSolo(3);
      await Bun.sleep(100);
      expect(channelUpdates).toHaveLength(1);

      const refresh = second.runtime.runFork(
        recipientAirTags.runInterestRefresh(),
      );

      await Bun.sleep(100);
      await second.runtime.runPromise(Fiber.interrupt(refresh));
      await reportSolo(4);
      await waitFor(() => soloUpdates(remoteWatcher) === 2);
      expect(channelUpdates).toHaveLength(2);

      // A subscription without a world or map follows every map of its Organization.
      const anyMapWatcher = makeSocket("any-map-watcher");

      const anyMap = {
        topic: "map.air-tags",
        organizationId: "organization-1",
      } as const;

      moveAirTagSocket(anyMapWatcher.socket, { mapId: 12, map: "Elsewhere" });
      moveAirTagSocket(soloObserver.socket, { mapId: 12, map: "Elsewhere" });
      second.hub.register(anyMapWatcher.socket);
      second.hub.subscribe(anyMapWatcher.socket, anyMap);
      await Effect.runPromise(recipientAirTags.registerInterest(anyMap));
      await Effect.runPromise(
        sourceAirTags.updateSubscription(soloObserver.socket, {
          requestId: "solo-observer-elsewhere",
          enabled: true,
          expectedMapId: 12,
        }),
      );
      await expect(
        Effect.runPromise(
          sourceAirTags.publishObservations(soloObserver.socket, {
            expectedMapId: 12,
            observations: [{ ...observation, targetId: "elsewhere" }],
          }),
        ),
      ).resolves.toMatchObject({ status: "accepted" });
      await waitFor(() => soloUpdates(anyMapWatcher) === 1);
    } finally {
      channelListener.close();
    }
  });

  test("NPC presence reaches timer readers only when an NPC gains its first or loses its last reporter", async () => {
    const configuration = makeConfiguration();
    await using redis = await openStore(configuration.redis.keyPrefix);
    const hub = new RealtimeHub(configuration, redis.store);
    const service = new NpcPresenceService(redis.store, hub);

    const timerSocket = (connectionId: string, lvlRangeTo = 500) => {
      const created = makeSocket(connectionId);
      created.socket.data.guilds = [
        membership(
          "organization-1",
          [Permission.LOOTLOG_TIMERS_READ, Permission.LOOTLOG_TIMERS_WRITE],
          { roleId: "timers", lvlRangeTo },
        ),
      ];
      created.socket.data.character = created.socket.data.presence?.character;
      hub.register(created.socket);
      hub.subscribe(created.socket, {
        topic: "organization.timers",
        organizationId: "organization-1",
      });

      return created;
    };

    const first = timerSocket("first-reporter");
    const second = timerSocket("second-reporter");
    const lowLevelReader = timerSocket("low-level-reader", 50);

    const presenceUpdates = (frames: readonly string[]) =>
      eventsOfType(frames, "npc-presence.updated").map(({ data }) => data);

    const elite = { id: 101, lvl: 120, wt: 25, prof: "w", type: 2 };

    const report = (npcs: (typeof elite)[], world = "classic") => ({
      world,
      organizationIds: ["organization-1"],
      npcs,
    });

    await expect(
      Effect.runPromise(service.report(first.socket, report([elite]))),
    ).resolves.toEqual({ status: "accepted" });
    await expect(
      Effect.runPromise(service.report(second.socket, report([elite]))),
    ).resolves.toEqual({ status: "accepted" });

    expect(presenceUpdates(first.frames)).toEqual([
      expect.objectContaining({
        organizationId: "organization-1",
        world: "classic",
        npc: elite,
        standing: true,
      }),
    ]);
    // An NPC above the reader's level range stays hidden, like its timer.
    expect(presenceUpdates(lowLevelReader.frames)).toEqual([]);

    await expect(
      Effect.runPromise(
        service.fetch(second.socket, "organization-1", "classic"),
      ),
    ).resolves.toMatchObject({ npcs: [{ npc: elite }] });
    await expect(
      Effect.runPromise(
        service.fetch(lowLevelReader.socket, "organization-1", "classic"),
      ),
    ).resolves.toMatchObject({ npcs: [] });

    // The first reporter leaving keeps the NPC standing for the second one.
    await Effect.runPromise(service.withdraw(first.socket));
    expect(presenceUpdates(second.frames)).toHaveLength(1);

    // A report from another world withdraws the NPCs seen in the previous one.
    second.socket.data.character = {
      ...second.socket.data.character!,
      world: "tempest",
    };
    await Effect.runPromise(
      service.report(second.socket, report([], "tempest")),
    );

    const updates = presenceUpdates(second.frames);
    expect(updates).toEqual([
      expect.objectContaining({ standing: true }),
      expect.objectContaining({
        npc: elite,
        standing: false,
        world: "classic",
      }),
    ]);
    expect(updates[1]!.revision).toBeGreaterThan(updates[0]!.revision);
    await expect(
      Effect.runPromise(
        service.fetch(second.socket, "organization-1", "classic"),
      ),
    ).resolves.toMatchObject({ npcs: [] });

    // A report after a failed write replaces what the connection stored,
    // so an NPC killed meanwhile does not keep standing.
    await Effect.runPromise(
      service.report(second.socket, report([elite], "tempest")),
    );
    second.socket.data.npcPresence = undefined;
    await Effect.runPromise(
      service.report(second.socket, report([], "tempest")),
    );
    expect(presenceUpdates(second.frames).slice(-2)).toEqual([
      expect.objectContaining({ world: "tempest", standing: true }),
      expect.objectContaining({ world: "tempest", standing: false }),
    ]);
  }, 30_000);
});
