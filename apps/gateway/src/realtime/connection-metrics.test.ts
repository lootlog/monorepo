import { expect, test } from "bun:test";
import { Effect, Metric } from "effect";
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

test("records a closed connection once and bounds labels for untrusted close codes", () => {
  let now = 1_000;
  const metrics = new GatewayConnectionMetrics(() => now);

  const sample = () =>
    Effect.runSync(Metric.snapshot).filter(({ id }) =>
      id.startsWith("lootlog_gateway_connection"),
    );

  const before = sample();
  const value = socket();
  metrics.open(value);
  now += 4_000;
  metrics.close(value, 4001);
  metrics.close(value, 4001);

  const timeout = sample().find(
    ({ id, attributes }) =>
      id === "lootlog_gateway_connection_lifetime_seconds" &&
      attributes?.cause === "heartbeat_timeout",
  );

  expect(timeout?.state).toMatchObject({ count: 1, sum: 4 });

  for (let code = 4100; code < 4200; code++) {
    const connection = socket();
    metrics.open(connection);
    metrics.close(connection, code);
  }

  const after = sample();

  const others = after.filter(
    ({ attributes }) => attributes?.cause === "other",
  );

  expect(others).toHaveLength(2);
  expect(others.find(({ type }) => type === "Counter")?.state).toMatchObject({
    count: 100,
  });
  expect(after.length - before.length).toBe(5);
  expect(JSON.stringify(after)).not.toContain("private-");
});
