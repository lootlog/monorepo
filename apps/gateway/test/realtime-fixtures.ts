import type { ClientCommand } from "@lootlog/protocol/realtime";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Redacted } from "effect";
import type { GatewayConfiguration } from "../src/config/gateway-config.js";
import {
  decodeFederatedRealtimeMessage,
  encodeFederatedRealtimeMessage,
  type FederatedFrameTexts,
  type FederatedRealtimeMessage,
  type FederationState,
} from "../src/platform/redis-store.js";
import type { PingScriptStore } from "../src/realtime/ping-routing.js";
import { RealtimeHub } from "../src/realtime/realtime-hub.js";
import type { GatewaySocket, SessionData } from "../src/realtime/session.js";

/** Configuration for benchmarks that never open a connection. */
export const benchmarkConfig = {
  environment: "benchmark",
  port: 0,
  serviceName: "gateway",
  serviceNamespace: "benchmark",
  apiUrl: "http://localhost",
  margonemSigningKeyUrl: "http://localhost",
  rabbitmqUri: Redacted.make("unused"),
  activityEventSignatureSecret: Redacted.make("unused"),
  redis: {
    host: "localhost",
    port: 6379,
    username: "",
    password: Redacted.make("unused"),
    keyPrefix: "benchmark",
  },
  websocketPath: "/ws",
  allowedWebOrigins: new Set<string>(),
  allowedExtensionOrigins: new Set<string>(),
  maxBackpressureBytes: 1_048_576,
} satisfies GatewayConfiguration;

const unexpectedFederationIO = () =>
  Promise.reject(new Error("Unexpected federation I/O"));

export const unusedFederationStore = {
  publish: unexpectedFederationIO,
  subscribe: unexpectedFederationIO,
} satisfies ConstructorParameters<typeof RealtimeHub>[1];

/** Reports a live subscription so a started hub admits WebSocket sessions. */
export const subscribedFederationStore = {
  ...unusedFederationStore,
  subscribe: (
    _listener: (message: FederatedRealtimeMessage) => void,
    onStateChange?: (state: FederationState) => void,
  ) => {
    onStateChange?.("subscribed");

    return Promise.resolve();
  },
} satisfies ConstructorParameters<typeof RealtimeHub>[1];

/** A joined game socket on classic map 7 that may share pings in one Organization. */
export const makeGamePingSocket = (): GatewaySocket => ({
  send: () => 0,
  close: () => {},
  getBufferedAmount: () => 0,
  data: {
    discordId: "discord-1",
    userId: "user-1",
    connectionId: "connection-1",
    platform: "game",
    joined: true,
    guilds: [
      {
        guild: { id: "organization-1", ownerId: "another-user" },
        roles: [
          {
            id: "role-1",
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
            permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
          },
        ],
      },
    ],
    subscriptions: new Map(),
    airTagScopes: [],
    confidence: "verified",
    presence: {
      userId: "user-1",
      sessionId: "presence-1",
      organizationIds: ["organization-1"],
      platform: "game",
      status: "online",
      confidence: "verified",
      isAfk: false,
      lastSeen: 1,
      character: {
        world: "classic",
        name: "Hero",
        lvl: 100,
        icon: "icon",
        characterId: "123",
        accountId: "456",
        prof: "w",
      },
      location: { mapId: 7, map: "Map", x: 1, y: 2 },
    },
  } satisfies SessionData,
});

type Membership = SessionData["guilds"][number];

/** One Lootlog membership with a single role. */
export const membership = (
  organizationId: string,
  permissions: ReadonlyArray<Permission>,
  {
    ownerId = "owner",
    roleId = "role-1",
    lvlRangeFrom = 0,
    lvlRangeTo = 500,
  }: {
    readonly ownerId?: string;
    readonly roleId?: string;
    readonly lvlRangeFrom?: number;
    readonly lvlRangeTo?: number;
  } = {},
): Membership => ({
  guild: { id: organizationId, ownerId },
  roles: [
    { id: roleId, permissions: [...permissions], lvlRangeFrom, lvlRangeTo },
  ],
});

