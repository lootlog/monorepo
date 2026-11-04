import {
  benchmarkConfig,
  makeGamePingSocket,
  unusedFederationStore,
} from "./realtime-fixtures.js";
import assert from "node:assert/strict";
import type { ClientCommand } from "@lootlog/protocol/realtime";
import { Effect } from "effect";
import {
  AIR_TAG_OBSERVATION_ADMISSION_LIMITS,
  CommandAdmission,
} from "#src/realtime/command-admission";
import {
  CommandHandler,
  gatewayFeatureRoutes,
} from "#src/realtime/command-handler";
import { MapPingService } from "#src/realtime/map-ping-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";

// Run with `bun run perf:commands`. This measures the per-command CPU path from
// a received frame to its sent response; Redis and federation I/O resolve at once.
const commands = 200_000;

const warmupCommands = 20_000;

const unexpected = () => Promise.reject(new Error("Unexpected command"));

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

const handler = new CommandHandler(
  {
    getUserGuilds: () => Effect.die("Unexpected guild read"),
    invalidate: () => Effect.void,
  },
  { verify: () => Effect.die("Unexpected proof") },
  () => Effect.void,
  {
    heartbeat: () => Effect.succeed(1_783_000_000_000),
    publish: () => Effect.die("Unexpected presence publish"),
    snapshot: () => Effect.die("Unexpected snapshot"),
    reconcileAccess: () => Effect.void,
  },
  hub,
  { publish: () => Effect.void },
  {
    npcPresence: {
      refresh: () => Promise.resolve(),
      withdraw: () => Promise.resolve(),
    },
    airTags: {
      registerInterest: unexpected,
    },
  },
  gatewayFeatureRoutes({
    mapPings: mapPings,
    battlePings: { send: unexpected },
    lootSplits: { send: unexpected, autoAccept: unexpected },
    airTags: {
      updateSubscription: unexpected,
      publishObservations: unexpected,
      fetchMapThreats: unexpected,
    },
    airTagObservationAdmission: new CommandAdmission(
      AIR_TAG_OBSERVATION_ADMISSION_LIMITS,
    ),
    npcPresence: {
      report: unexpected,
      fetch: unexpected,
    },
  }),
);

type CommandBody<Command> = Command extends unknown
  ? Omit<Command, "v" | "requestId">
  : never;

const frame = (command: CommandBody<ClientCommand>) =>
  JSON.stringify({ v: 1, requestId: "request-1", ...command });

const presenceScope = {
  topic: "organization.presence",
  organizationId: "organization-1",
} as const;

const scenarios = {
  "connection.ping": [frame({ type: "connection.ping", data: {} })],
  "presence.heartbeat": [
    frame({ type: "presence.heartbeat", data: { sessionId: "presence-1" } }),
  ],
  "map-ping.send": [
    frame({
      type: "map-ping.send",
      data: { expectedMapId: 7, type: "enemy", x: 10, y: 11 },
    }),
  ],
  // Alternates so every subscribe changes the socket's subscriptions.
  "subscription.subscribe+unsubscribe": [
    frame({ type: "subscription.subscribe", data: presenceScope }),
    frame({ type: "subscription.unsubscribe", data: presenceScope }),
  ],
} satisfies Record<string, ReadonlyArray<string>>;

for (const [scenario, frames] of Object.entries(scenarios)) {
  let responses = 0;
  let lastResponse = "";
  const socket = makeGamePingSocket();

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
