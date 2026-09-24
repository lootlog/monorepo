import { expect, test } from "bun:test";
import { Effect, Layer, Metric } from "effect";
import { HttpBody, HttpClient } from "effect/unstable/http";
import {
  OtlpExporter,
  OtlpMetrics,
  OtlpSerialization,
} from "effect/unstable/observability";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { GatewayConnectionMetrics } from "./connection-metrics.js";
import type { GatewaySocket } from "./session.js";

const socket = (): GatewaySocket => ({
  data: {
    connectionId: "private-connection",
    userId: "private-user",
    discordId: "private-discord",
    platform: "game",
    joined: true,
    guilds: [],
    subscriptions: new Map(),
    airTagScopes: [],
    confidence: "reported",
    backpressureStrikes: 0,
  },
  close: () => {},
  send: () => 1,
  getBufferedAmount: () => 0,
});

const sample = () =>
  Effect.runSync(Metric.snapshot).filter(({ id }) =>
    id.startsWith("lootlog_gateway_connection"),
  );

const lifetimeState = (snapshots: ReturnType<typeof sample>, cause: string) => {
  const metric = snapshots.find(
    ({ id, attributes }) =>
      id === "lootlog_gateway_connection_lifetime_seconds" &&
      attributes?.platform === "game" &&
      attributes?.joined === "yes" &&
      attributes?.cause === cause,
  );

  return metric?.type === "Histogram" ? metric.state : undefined;
};

test("records a closed connection once and bounds labels for untrusted close codes", () => {
  let now = 1_000;
  const metrics = new GatewayConnectionMetrics(() => now);

  const before = sample();
  const value = socket();
  metrics.open(value);
  now += 4_000;
  metrics.close(value, 4001);
  metrics.close(value, 4001);

  const timeoutBefore = lifetimeState(before, "heartbeat_timeout");
  const timeout = lifetimeState(sample(), "heartbeat_timeout");
  expect((timeout?.count ?? 0) - (timeoutBefore?.count ?? 0)).toBe(1);
  expect((timeout?.sum ?? 0) - (timeoutBefore?.sum ?? 0)).toBe(4);

  for (let code = 4100; code < 4200; code++) {
    const connection = socket();
    metrics.open(connection);
    metrics.close(connection, code);
  }

  const after = sample();

  const others = lifetimeState(after, "other");
  const othersBefore = lifetimeState(before, "other");
  expect((others?.count ?? 0) - (othersBefore?.count ?? 0)).toBe(100);
  expect(after.length - before.length).toBeLessThanOrEqual(3);
  expect(JSON.stringify(after)).not.toContain("private-");
});

test("exports connections longer than a day without losing histogram observations", async () => {
  let now = 0;
  const metrics = new GatewayConnectionMetrics(() => now);

  for (const seconds of [2, 50_000, 100_000, 200_000]) {
    const connection = socket();
    metrics.open(connection);
    now += seconds * 1_000;
    metrics.close(connection, 1000);
  }

  const exports: OtlpMetrics.MetricsData[] = [];

  const exporter = OtlpMetrics.layer({
    url: "http://metrics.local/v1/metrics",
    resource: { serviceName: "gateway-test" },
    exportInterval: "1 hour",
  }).pipe(
    Layer.provide(
      Layer.succeed(OtlpSerialization.OtlpSerialization, {
        traces: HttpBody.jsonUnsafe,
        logs: HttpBody.jsonUnsafe,
        metrics: (data) => {
          exports.push(data);

          return HttpBody.jsonUnsafe(data);
        },
      }),
    ),
    Layer.provide(
      Layer.succeed(
        HttpClient.HttpClient,
        httpClientFromResponses(() => Effect.succeed(new Response())),
      ),
    ),
  );

  await Effect.runPromise(
    Effect.gen(function* () {
      yield* (yield* OtlpExporter.Flusher).flush;
    }).pipe(Effect.provide(exporter)),
  );

  const exportedMetrics = exports
    .flatMap(({ resourceMetrics }) => resourceMetrics)
    .flatMap(({ scopeMetrics }) => scopeMetrics)
    .flatMap(({ metrics }) => metrics);

  const histogram = exportedMetrics.find(
    ({ name }) => name === "lootlog_gateway_connection_lifetime_seconds",
  );

  expect(histogram?.unit).toBe("s");

  const point = histogram?.histogram?.dataPoints.find(({ attributes }) =>
    attributes?.some(
      ({ key, value }) => key === "cause" && value.stringValue === "normal",
    ),
  );

  expect(point).toBeDefined();
  expect(point?.explicitBounds).toContain(86_400);
  expect(
    point?.bucketCounts?.reduce((sum, count) => sum + Number(count), 0),
  ).toBe(Number(point?.count));
  expect(Number(point?.bucketCounts?.at(-1))).toBeGreaterThanOrEqual(2);
  expect(
    exportedMetrics.find(
      ({ name }) => name === "lootlog_gateway_connections_opened_total",
    )?.sum?.isMonotonic,
  ).toBe(true);
});
