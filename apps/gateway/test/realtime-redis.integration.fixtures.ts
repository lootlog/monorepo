import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { afterAll, beforeAll } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import {
  decodeRealtimeFrame,
  tryDecodeRealtimeFrameValue,
} from "@lootlog/protocol/realtime/codec";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Fiber, ManagedRuntime, Redacted, Result } from "effect";
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
  RedisGatewayStore,
} from "#src/platform/redis-store";
import { PresenceStore } from "#src/realtime/presence-store";
import type { GameCharacterOffline } from "@lootlog/protocol/rabbit/events";
import { AirTagService } from "#src/realtime/air-tag-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { membership } from "./realtime-fixtures.js";

export const uniquePrefix = () => `realtime-integration:${crypto.randomUUID()}`;

export const guilds = ["organization-1", "organization-2"].map((id) => ({
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

export const locationReadGuilds = guilds.map((entry) => ({
  ...entry,
  roles: entry.roles.map((role) => ({
    ...role,
    permissions: [
      ...role.permissions,
      Permission.LOOTLOG_PRESENCE_LOCATION_READ,
    ],
  })),
}));

export const makeSession = (connectionId: string): SessionData => ({
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

export const makeSocket = (connectionId: string) => {
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

export const gameSocket = (
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

export const feedSocket = (connectionId: string, lvlRangeTo = 500) => {
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

export const lootFeed = {
  topic: "organization.loots",
  organizationId: "organization-1",
} as const;

const OFFLINE_DUE_INDEX = "presence:offline:due";

export const dueDepartures = (store: RedisGatewayStore) =>
  store.command.eval<string[]>(
    "return redis.call('ZRANGE', KEYS[1], 0, -1)",
    1,
    OFFLINE_DUE_INDEX,
  );

export const addDueDepartures = (store: RedisGatewayStore, ...keys: string[]) =>
  store.command.eval(
    "for _, member in ipairs(ARGV) do redis.call('ZADD', KEYS[1], 0, member) end return 1",
    1,
    OFFLINE_DUE_INDEX,
    ...keys,
  );

const joinedOrganizations = (target: GatewaySocket) =>
  target.data.guilds.map(({ guild }) => guild.id);

export const setSocketPresence = (
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

export const useDragonfly = () => {
  let dragonfly: StartedTestContainer;
  let redisPort: number;

  beforeAll(async () => {
    dragonfly = await new GenericContainer(
      "docker.dragonflydb.io/dragonflydb/dragonfly:v2.1.0",
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

  const redisUrl = () => `redis://${dragonfly.getHost()}:${redisPort}`;

  const makeConfiguration = (keyPrefix = uniquePrefix()) =>
    ({
      environment: RuntimeEnvironment.DEV,
      port: 0,
      rpcPort: 0,
      serviceName: "gateway",
      serviceNamespace: "test",
      apiRpcUrl: "http://localhost",
      margonemSigningKeyUrl: "http://localhost/key",
      rabbitmqUri: Redacted.make("unused"),
      activityEventSignatureSecret: Redacted.make("test"),
      websocketPath: "/ws",
      allowedWebOrigins: new Set<string>(),
      allowedExtensionOrigins: new Set<string>(),
      redis: { url: Redacted.make(redisUrl()), keyPrefix },
      maxBackpressureBytes: 1_048_576,
    }) satisfies GatewayConfiguration;

  const openStore = async (keyPrefix = uniquePrefix()): Promise<OpenStore> => {
    const runtime = ManagedRuntime.make(BunRedis.layer({ url: redisUrl() }));
    const background: Array<Fiber.Fiber<void, unknown>> = [];
    const redis = await runtime.runPromise(Redis.Redis);

    const store = new RedisGatewayStore(
      redis,
      { keyPrefix },
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

  const startFederatedInstance = async (
    configuration: GatewayConfiguration,
  ) => {
    const instance = await openStore(configuration.redis.keyPrefix);
    const hub = new RealtimeHub(configuration, instance.store);

    await instance.runtime.runPromise(hub.start);

    return { ...instance, hub };
  };

  const startAirTagInstances = async () => {
    const configuration = makeConfiguration();
    const first = await startFederatedInstance(configuration);
    const second = await startFederatedInstance(configuration);

    await first.store.command.set(
      "air-tag:disabled:organization-2:classic",
      "1",
    );

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

  return {
    redisUrl,
    makeConfiguration,
    openStore,
    startFederatedInstance,
    startAirTagInstances,
  };
};

export const recorder = <E>() => {
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

export const presenceHub = (
  publishPresence: RealtimeHub["publishPresence"] = async () => {},
) => ({
  setPresence: setSocketPresence,
  publishPresence,
});

type PresenceStoreArguments = ConstructorParameters<typeof PresenceStore>;

export const presenceStore = ({
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

export const interceptScript = (
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

export const connect = async (
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

export const depart = async (
  presence: PresenceStore,
  ...sockets: GatewaySocket[]
) => {
  for (const socket of sockets)
    await Effect.runPromise(presence.disconnect(socket.data));
};

export const departure = (
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

export const OFFLINE_OUTBOX_INDEX = "presence:offline:outbox";

export const OFFLINE_SWEEP_LOCK = "presence:offline:sweep-lock";

export const takeOverOfflineSweep = async (store: RedisGatewayStore) => {
  await store.command.set(OFFLINE_SWEEP_LOCK, "successor", "PX", 30_000);
};

export const clanEnemyFields = ({
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

export const observation = {
  targetId: "target-1",
  nickname: "Enemy",
  relation: 6 as const,
  x: 10,
  y: 11,
};

export const clanEnemy = {
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

export const federatedAirTagRevision = (
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

export const moveAirTagSocket = (
  socket: GatewaySocket,
  location: { mapId: number; map: string },
) => {
  const presence = socket.data.presence;

  if (!presence) throw new Error("Missing air tag presence");
  setSocketPresence(socket, { ...presence, location });
};

export const threatWatcher = (connectionId: string, readsLocation = true) => {
  const target = makeSocket(connectionId);

  if (readsLocation) target.socket.data.guilds = locationReadGuilds;
  moveAirTagSocket(target.socket, { mapId: 8, map: "Karka-han" });

  return target;
};

type RealtimeFrame = ReturnType<typeof decodeRealtimeFrame>;

export const eventsOfType = <T extends string>(
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

export const waitFor = async (
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
