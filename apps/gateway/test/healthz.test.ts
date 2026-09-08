import { describe, expect, test } from "bun:test";
import { httpServerRequestCount } from "@lootlog/instrumentation";
import {
  ConfigProvider,
  Effect,
  Layer,
  ManagedRuntime,
  Metric,
  Schema,
} from "effect";
import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { makeGatewayAuth } from "../src/auth/auth-service.js";

import { createGatewayFetch } from "../src/app.js";

const auth = makeGatewayAuth({
  allowedWebOrigins: new Set(["https://lootlog.example"]),
  allowedExtensionOrigins: new Set(),
});
const application = {
  config: { websocketPath: "/ws", environment: "test" },
  runPromise: Effect.runPromise,
  auth,
};

const server = { upgrade: () => false };

describe("gateway HTTP boundary", () => {
  test("exports gateway server spans with parent context, status and no credentials", async () => {
    const payloads: unknown[] = [];
    const collector = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      async fetch(request) {
        payloads.push(await request.json());
        return Response.json({});
      },
    });
    const runtime = ManagedRuntime.make(
      makeObservabilityLayer(
        Effect.succeed({
          serviceName: "gateway",
          serviceNamespace: "test",
          environment: "test",
        }),
      ).pipe(
        Layer.provide(
          ConfigProvider.layer(
            ConfigProvider.fromEnvRecord({
              OTEL_TRACES_EXPORTER: "otlp",
              OTEL_METRICS_EXPORTER: "none",
              OTEL_EXPORTER_OTLP_ENDPOINT: collector.url.toString(),
            }),
          ),
        ),
      ),
    );
    const tracedApplication = {
      ...application,
      runPromise: <A, E>(effect: Effect.Effect<A, E>) =>
        runtime.runPromise(effect),
    };
    const fetch = createGatewayFetch(tracedApplication);
    const traceparent =
      "00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-bbbbbbbbbbbbbbbb-01";
    const authenticatedHeaders = {
      traceparent,
      origin: "https://classic.margonem.pl",
      "x-auth-user-id": "user-1",
      "x-auth-discord-id": "discord-1",
    };
    try {
      expect(
        await fetch(
          new Request("https://gateway.example/ws", {
            headers: authenticatedHeaders,
          }),
          { upgrade: () => true },
        ),
      ).toBeUndefined();
      expect(
        (
          await fetch(
            new Request("https://gateway.example/ws", {
              headers: { traceparent, origin: "https://classic.margonem.pl" },
            }),
            server,
          )
        )?.status,
      ).toBe(401);
      expect(
        (
          await fetch(
            new Request("https://gateway.example/ws?ticket=private-secret", {
              headers: authenticatedHeaders,
            }),
            server,
          )
        )?.status,
      ).toBe(400);
      expect(
        (
          await fetch(
            new Request("https://gateway.example/healthz", {
              headers: authenticatedHeaders,
            }),
            server,
          )
        )?.status,
      ).toBe(200);
      const failure = new Error("Upgrade failed");
      await expect(
        fetch(
          new Request("https://gateway.example/ws", {
            headers: authenticatedHeaders,
          }),
          {
            upgrade: () => {
              throw failure;
            },
          },
        ),
      ).rejects.toBe(failure);
    } finally {
      await runtime.dispose();
      await collector.stop(true);
    }
    const decode = Schema.decodeUnknownSync(
      Schema.Struct({
        resourceSpans: Schema.Array(
          Schema.Struct({
            scopeSpans: Schema.Array(
              Schema.Struct({
                spans: Schema.Array(
                  Schema.Struct({
                    traceId: Schema.String,
                    parentSpanId: Schema.String,
                    name: Schema.String,
                    attributes: Schema.Array(
                      Schema.Struct({
                        key: Schema.String,
                        value: Schema.Unknown,
                      }),
                    ),
                  }),
                ),
              }),
            ),
          }),
        ),
      }),
    );
    const spans = payloads.flatMap((payload) =>
      decode(payload).resourceSpans.flatMap((resource) =>
        resource.scopeSpans.flatMap((scope) => scope.spans),
      ),
    );
    expect(spans).toHaveLength(4);
    for (const span of spans) {
      expect(span).toMatchObject({
        traceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        parentSpanId: "bbbbbbbbbbbbbbbb",
        name: "http.server GET",
      });
      expect(span.attributes).toContainEqual({
        key: "http.route",
        value: { stringValue: "/ws" },
      });
    }
    expect(
      spans.map(
        (span) =>
          span.attributes.find(
            (attribute) => attribute.key === "http.response.status_code",
          )?.value,
      ),
    ).toEqual([
      { intValue: 101 },
      { intValue: 401 },
      { intValue: 400 },
      { intValue: 500 },
    ]);
    expect(JSON.stringify(payloads)).not.toContain("private-secret");
    expect(JSON.stringify(payloads)).not.toContain("user-1");
  });

  test("records upgrade failures once and preserves the thrown error", async () => {
    const counter = Metric.withAttributes(httpServerRequestCount, {
      "http.request.method": "GET",
      "http.response.status_code": "500",
      "http.route": "/ws",
    });
    const before = await Effect.runPromise(Metric.value(counter));
    const failure = new Error("Upgrade unavailable");
    await expect(
      createGatewayFetch(application)(
        new Request("https://gateway.example/ws", {
          headers: {
            origin: "https://classic.margonem.pl",
            "x-auth-user-id": "user-1",
            "x-auth-discord-id": "discord-1",
          },
        }),
        {
          upgrade: () => {
            throw failure;
          },
        },
      ),
    ).rejects.toBe(failure);
    const after = await Effect.runPromise(Metric.value(counter));
    expect(after.count - before.count).toBe(1);
  });

  test("keeps the health contract independent from websocket auth", async () => {
    const response = await createGatewayFetch(application)(
      new Request("https://gateway.example/healthz"),
      server,
    );
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ status: "ok" });
  });

  test("rejects credentials in websocket URLs before upgrade", async () => {
    const response = await createGatewayFetch(application)(
      new Request("https://gateway.example/ws?ticket=secret"),
      server,
    );
    expect(response?.status).toBe(400);
  });

  test.each([
    { origin: "https://classic.margonem.pl", status: 401 },
    { origin: "https://attacker.example", status: 403 },
  ])("rejects unauthorized upgrades: %j", async ({ origin, status }) => {
    let upgraded = false;
    const response = await createGatewayFetch(application)(
      new Request("https://gateway.example/ws", { headers: { origin } }),
      {
        upgrade: () => {
          upgraded = true;
          return true;
        },
      },
    );
    expect(response?.status).toBe(status);
    expect(upgraded).toBe(false);
  });

  test.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])(
    "negotiates feed (%s) and volunteer (%s) opt-in while echoing only the wire protocol",
    async (supportsFeed, supportsNotificationVolunteer) => {
      let upgradeOptions:
        | {
            readonly headers?: HeadersInit;
            readonly data: {
              readonly supportsFeed?: boolean;
              readonly supportsNotificationVolunteer?: boolean;
            };
          }
        | undefined;
      const authenticated = {
        config: { websocketPath: "/ws", environment: "test" },
        runPromise: Effect.runPromise,
        auth,
      };
      const request = new Request("https://gateway.example/ws", {
        headers: {
          origin: "https://classic.margonem.pl",
          "x-auth-user-id": "user-1",
          "x-auth-discord-id": "discord-1",
          "sec-websocket-protocol": `lootlog.realtime.v1${supportsFeed ? ", lootlog.feed.v1" : ""}${supportsNotificationVolunteer ? ", lootlog.notification-volunteer.v1" : ""}`,
        },
      });
      const response = await createGatewayFetch(authenticated)(request, {
        upgrade: (_request, options) => {
          upgradeOptions = options;
          return true;
        },
      });
      expect(response).toBeUndefined();
      expect(upgradeOptions?.data).toMatchObject({
        userId: "user-1",
        discordId: "discord-1",
      });
      expect(upgradeOptions?.data.supportsFeed).toBe(supportsFeed);
      expect(upgradeOptions?.data.supportsNotificationVolunteer).toBe(
        supportsNotificationVolunteer,
      );
      expect(upgradeOptions?.headers).toEqual({
        "sec-websocket-protocol": "lootlog.realtime.v1",
      });
    },
  );

  test("uses readable JSON frames locally when the browser strips public subprotocols", async () => {
    let upgradeOptions:
      | {
          readonly data: { readonly frameEncoding?: string };
          readonly headers?: HeadersInit;
        }
      | undefined;
    const authenticated = {
      config: { websocketPath: "/ws", environment: "local" },
      runPromise: Effect.runPromise,
      auth,
    };
    const request = new Request("https://gateway.example/ws", {
      headers: {
        origin: "https://classic.margonem.pl",
        "x-auth-user-id": "user-1",
        "x-auth-discord-id": "discord-1",
      },
    });

    await createGatewayFetch(authenticated)(request, {
      upgrade: (_request, options) => {
        upgradeOptions = options;
        return true;
      },
    });

    expect(upgradeOptions?.data.frameEncoding).toBe("json");
    expect(upgradeOptions?.headers).toBeUndefined();
  });
});
