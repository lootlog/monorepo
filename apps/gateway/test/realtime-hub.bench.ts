import { unusedFederationStore } from "./realtime-fixtures.js";
import assert from "node:assert/strict";
import type {
  BasicPresence,
  ServerEvent,
  SubscriptionScope,
} from "@lootlog/protocol/realtime";
import { Effect, Redacted } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import { encodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
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

// Synthetic publication benchmark: no Redis/network I/O. Remote measurements start
// at the decoded Redis envelope and include base64 + frame validation. Timer delay
// measures event-loop responsiveness under bursts of 100 awaited publications.
const publicationSamples = 10_000;

const publicationWarmup = 1_000;

const batchSize = 100;

const percentile = (samples: number[], fraction: number): number => {
  const sorted = [...samples].sort((left, right) => left - right);

  return Number(
    (sorted[Math.ceil(sorted.length * fraction) - 1] ?? 0).toFixed(3),
  );
};

const publicationFixtures: ReadonlyArray<{
  name: string;
  scope: SubscriptionScope;
  event: ServerEvent;
}> = [
  {
    name: "timer",
    scope: { topic: "organization.timers", organizationId: "organization-0" },
    event: {
      v: 1,
      type: "timer.created",
      data: {
        organizationId: "organization-0",
        payload: {
          guildId: "organization-0",
          world: "tempest",
          npc: { id: 123, name: "Hero", lvl: 200, type: "HERO" },
          minSpawnTime: "2026-09-16T12:00:00.000Z",
          maxSpawnTime: "2026-09-16T13:00:00.000Z",
          member: { id: 123, name: "Player" },
        },
      },
    },
  },
  {
    name: "chat",
    scope: { topic: "organization.chat", organizationId: "organization-0" },
    event: {
      v: 1,
      type: "chat.created",
      data: {
        organizationId: "organization-0",
        payload: {
          guildId: "organization-0",
          id: 123,
          senderId: "discord-0",
          type: "MESSAGE",
          message: "Spotkajmy się na mapie za pięć minut.",
          createdAt: "2026-09-16T12:00:00.000Z",
          world: "tempest",
        },
      },
    },
  },
  {
    name: "map-ping",
    scope: { topic: "map.pings", organizationId: "organization-0" },
    event: pingEvent,
  },
];

for (const fixture of publicationFixtures) {
  for (const origin of ["local", "remote"] as const) {
    for (const encoding of ["msgpack", "json", "mixed"] as const) {
      for (const fanout of [1, 50]) {
        let deliveries = 0;

        let receive: (message: FederatedRealtimeMessage) => void = () => {
          throw new Error("Federation subscription was not initialized");
        };

        const hub = new RealtimeHub(
          config,
          {
            ...redis,
            subscribe: (listener) => {
              receive = listener;

              return Promise.resolve();
            },
          },
          () => {},
        );

        await Effect.runPromise(hub.start());

        for (let index = 0; index < fanout; index++) {
          hub.register({
            data: {
              connectionId: `publication-${index}`,
              userId: `user-${index}`,
              discordId: `discord-${index}`,
              platform: "game",
              frameEncoding:
                encoding === "json" || (encoding === "mixed" && index % 2 === 0)
                  ? "json"
                  : undefined,
              joined: true,
              guilds: [
                {
                  guild: { id: "organization-0", ownerId: "discord-0" },
                  roles: [
                    {
                      id: "reader",
                      lvlRangeFrom: 0,
                      lvlRangeTo: 500,
                      permissions: [
                        Permission.LOOTLOG_TIMERS_READ,
                        Permission.LOOTLOG_TIMERS_HEROES_READ,
                        Permission.LOOTLOG_CHAT_READ,
                      ],
                    },
                  ],
                },
              ],
              subscriptions: new Map([
                [getScopeKey(fixture.scope), fixture.scope],
              ]),
              airTagScopes: [],
              confidence: "reported",
              backpressureStrikes: 0,
            },
            close: () => {},
            getBufferedAmount: () => 0,
            send: () => {
              deliveries++;

              return 1;
            },
          });
        }

        const remote: FederatedRealtimeMessage = {
          id: "unused",
          sourceInstanceId: "remote-benchmark",
          scope: fixture.scope,
          scopeKey: getScopeKey(fixture.scope),
          frame: Buffer.from(encodeRealtimeFrame(fixture.event)).toString(
            "base64",
          ),
        };

        let sequence = 0;

        const publish =
          origin === "local"
            ? () => hub.publishToScope(fixture.scope, fixture.event)
            : () => {
                receive({ ...remote, id: `remote-${sequence++}` });

                return Promise.resolve();
              };

        for (let index = 0; index < publicationWarmup; index++) await publish();
        deliveries = 0;
        const latencies: number[] = [];
        const timerDelays: number[] = [];
        let wallMs = 0;
        let cpuMicros = 0;

        for (let offset = 0; offset < publicationSamples; offset += batchSize) {
          const timerStarted = performance.now();

          const timer = new Promise<void>((resolve) =>
            setTimeout(() => {
              timerDelays.push(performance.now() - timerStarted);
              resolve();
            }, 0),
          );

          const cpuStarted = process.cpuUsage();
          const started = performance.now();

          for (let index = 0; index < batchSize; index++) {
            const publicationStarted = performance.now();
            await publish();
            latencies.push(performance.now() - publicationStarted);
          }

          wallMs += performance.now() - started;
          const cpu = process.cpuUsage(cpuStarted);
          cpuMicros += cpu.user + cpu.system;
          await timer;
        }

        assert.equal(deliveries, fanout * publicationSamples);
        console.log(
          JSON.stringify({
            scenario: "publication",
            event: fixture.name,
            messagePackBytes: encodeRealtimeFrame(fixture.event).byteLength,
            jsonBytes: new TextEncoder().encode(JSON.stringify(fixture.event))
              .byteLength,
            origin,
            encoding,
            fanout,
            publications: publicationSamples,
            warmupPublications: publicationWarmup,
            batchSize,
            cpuMicrosPerPublication: Number(
              (cpuMicros / publicationSamples).toFixed(3),
            ),
            publicationsPerSecond: Math.round(
              (publicationSamples * 1_000) / wallMs,
            ),
            latencyMicrosP50: percentile(
              latencies.map((value) => value * 1_000),
              0.5,
            ),
            latencyMicrosP95: percentile(
              latencies.map((value) => value * 1_000),
              0.95,
            ),
            latencyMicrosP99: percentile(
              latencies.map((value) => value * 1_000),
              0.99,
            ),
            eventLoopTimerDelayMsP95: percentile(timerDelays, 0.95),
            eventLoopTimerDelayMsP99: percentile(timerDelays, 0.99),
            deliveries,
          }),
        );
      }
    }
  }
}
