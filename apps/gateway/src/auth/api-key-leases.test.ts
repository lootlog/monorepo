import { expect, test } from "bun:test";
import { Effect, Fiber, Redacted } from "effect";
import { TestClock } from "effect/testing";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { ApiKeyLeases } from "./api-key-leases.js";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

const config = {
  authUrl: "https://auth.internal",
  apiKeyStatusSecret: Redacted.make("test"),
};
function socket(keyId: string, userId = "u", discordId = "d") {
  const closes: number[] = [];
  const data: SessionData = {
    userId,
    discordId,
    connectionId: crypto.randomUUID(),
    platform: "web-app",
    joined: true,
    guilds: [],
    subscriptions: new Map(),
    airTagScopes: [],
    confidence: "reported",
    backpressureStrikes: 0,
    apiKeyAccess: {
      keyId,
      organizationIds: ["123"],
      mode: "read",
      personalData: false,
      expiresAt: null,
    },
    apiKeyLeaseExpiresAt: 60_000,
  };
  const result: GatewaySocket = {
    data,
    close: (code) => {
      closes.push(code ?? 1000);
    },
    send: () => 0,
    getBufferedAmount: () => 0,
  };
  return { socket: result, closes };
}

test("renewal batches duplicate keys and refreshes a shared user once before extending leases", async () => {
  const first = socket("k"),
    second = socket("k");
  let calls = 0,
    refreshes = 0;
  const client = httpClientFromResponses(() => {
    calls += 1;
    return Effect.succeed(
      Response.json({
        keys: [
          {
            keyId: "k",
            valid: true,
            userId: "u",
            discordId: "d",
            access: first.socket.data.apiKeyAccess,
          },
        ],
      }),
    );
  });
  const leases = new ApiKeyLeases(
    config,
    client,
    () => [first.socket, second.socket],
    () =>
      Effect.sync(() => {
        refreshes += 1;
      }),
    () => 30_000,
  );
  await Effect.runPromise(leases.renew());
  expect(calls).toBe(1);
  expect(refreshes).toBe(1);
  expect(first.socket.data.apiKeyLeaseExpiresAt).toBe(90_000);
  expect(second.socket.data.apiKeyLeaseExpiresAt).toBe(90_000);
  expect(first.closes).toEqual([]);
});

test("revocation, unavailable auth and already expired authorization fail closed", async () => {
  for (const response of [
    Response.json({ keys: [{ keyId: "k", valid: false }] }),
    new Response(null, { status: 503 }),
  ]) {
    const target = socket("k");
    const leases = new ApiKeyLeases(
      config,
      httpClientFromResponses(() => Effect.succeed(response)),
      () => [target.socket],
      () => Effect.void,
      () => 30_000,
    );
    await Effect.runPromise(leases.renew());
    expect(target.closes).toEqual([1008]);
    expect(target.socket.data.apiKeyLeaseExpiresAt).toBe(0);
  }
  const target = socket("k");
  const leases = new ApiKeyLeases(
    config,
    httpClientFromResponses(() =>
      Effect.die("Expired key must not be renewed"),
    ),
    () => [target.socket],
    () => Effect.void,
    () => 60_000,
  );
  await Effect.runPromise(leases.renew());
  expect(target.closes).toEqual([1008]);
});

test("slow independent user refreshes share the renewal deadline concurrently", async () => {
  const targets = Array.from({ length: 16 }, (_, index) =>
    socket(`k${index}`, `u${index}`, `d${index}`),
  );
  let active = 0;
  let peak = 0;
  let completed = 0;
  const leases = new ApiKeyLeases(
    config,
    httpClientFromResponses(() =>
      Effect.succeed(
        Response.json({
          keys: targets.map(({ socket: { data } }) => ({
            keyId: data.apiKeyAccess?.keyId,
            valid: true,
            userId: data.userId,
            discordId: data.discordId,
            access: data.apiKeyAccess,
          })),
        }),
      ),
    ),
    () => targets.map((target) => target.socket),
    () =>
      Effect.gen(function* () {
        active += 1;
        peak = Math.max(peak, active);
        yield* Effect.sleep("3 seconds");
        active -= 1;
        completed += 1;
      }),
    () => 30_000,
  );
  await Effect.runPromise(
    Effect.gen(function* () {
      const renewal = yield* leases.renew().pipe(Effect.forkChild);
      yield* TestClock.adjust("16 seconds");
      yield* Fiber.join(renewal);
    }).pipe(Effect.provide(TestClock.layer())),
  );
  expect(completed).toBe(16);
  expect(peak).toBeGreaterThan(1);
  expect(peak).toBeLessThanOrEqual(8);
  for (const target of targets) {
    expect(target.closes).toEqual([]);
    expect(target.socket.data.apiKeyLeaseExpiresAt).toBe(90_000);
  }
});

test("failed, timed out or expired refreshes never extend authority", async () => {
  for (const outcome of ["failure", "timeout", "expired"] as const) {
    const target = socket("k");
    let now = 30_000;
    const leases = new ApiKeyLeases(
      config,
      httpClientFromResponses(() =>
        Effect.succeed(
          Response.json({
            keys: [
              {
                keyId: "k",
                valid: true,
                userId: "u",
                discordId: "d",
                access: target.socket.data.apiKeyAccess,
              },
            ],
          }),
        ),
      ),
      () => [target.socket],
      () => {
        if (outcome === "failure") return Effect.fail(new Error("unavailable"));
        if (outcome === "timeout") return Effect.never;
        return Effect.sync(() => {
          now = 60_000;
        });
      },
      () => now,
    );
    await Effect.runPromise(
      Effect.gen(function* () {
        const renewal = yield* leases.renew().pipe(Effect.forkChild);
        yield* TestClock.adjust("16 seconds");
        yield* Fiber.join(renewal);
      }).pipe(Effect.provide(TestClock.layer())),
    );
    expect(target.closes).toEqual([1008]);
    expect(target.socket.data.apiKeyLeaseExpiresAt).toBe(0);
  }
});
