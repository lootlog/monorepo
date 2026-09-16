/** Synthetic CPU benchmark, not a production capacity estimate.
 * Run: bun --conditions=development tools/benchmark-response-conversion.ts
 * Routes use Effect's real HTTP encoder in memory; no app/server is started.
 * Excludes authentication, database and request network; uses real observability
 * with a disposable local OTLP sink.
 */
import { BunHttpServer } from "@effect/platform-bun";
import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";
import {
  decodeDomainJson,
  type DomainJsonValue,
} from "../src/http-api/domain-json.schema.js";
import { TimersResponse } from "../src/contracts/timers/schemas.js";
import { ChatMessagesResponse } from "../src/contracts/chat/schemas.js";
import { ActivePartyGatheringsResponse } from "../src/contracts/party-ready-room/schemas.js";
import { decodeTimersResponse } from "../src/http-api/handlers/timers/timer-response.schema.js";
import { ChatMessagesDomainResponse } from "../src/http-api/handlers/chat/chat.handlers.js";
import { ActivePartyGatheringsDomainResponse } from "../src/http-api/handlers/party-ready-room/party-ready-room.handlers.js";

const printResult = (value: string) => {
  process.stdout.write(`${value}\n`);
};

const date = new Date("2026-09-16T08:00:00.000Z");

const timer = (index: number, relations: boolean) => {
  const base = {
    guildId: "fixture-organization",
    npcId: index,
    timerKey: `${index}:fixture`,
    world: "fixture",
    minSpawnTime: date,
    maxSpawnTime: date,
    updatedAt: date,
    deletedAt: null,
    wasReset: false,
    npc: {
      id: index,
      name: "Fixture NPC",
      prof: "w",
      location: "Fixture",
      wt: "10",
      lvl: 100,
      type: "ELITE2",
      icon: null,
      margonemType: "npc",
    },
  };

  if (!relations) return base;

  return {
    ...base,
    member: {
      id: 1,
      userId: "fixture-user",
      guildId: "fixture-organization",
      type: "USER",
      name: "Fixture member",
      active: true,
      roles: [],
      updatedAt: date,
      lastDiscordSyncAt: date,
      lastDiscordAttemptAt: null,
      nextRefreshAt: date,
    },
    actorCharacter: {
      name: "Fixture",
      prof: "WARRIOR",
      icon: null,
      lvl: 100,
      characterId: 1,
      accountId: 1,
    },
  };
};

const chat = Array.from({ length: 100 }, (_, index) => ({
  id: `message-${index}`,
  guildId: "fixture-organization",
  senderId: "fixture-user",
  message: "Fixture message",
  timestamp: date.toISOString(),
  type: "NORMAL",
  canDelete: false,
  characterData: {
    nick: "Fixture",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "fixture.png",
  },
}));

const parties = Array.from({ length: 20 }, (_, index) => ({
  notificationId: `fixture-${index}`,
  organizerName: "Fixture",
  applicantCount: 2,
  inPartyCount: 1,
  guildIds: ["fixture-organization"],
  world: "fixture",
  createdAt: date.toISOString(),
  expiresAt: date.toISOString(),
}));

const decodeChat = Schema.decodeUnknownEffect(ChatMessagesDomainResponse);

const cases: ReadonlyArray<{
  name: string;
  value: DomainJsonValue;
  schema: Schema.Codec<unknown>;
  decode: (value: DomainJsonValue) => Effect.Effect<unknown, unknown>;
  warmup: number;
  iterations: number;
}> = [
  ...[100, 1000].flatMap((size) =>
    [false, true].map((relations) => ({
      name: `${size} timers${relations ? " with relations" : ""}`,
      value: Array.from({ length: size }, (_, i) => timer(i, relations)),
      schema: TimersResponse,
      decode: decodeTimersResponse,
      warmup: 20,
      iterations: 100,
    })),
  ),
  {
    name: "100 chat messages",
    value: chat,
    schema: ChatMessagesResponse,
    decode: decodeChat,
    warmup: 20,
    iterations: 100,
  },
  {
    name: "20 active parties",
    value: parties,
    schema: ActivePartyGatheringsResponse,
    decode: Schema.decodeUnknownEffect(ActivePartyGatheringsDomainResponse),
    warmup: 100,
    iterations: 1000,
  },
];

const percentile = (values: number[], p: number) =>
  [...values].sort((a, b) => a - b)[
    Math.min(values.length - 1, Math.floor(values.length * p))
  ] ?? 0;

const round = (n: number) => Number(n.toFixed(4));

const operation = (run: () => void, warmup: number, iterations: number) => {
  for (let i = 0; i < warmup; i++) run();
  const batches: number[] = [];

  for (let batch = 0; batch < 5; batch++) {
    const start = performance.now();

    for (let i = 0; i < iterations; i++) run();
    batches.push((performance.now() - start) / iterations);
  }

  return round(percentile(batches, 0.5));
};

