import assert from "node:assert/strict";
import { spyOn } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import * as npcRouting from "@lootlog/domain/npc-routing";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import { GenericContainer, Wait } from "testcontainers";
import { RedisGatewayStore } from "#src/platform/redis-store";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { PresenceStore } from "#src/realtime/presence-store";
import { OnlineHistory } from "#src/realtime/online-history";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

// Run the same file at both revisions; no application or external data is used.
const connections = 300;

const publications = 2_000;

const heartbeatRounds = 2;

const organizationIds = ["organization-1", "organization-2", "organization-3"];

const scope = {
  topic: "organization.timers",
  organizationId: "organization-1",
} as const;

const event = {
  v: 1,
  type: "timer.created",
  data: {
    organizationId: "organization-1",
    payload: { npc: { type: "HERO", lvl: 100 } },
  },
} as const;

let deliveries = 0;

const sockets: GatewaySocket[] = Array.from(
  { length: connections },
  (_, index) => {
    const data: SessionData = {
      connectionId: `session-${index}`,
      userId: `user-${index}`,
      discordId: `discord-${index}`,
      platform: "game",
      joined: true,
      confidence: "verified",
      backpressureStrikes: 0,
      subscriptions: new Map(),
      airTagScopes: [],
      guilds: organizationIds.map((id) => ({
        guild: { id, ownerId: "owner" },
        roles: [
          {
            id: "role",
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
            permissions: [
              Permission.LOOTLOG_TIMERS_READ,
              Permission.LOOTLOG_TIMERS_HEROES_READ,
            ],
          },
        ],
      })),
      character: {
        characterId: `character-${index}`,
        accountId: `account-${index}`,
        world: "classic",
        name: "Benchmark",
        lvl: 100,
        prof: "w",
        icon: "hero.gif",
      },
    };

    return {
      data,
      close: () => {},
      getBufferedAmount: () => 0,
      send: () => {
        deliveries++;

        return 1;
      },
    };
  },
);

const container = await new GenericContainer(
  "docker.dragonflydb.io/dragonflydb/dragonfly:v1.34.1",
)
  .withCommand(["--logtostderr", "--proactor_threads=2"])
  .withExposedPorts(6379)
  .withWaitStrategy(Wait.forListeningPorts())
  .start();

const runtime = ManagedRuntime.make(
  BunRedis.layer({
    url: `redis://${container.getHost()}:${container.getMappedPort(6379)}`,
  }),
);

