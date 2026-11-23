import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { Capability } from "@lootlog/schema/permissions";
import { Effect, Redacted } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type {
  RedisGatewayCommands,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import { PresenceStore } from "#src/realtime/presence-store";
import { AirTagService } from "#src/realtime/air-tag-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";
import { membership, testRpcConfiguration } from "./realtime-fixtures.js";
import { dragonflyUrl, openDragonflyStore } from "./dragonfly-fixtures.js";

export const uniquePrefix = () => `realtime-integration:${crypto.randomUUID()}`;

export const makeConfiguration = (keyPrefix = uniquePrefix()) =>
  ({
    environment: RuntimeEnvironment.DEV,
    port: 0,
    serviceName: "gateway",
    serviceNamespace: "test",
    rpc: testRpcConfiguration,
    margonemSigningKeyUrl: "http://localhost/key",
    rabbitmqUri: Redacted.make("unused"),
    activityEventSignatureSecret: Redacted.make("test"),
    websocketPath: "/ws",
    allowedWebOrigins: new Set<string>(),
    allowedExtensionOrigins: new Set<string>(),
    redis: { url: Redacted.make(dragonflyUrl()), keyPrefix },
    maxBackpressureBytes: 1_048_576,
  }) satisfies GatewayConfiguration;

export const guilds = ["organization-1", "organization-2"].map((id) => ({
  guild: { id, ownerId: "owner" },
  roles: [
    {
      id: `role-${id}`,
      lvlRangeFrom: 0,
      lvlRangeTo: 500,
      permissions: [Capability.LOOTLOG_ONLINE_PLAYERS_READ],
    },
  ],
}));

export const locationReadGuilds = guilds.map((entry) => ({
  ...entry,
  roles: entry.roles.map((role) => ({
    ...role,
    permissions: [
      ...role.permissions,
      Capability.LOOTLOG_PRESENCE_LOCATION_READ,
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
        [Capability.LOOTLOG_LOOTS_READ, Capability.LOOTLOG_LOOTS_HEROES_READ],
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

export const OFFLINE_DUE_INDEX = "presence:offline:due";

export const dueDepartures = (store: RedisGatewayStore) =>
  store.command.eval<string[]>(
    "return redis.call('ZRANGE', KEYS[1], 0, -1)",
    1,
    OFFLINE_DUE_INDEX,
  );

const joinedOrganizations = (target: GatewaySocket) =>
  target.data.guilds.map(({ guild }) => guild.id);

export const setSocketPresence = (
  socket: GatewaySocket,
  presence: SessionData["presence"],
) => {
  socket.data.presence = presence;
};

export const openStore = (keyPrefix = uniquePrefix()) =>
  openDragonflyStore(keyPrefix);

export const startFederatedInstance = async (
  configuration: GatewayConfiguration,
) => {
  const instance = await openStore(configuration.redis.keyPrefix);
  const hub = new RealtimeHub(configuration, instance.store);

  await instance.runtime.runPromise(hub.start);

  return { ...instance, hub };
};

export const startAirTagInstances = async () => {
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

export const OFFLINE_OUTBOX_INDEX = "presence:offline:outbox";

export const observation = {
  targetId: "target-1",
  nickname: "Enemy",
  relation: 6 as const,
  x: 10,
  y: 11,
};

export const moveAirTagSocket = (
  socket: GatewaySocket,
  location: { mapId: number; map: string },
) => {
  const presence = socket.data.presence;

  if (!presence) throw new Error("Missing air tag presence");
  setSocketPresence(socket, { ...presence, location });
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