async function route<A>(
  name: string,
  schema: Schema.Codec<A>,
  run: () => Effect.Effect<A, unknown>,
) {
  const group = HttpApiGroup.make("fixture").add(
    HttpApiEndpoint.get("read", "/fixture", { success: schema }),
  );

  const api = HttpApi.make("fixture").add(group);

  const boundary = HttpRouter.toWebHandler(
    HttpApiBuilder.layer(api).pipe(
      Layer.provide(
        HttpApiBuilder.group(api, "fixture", (handlers) =>
          handlers.handle("read", () => run().pipe(Effect.orDie)),
        ),
      ),
      Layer.provide(BunHttpServer.layerHttpServices),
      Layer.provide(
        makeObservabilityLayer(
          Effect.succeed({
            serviceName: "response-conversion-benchmark",
            environment: "benchmark",
            serviceNamespace: "fixture",
          }),
        ),
      ),
    ),
    { disableLogger: true },
  );

  const request = async () => {
    const response = await boundary.handler(
      new Request("http://fixture/fixture"),
    );

    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    await response.text();
  };

  try {
    for (let i = 0; i < 20; i++) await request();

    const latencies: number[] = [],
      lag: number[] = [];

    let due = performance.now() + 5;

    const interval = setInterval(() => {
      const now = performance.now();
      lag.push(Math.max(0, now - due));
      due = now + 5;
    }, 5);

    const cpu = process.cpuUsage(),
      start = performance.now();

    let count = 0;

    while (performance.now() - start < 5500) {
      // Eight requests per turn, then yield so timer delay can be sampled.
      await Promise.all(
        Array.from({ length: 8 }, async () => {
          const start = performance.now();
          await request();
          latencies.push(performance.now() - start);
          count++;
        }),
      );
      await Bun.sleep(0);
    }

    const elapsed = performance.now() - start,
      used = process.cpuUsage(cpu);

    clearInterval(interval);
    printResult(
      JSON.stringify({
        kind: "in-memory-http",
        name,
        requests: count,
        cpuMsPerRequest: round((used.user + used.system) / 1000 / count),
        requestsPerSecond: round((count / elapsed) * 1000),
        responseMs: {
          p50: round(percentile(latencies, 0.5)),
          p95: round(percentile(latencies, 0.95)),
          p99: round(percentile(latencies, 0.99)),
        },
        eventLoopDelayMs: {
          samples: lag.length,
          p50: round(percentile(lag, 0.5)),
          p95: round(percentile(lag, 0.95)),
          p99: round(percentile(lag, 0.99)),
        },
      }),
    );
  } finally {
    await boundary.dispose();
  }
}

// A disposable loopback sink keeps production OTLP serialization/export active without sending telemetry externally.
const collector = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    await request.arrayBuffer();

    return Response.json({});
  },
});

process.env.OTEL_EXPORTER_OTLP_ENDPOINT = collector.url.toString();

process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = new URL(
  "v1/traces",
  collector.url,
).toString();

process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT = new URL(
  "v1/metrics",
  collector.url,
).toString();

process.env.OTEL_SDK_DISABLED = "false";

process.env.OTEL_TRACES_EXPORTER = "otlp";

process.env.OTEL_METRICS_EXPORTER = "otlp";

printResult(
  JSON.stringify({
    runtime: Bun.version,
    fixtures: "synthetic; not observed production distributions",
    route:
      "Effect HttpRouter in memory, concurrency 8; production observability layer + loopback OTLP sink; no request network, auth or database; event-loop timer 5ms",
  }),
);

try {
  for (const fixture of cases) {
    if (process.argv[2] && !fixture.name.includes(process.argv[2])) continue;

    const legacy = () =>
      Effect.runSync(decodeDomainJson(fixture.schema, fixture.value));

    const current = () => Effect.runSync(fixture.decode(fixture.value));

    if (JSON.stringify(legacy()) !== JSON.stringify(current()))
      throw new Error(`Output mismatch: ${fixture.name}`);
    printResult(
      JSON.stringify({
        kind: "operation",
        name: fixture.name,
        bytes: new TextEncoder().encode(JSON.stringify(current())).length,
        legacyMs: operation(legacy, fixture.warmup, fixture.iterations),
        currentMs: operation(current, fixture.warmup, fixture.iterations),
      }),
    );
    await route(`${fixture.name}: legacy`, fixture.schema, () =>
      decodeDomainJson(fixture.schema, fixture.value),
    );
    await route(`${fixture.name}: current`, fixture.schema, () =>
      fixture.decode(fixture.value),
    );
  }
} finally {
  await collector.stop(true);
}
