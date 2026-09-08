import { unusedFederationStore } from "./realtime-fixtures.js";
import assert from "node:assert/strict";
import type {
  BasicPresence,
  ServerEvent,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Redacted } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { getScopeKey, RealtimeHub } from "#src/realtime/realtime-hub";
import type { SessionData } from "#src/realtime/session";

// Run with `bun run perf:routing`. This measures routing and encoding, not network I/O.
const connections = 5_000;
const publications = 20_000;
const warmupPublications = 200;
const config = {
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
  maxBackpressureStrikes: 3,
} satisfies GatewayConfiguration;
const redis = { ...unusedFederationStore, publish: () => Promise.resolve() };
const presence: BasicPresence = {
  userId: "user-0",
  discordId: "discord-0",
  sessionId: "session-0",
  organizationIds: ["organization-0"],
  platform: "game",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1_783_000_000_000,
  character: {
    world: "tempest",
    name: "Player",
    lvl: 200,
    characterId: "123",
    accountId: "456",
    prof: "w",
    icon: "icon",
  },
};
const presenceEvent: ServerEvent = {
  v: 1,
  type: "presence.delta",
  sequence: 1,
  data: {
    organizationId: "organization-0",
    revision: 1,
    changes: [{ action: "upsert", presence }],
  },
};
const pingEvent: ServerEvent = {
  v: 1,
  type: "map-ping.received",
  data: {
    pingId: "ping-0",
    world: "tempest",
    mapId: 0,
    type: "attention",
    x: 10,
    y: 20,
    sender: { characterId: "123", name: "Player" },
    createdAt: 1_783_000_000_000,
  },
};
const presenceTopics = [
  "organization.timers",
  "organization.loots",
  "organization.chat",
  "organization.notifications",
  "organization.members",
  "organization.presence",
] as const;

for (const scenario of [
  "presence",
  "map.pings.exact",
  "map.pings.wildcard",
] as const) {
  let deliveries = 0;
  // Registry background writes are outside this routing/codec benchmark.
  const hub = new RealtimeHub(config, redis, () => {});
  for (let index = 0; index < connections; index++) {
    const organizationId =
      scenario === "presence" ? `organization-${index % 30}` : "organization-0";
    // Default client subscriptions omit world/map; recipient filters still apply.
    const mapScope: SubscriptionScope =
      scenario === "map.pings.exact"
        ? {
            topic: "map.pings",
            organizationId,
            world: "tempest",
            mapId: index % 100,
          }
        : { topic: "map.pings", organizationId };
    const scopes: SubscriptionScope[] =
      scenario === "presence"
        ? presenceTopics.map((topic) => ({ topic, organizationId }))
        : [mapScope];
    const data: SessionData = {
      connectionId: `connection-${index}`,
      userId: `user-${index}`,
      discordId: `discord-${index}`,
      platform: "game",
      joined: true,
      guilds: [],
      airTagScopes: [],
      confidence: "reported",
      backpressureStrikes: 0,
      subscriptions: new Map(
        scopes.map((scope) => [getScopeKey(scope), scope]),
      ),
      presence: {
        ...presence,
        location: { mapId: index % 100, map: `Map ${index % 100}` },
      },
    };
    hub.register({
      data,
      close: () => {},
      getBufferedAmount: () => 0,
      send: (bytes: Uint8Array) => {
        deliveries++;
        return bytes.byteLength;
      },
    });
  }
  const publish =
    scenario === "presence"
      ? () =>
          hub.publishPresence(
            {
              topic: "organization.presence",
              organizationId: "organization-0",
            },
            presenceEvent,
            presenceEvent,
          )
      : () =>
          hub.publishToScopes(
            [
              {
                topic: "map.pings",
                organizationId: "organization-0",
                world: "tempest",
                mapId: 0,
              },
            ],
            pingEvent,
            {
              recipientPlatform: "game",
              recipientWorld: "tempest",
              recipientMapId: 0,
            },
          );
  for (let index = 0; index < warmupPublications; index++) await publish();
  deliveries = 0;
  const started = performance.now();
  const cpuStarted = process.cpuUsage();
  for (let index = 0; index < publications; index++) await publish();
  const cpu = process.cpuUsage(cpuStarted);
  const wallMs = performance.now() - started;
  const recipients = Math.ceil(
    connections / (scenario === "presence" ? 30 : 100),
  );
  assert.equal(deliveries, recipients * publications);
  console.log(
    JSON.stringify({
      scenario,
      connections,
      publications,
      warmupPublications,
      wallMs: Math.round(wallMs),
      cpuMs: (cpu.user + cpu.system) / 1_000,
      publicationsPerSecond: Math.round(publications / (wallMs / 1_000)),
      deliveries,
    }),
  );
}