try {
  const redis = await runtime.runPromise(Redis.Redis);
  let calls = 0;

  const store = new RedisGatewayStore(
    redis,
    {
      host: container.getHost(),
      port: container.getMappedPort(6379),
      username: "",
      password: "",
      keyPrefix: "cost-benchmark",
    },
    (effect) => {
      calls++;

      return runtime.runPromise(effect);
    },
    () => {},
  );

  // Routing measurement isolates local delivery from Redis latency.
  const federation = {
    command: store.command,
    subscribe: async () => {},
    publish: async () => {},
  };

  const hub = new RealtimeHub(
    { maxBackpressureBytes: 1_048_576, maxBackpressureStrikes: 3 },
    federation,
    () => {},
  );

  for (const socket of sockets) {
    hub.register(socket);
    hub.subscribe(socket, scope);
  }

  for (let index = 0; index < 200; index++)
    await hub.publishToScope(scope, event);
  const routing = spyOn(npcRouting, "getNpcRoutingTier");
  deliveries = 0;
  const started = performance.now();
  const cpuStarted = process.cpuUsage();

  for (let index = 0; index < publications; index++)
    await hub.publishToScope(scope, event);
  const cpu = process.cpuUsage(cpuStarted);
  assert.equal(deliveries, connections * publications);
  console.log(
    JSON.stringify({
      scenario: "timer-fanout",
      connections,
      publications,
      deliveries,
      routingDecodes: routing.mock.calls.length,
      wallMs: performance.now() - started,
      cpuMs: (cpu.user + cpu.system) / 1_000,
    }),
  );
  routing.mockRestore();
  const history = new OnlineHistory(store.command, () => Effect.void);
  const presence = new PresenceStore(store, hub, Date.now, undefined, history);

  for (const socket of sockets)
    await Effect.runPromise(presence.publish(socket, { organizationIds: [] }));
  // Warm script caches; the metric counts gateway operations, excluding NOSCRIPT loads.
  const warmupSocket = sockets[0];
  assert.ok(warmupSocket);
  await Effect.runPromise(
    presence.heartbeat(warmupSocket, warmupSocket.data.connectionId),
  );
  calls = 0;
  const heartbeatStarted = performance.now();

  for (let round = 0; round < heartbeatRounds; round++) {
    await Effect.runPromise(
      Effect.forEach(
        sockets,
        (socket) => presence.heartbeat(socket, socket.data.connectionId),
        { concurrency: 16, discard: true },
      ),
    );
  }

  console.log(
    JSON.stringify({
      scenario: "heartbeat",
      connections,
      organizationsPerConnection: organizationIds.length,
      heartbeatRounds,
      gatewayRedisOperations: calls,
      operationsPerHeartbeat: calls / (connections * heartbeatRounds),
      wallMs: performance.now() - heartbeatStarted,
    }),
  );

  for (const workload of [
    {
      scenario: "offline-backlog",
      departures: 5_000,
      organizationSets: [["organization-1"]],
    },
    {
      scenario: "offline-mixed-organization-backlog",
      departures: 1_000,
      organizationSets: [
        ["organization-1"],
        ["organization-1", "organization-2"],
        ["organization-2", "organization-1"],
        ["organization-3"],
        ["organization-3", "organization-2", "organization-1"],
      ],
    },
  ]) {
    const departures = workload.departures;
    const sweepNow = Date.now();
    const pendingKeys: string[] = [];

    for (let index = 0; index < departures; index++) {
      const key = `presence:offline:benchmark:${index}`;

      const departureOrganizations =
        workload.organizationSets[index % workload.organizationSets.length];

      assert.ok(departureOrganizations);
      pendingKeys.push(key);
      await store.command.set(
        key,
        JSON.stringify({
          userId: `departed-${index}`,
          discordId: `departed-discord-${index}`,
          characterId: `departed-character-${index}`,
          world: "classic",
          organizationIds: departureOrganizations,
          disconnectedAt: sweepNow - 10_000,
        }),
      );
    }

    await store.command.sadd("presence:offline:pending", ...pendingKeys);
    let organizationReads = 0;
    let presenceValuesRead = 0;

    const command = {
      ...store.command,
      mget: (keys: string[]) => {
        if (
          organizationIds.some((id) => keys[0]?.startsWith(`presence:${id}:`))
        ) {
          organizationReads++;
          presenceValuesRead += keys.length;
        }

        return store.command.mget(keys);
      },
    };

    let offlineDelivered = 0;
    const departedUsers = new Set<string>();
    let lastDelivery = 0;

    const offline = new PresenceStore(
      { command },
      hub,
      () => sweepNow,
      undefined,
      undefined,
      (event) =>
        Effect.sync(() => {
          offlineDelivered++;
          departedUsers.add(event.userId);
          lastDelivery = performance.now();
        }),
    );

    const sweepStarted = performance.now();
    let runs = 0;

    while (offlineDelivered < departures) {
      if (runs++ > 100) throw new Error("Offline backlog did not drain");
      await Effect.runPromise(offline.sweepOffline());

      if (offlineDelivered < departures) await Bun.sleep(1_000);
    }

    assert.equal(departedUsers.size, departures);
    console.log(
      JSON.stringify({
        scenario: workload.scenario,
        departures,
        liveOrganizationSessions: connections,
        delivered: offlineDelivered,
        organizationReads,
        presenceValuesRead,
        sweepRuns: runs,
        timeToLastDeliveryMs: lastDelivery - sweepStarted,
      }),
    );
  }
} finally {
  await runtime.dispose();
  await container.stop();
}
