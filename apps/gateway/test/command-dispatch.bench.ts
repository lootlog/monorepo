import {
  benchmarkConfig,
  commandFrame,
  makeGamePingSocket,
  unusedFederationStore,
} from "./realtime-fixtures.js";
import { makeCommandHandler } from "./command-handler-fixtures.js";
import assert from "node:assert/strict";
import { Effect } from "effect";
import { AirTagService } from "#src/realtime/air-tag-service";
import { CommandAdmission } from "#src/realtime/command-admission";
import { MapPingService } from "#src/realtime/map-ping-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";

// Run with `bun run perf:commands`. This measures the per-command CPU path from
// a received frame to its sent response; Redis and federation I/O resolve at once.
const commands = 200_000;

const warmupCommands = 20_000;

const hub = new RealtimeHub(
  benchmarkConfig,
  { ...unusedFederationStore, publish: () => Promise.resolve() },
  () => {},
);

// One map ping per command passes a 5-per-15 s window only with a stub reply.
const mapPings = new MapPingService(
  { command: { eval: () => Promise.resolve([1, 1_783_000_000_000, 0]) } },
  hub,
);

// The admission replies with one enabled scope and the merge with one moved target.
const airTags = new AirTagService(
  {
    command: {
      mget: () => Promise.resolve([]),
      sadd: () => Promise.resolve(1),
      smembers: () => Promise.resolve([]),
      expire: () => Promise.resolve(1),
      eval: (_script, keys) =>
        Promise.resolve(
          keys === 7
            ? JSON.stringify({
                epochId: "epoch",
                epochStartedAt: 1,
                revision: 2,
                acceptedTargets: 1,
                targets: [
                  {
                    targetId: "target",
                    nickname: "Enemy",
                    relation: 3,
                    x: 1,
                    y: 2,
                    observedAt: 1,
                  },
                ],
                removed: [],
                remoteRecipients: false,
              })
            : [1, 0, 0],
        ),
    },
  },
  hub,
);

const { handler } = makeCommandHandler({
  guilds: {
    getUserGuilds: () => Effect.die("Unexpected guild read"),
    invalidate: () => Effect.void,
  },
  verifier: { verify: () => Effect.die("Unexpected proof") },
  presence: {
    heartbeat: () => Effect.succeed(1_783_000_000_000),
    publish: () => Effect.die("Unexpected presence publish"),
    snapshot: () => Effect.die("Unexpected snapshot"),
    reconcileAccess: () => Effect.void,
  },
  hub,
  activity: { publish: () => Effect.void },
  sessionFeatures: { airTags },
  features: {
    mapPings,
    airTags,
    // Unbounded, so the benchmark measures the observation, not its rejection.
    airTagObservationAdmission: new CommandAdmission({
      ratePerSecond: Number.MAX_SAFE_INTEGER,
      burst: Number.MAX_SAFE_INTEGER,
      concurrent: 64,
      retryAfterMs: { min: 1, max: 2 },
    }),
  },
});

const presenceScope = {
  topic: "organization.presence",
  organizationId: "organization-1",
} as const;

const scenarios = {
  "connection.ping": [commandFrame({ type: "connection.ping", data: {} })],
  "presence.heartbeat": [
    commandFrame({
      type: "presence.heartbeat",
      data: { sessionId: "presence-1" },
    }),
  ],
  "map-ping.send": [
    commandFrame({
      type: "map-ping.send",
      data: { expectedMapId: 7, type: "enemy", x: 10, y: 11 },
    }),
  ],
  "air-tag.observation": [
    commandFrame({
      type: "air-tag.observation",
      data: {
        expectedMapId: 7,
        observations: [
          { targetId: "target", nickname: "Enemy", relation: 3, x: 1, y: 2 },
        ],
      },
    }),
  ],
  // Alternates so every subscribe changes the socket's subscriptions.
  "subscription.subscribe+unsubscribe": [
    commandFrame({ type: "subscription.subscribe", data: presenceScope }),
    commandFrame({ type: "subscription.unsubscribe", data: presenceScope }),
  ],
} satisfies Record<string, ReadonlyArray<string>>;

for (const [scenario, frames] of Object.entries(scenarios)) {
  let responses = 0;
  let lastResponse = "";
  const socket = makeGamePingSocket();

  socket.data.airTagScopes = [
    {
      guildId: "organization-1",
      world: "classic",
      mapId: 7,
      subscription: {
        topic: "map.air-tags",
        organizationId: "organization-1",
        world: "classic",
        mapId: 7,
      },
    },
  ];

  socket.send = (text: string | Uint8Array) => {
    responses++;
    lastResponse = String(text);

    return 1;
  };

  hub.register(socket);

  const run = async (count: number) => {
    // Both counts are multiples of every scenario's frame count.
    for (let index = 0; index < count; index += frames.length)
      for (const input of frames)
        await Effect.runPromise(handler.handle(socket, input));
  };

  await run(warmupCommands);
  responses = 0;
  const started = performance.now();
  const cpuStarted = process.cpuUsage();

  await run(commands);
  const cpu = process.cpuUsage(cpuStarted);
  const wallMs = performance.now() - started;

  hub.detach(socket);

  assert.equal(responses, commands);
  assert.match(lastResponse, /"status":"success"/);
  assert.doesNotMatch(lastResponse, /"rejected"/);
  console.log(
    JSON.stringify({
      scenario,
      commands,
      warmupCommands,
      wallMs: Math.round(wallMs),
      cpuMs: (cpu.user + cpu.system) / 1_000,
      microsecondsPerCommand:
        Math.round(((wallMs * 1_000) / commands) * 1_000) / 1_000,
      commandsPerSecond: Math.round(commands / (wallMs / 1_000)),
    }),
  );
}