/** A joined web session without memberships; tests override what they need. */
export const makeSession = (
  overrides: Partial<SessionData> = {},
): SessionData => ({
  discordId: "discord-1",
  userId: "user-1",
  connectionId: "connection-1",
  platform: "web-app",
  joined: true,
  guilds: [],
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "reported",
  ...overrides,
});

/** A socket that records sent frames and close codes. */
export const makeTestSocket = (data: SessionData, bufferedAmount = 0) => {
  const sent: string[] = [];
  const closes: number[] = [];

  const socket = {
    data,
    getBufferedAmount: () => bufferedAmount,
    send: (text: string) => {
      sent.push(text);

      return text.length;
    },
    close: (code: number) => {
      closes.push(code);
    },
  } satisfies GatewaySocket;

  return { socket, sent, closes };
};

/** Grants the session an unexpired read-only API key for the Lootlogs. */
export const withApiKey = (
  session: SessionData,
  organizationIds: ReadonlyArray<string>,
  {
    keyId = "key-1",
    personalData = false,
    leaseExpiresAt = Date.now() + 60_000,
  }: {
    readonly keyId?: string;
    readonly personalData?: boolean;
    readonly leaseExpiresAt?: number;
  } = {},
): SessionData => {
  session.apiKeyAccess = {
    keyId,
    organizationIds: [...organizationIds],
    mode: "read",
    personalData,
    expiresAt: null,
  };
  session.apiKeyLeaseExpiresAt = leaseExpiresAt;

  return session;
};

type CommandBody = ClientCommand extends infer Command
  ? Command extends unknown
    ? Omit<Command, "v" | "requestId">
    : never
  : never;

/** One client command as the frame a socket sends. */
export const commandFrame = (
  command: CommandBody,
  requestId = "request-1",
): string => JSON.stringify({ v: 1, requestId, ...command });

/**
 * A federation channel shared by hubs. Like Redis Pub/Sub after a reconnect it
 * may deliver a message twice, so receivers must deduplicate.
 */
export const makeFederationBus = ({ deliveries = 2 } = {}) => {
  const listeners: Array<(message: FederatedRealtimeMessage) => void> = [];

  const store = {
    subscribe: (
      listener: (message: FederatedRealtimeMessage) => void,
      onStateChange?: (state: FederationState) => void,
    ) => {
      listeners.push(listener);
      onStateChange?.("subscribed");

      return Promise.resolve();
    },
    publish: (
      message: FederatedRealtimeMessage,
      frames?: FederatedFrameTexts,
    ) => {
      let delivered: FederatedRealtimeMessage;

      // Redis subscribers drop a message they cannot decode.
      try {
        delivered = decodeFederatedRealtimeMessage(
          encodeFederatedRealtimeMessage(message, frames),
        );
      } catch {
        return Promise.resolve();
      }

      for (const listener of listeners)
        for (let delivery = 0; delivery < deliveries; delivery++)
          listener(delivered);

      return Promise.resolve();
    },
  } satisfies ConstructorParameters<typeof RealtimeHub>[1];

  return { store, listeners };
};

/** Started hubs federated over one bus, as replicas sharing Redis. */
export const startHubs = async (
  count = 2,
  config: ConstructorParameters<typeof RealtimeHub>[0] = {
    maxBackpressureBytes: 1_024,
  },
) => {
  const bus = makeFederationBus();

  const hubs = Array.from(
    { length: count },
    () => new RealtimeHub(config, bus.store),
  );

  for (const hub of hubs) await Effect.runPromise(hub.start());

  return { hubs, bus };
};

/** A ping rate-limit store that admits every request at `createdAt`. */
export const acceptingRateLimit = (
  createdAt = 1234,
  keys: string[] = [],
): PingScriptStore => ({
  command: {
    eval: (_script, _keyCount, ...args) => {
      keys.push(String(args[0]));

      return Promise.resolve([1, createdAt, 0]);
    },
  },
});
