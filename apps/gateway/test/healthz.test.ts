import { describe, expect, test } from "bun:test";
import { httpServerRequestCount } from "@lootlog/instrumentation";
import {
  ConfigProvider,
  Effect,
  Layer,
  ManagedRuntime,
  Metric,
  Schema,
  Redacted,
} from "effect";
import { makeObservabilityLayer } from "@lootlog/instrumentation/observability";
import { Permission } from "@lootlog/schema/permissions";
import { makeGatewayAuth } from "../src/auth/auth-service.js";
import type { UserGuildData } from "../src/guilds/guild.js";
import type { GatewayHttpDependencies } from "../src/http-api/gateway-http.js";

import { createGatewayFetch } from "../src/app.js";

const auth = makeGatewayAuth({
  allowedWebOrigins: new Set(["https://lootlog.example"]),
  allowedExtensionOrigins: new Set(),
});

const hub = { unavailableReason: () => undefined };

const memberGrant = (
  organizationId: string,
  permissions: ReadonlyArray<Permission>,
): UserGuildData => ({
  guild: { id: organizationId, ownerId: "discord-owner" },
  roles: [{ id: "role", lvlRangeFrom: 0, lvlRangeTo: 500, permissions }],
});

const grantsByDiscordId = new Map<string, UserGuildData[]>([
  [
    "discord-reader",
    [memberGrant("organization-1", [Permission.LOOTLOG_ONLINE_PLAYERS_READ])],
  ],
  [
    "discord-member",
    [
      memberGrant("organization-1", [Permission.LOOTLOG_ACCESS]),
      memberGrant("organization-2", [Permission.LOOTLOG_ONLINE_PLAYERS_READ]),
    ],
  ],
]);

const snapshotReads: Array<{ organizationId: string; world?: string }> = [];

const onlinePresence = {
  userId: "user-2",
  discordId: "discord-2",
  sessionId: "session-2",
  organizationIds: ["organization-1"],
  platform: "game" as const,
  status: "online" as const,
  confidence: "verified" as const,
  isAfk: false,
  lastSeen: 1,
};

const guilds: GatewayHttpDependencies["guilds"] = {
  getUserGuilds: ({ discordId }) =>
    Effect.succeed(grantsByDiscordId.get(discordId) ?? []),
};

const presence: GatewayHttpDependencies["presence"] = {
  snapshot: (_viewer, organizationId, world) =>
    Effect.sync(() => {
      snapshotReads.push({ organizationId, world });

      return {
        organizationId,
        world,
        revision: 1,
        presences: [onlinePresence],
      };
    }),
};

const application = {
  config: { websocketPath: "/ws", environment: "test" },
  runPromise: Effect.runPromise,
  auth,
  hub,
  guilds,
  presence,
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

  test("withdraws readiness and refuses upgrades while liveness stays up", async () => {
    let reason: "draining" | "federation-unavailable" | undefined =
      "federation-unavailable";

    let upgraded = false;

    const fetch = createGatewayFetch({
      ...application,
      hub: { unavailableReason: () => reason },
    });

    const request = (path: string) =>
      fetch(
        new Request(`https://gateway.example${path}`, {
          headers: {
            origin: "https://classic.margonem.pl",
            "x-auth-user-id": "user-1",
            "x-auth-discord-id": "discord-1",
          },
        }),
        {
          upgrade: () => {
            upgraded = true;

            return true;
          },
        },
      );

    expect((await request("/healthz"))?.status).toBe(200);
    const unready = await request("/readyz");
    expect(unready?.status).toBe(503);
    expect(await unready?.json()).toEqual({
      status: "unavailable",
      reason: "federation-unavailable",
    });
    expect((await request("/ws"))?.status).toBe(503);
    expect(upgraded).toBe(false);

    reason = "draining";
    expect(await (await request("/readyz"))?.json()).toEqual({
      status: "unavailable",
      reason: "draining",
    });

    reason = undefined;
    const ready = await request("/readyz");
    expect(ready?.status).toBe(200);
    expect(await ready?.json()).toEqual({ status: "ready" });
    expect(await request("/ws")).toBeUndefined();
    expect(upgraded).toBe(true);
  });

  test("serves Organization presence only to viewers allowed to read online players there", async () => {
    snapshotReads.length = 0;
    const fetch = createGatewayFetch(application);

    const read = (discordId?: string) =>
      fetch(
        new Request(
          "https://gateway.example/organizations/organization-1/presence?world=Aldous",
          {
            headers: discordId
              ? { "x-auth-user-id": "user-1", "x-auth-discord-id": discordId }
              : {},
          },
        ),
        server,
      );

    expect((await read())?.status).toBe(401);
    // Online-player access in another Organization grants nothing here.
    expect((await read("discord-member"))?.status).toBe(403);
    expect(snapshotReads).toEqual([]);

    const allowed = await read("discord-reader");

    const { discordId: _discordId, ...presenceWithoutDiscordId } =
      onlinePresence;

    expect(allowed?.status).toBe(200);
    // Discord identities never leave the realtime protocol over HTTP.
    expect(await allowed?.json()).toEqual({
      organizationId: "organization-1",
      world: "Aldous",
      revision: 1,
      presences: [presenceWithoutDiscordId],
    });
    expect(snapshotReads).toEqual([
      { organizationId: "organization-1", world: "Aldous" },
    ]);
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
    [false, false, false, false, false, false],
    [true, false, false, false, false, false],
    [false, true, false, false, false, false],
    [false, false, true, false, false, false],
    [false, false, false, true, false, false],
    [false, false, false, false, true, false],
    [false, false, false, false, false, true],
    [true, true, true, true, true, true],
  ])(
    "negotiates feed (%s), volunteer (%s), battle ping (%s), team ping (%s), gathering state (%s) and session hello (%s) opt-in while echoing only the wire protocol",
    async (
      supportsFeed,
      supportsNotificationVolunteer,
      supportsBattlePings,
      supportsTeamBattlePings,
      supportsPartyGatheringState,
      supportsSessionHello,
    ) => {
      let upgradeOptions:
        | {
            readonly headers?: HeadersInit;
            readonly data: {
              readonly supportsFeed?: boolean;
              readonly supportsNotificationVolunteer?: boolean;
              readonly supportsBattlePings?: boolean;
              readonly supportsTeamBattlePings?: boolean;
              readonly supportsPartyGatheringState?: boolean;
              readonly supportsSessionHello?: boolean;
            };
          }
        | undefined;

      const authenticated = {
        config: { websocketPath: "/ws", environment: "test" },
        runPromise: Effect.runPromise,
        auth,
        hub,
        guilds,
        presence,
      };

      const request = new Request("https://gateway.example/ws", {
        headers: {
          origin: "https://classic.margonem.pl",
          "x-auth-user-id": "user-1",
          "x-auth-discord-id": "discord-1",
          "sec-websocket-protocol": `lootlog.realtime.v1${supportsFeed ? ", lootlog.feed.v1" : ""}${supportsNotificationVolunteer ? ", lootlog.notification-volunteer.v1" : ""}${supportsBattlePings ? ", lootlog.battle-ping.v1" : ""}${supportsTeamBattlePings ? ", lootlog.battle-ping.team.v1" : ""}${supportsPartyGatheringState ? ", lootlog.party-gathering-state.v1" : ""}${supportsSessionHello ? ", lootlog.session-hello.v1" : ""}`,
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
      expect(upgradeOptions?.data.supportsBattlePings).toBe(
        supportsBattlePings,
      );
      expect(upgradeOptions?.data.supportsTeamBattlePings).toBe(
        supportsTeamBattlePings,
      );
      expect(upgradeOptions?.data.supportsPartyGatheringState).toBe(
        supportsPartyGatheringState,
      );
      expect(upgradeOptions?.data.supportsSessionHello).toBe(
        supportsSessionHello,
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
      hub,
      guilds,
      presence,
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

test("server API key upgrades allow absent Origin while preserving session and attacker Origin rejection", async () => {
  const keyAuth = makeGatewayAuth({
    allowedWebOrigins: new Set(["https://lootlog.example"]),
    allowedExtensionOrigins: new Set(),
    authUrl: "http://auth.internal",
    apiKeyStatusSecret: Redacted.make("test"),
  });

  const fetch = createGatewayFetch({ ...application, auth: keyAuth });

  const headers = {
    "sec-websocket-protocol":
      "lootlog.realtime.v1, lootlog.party-gathering-state.v1",
    "x-auth-user-id": "u",
    "x-auth-discord-id": "d",
    "x-auth-api-key-access": JSON.stringify({
      keyId: "key",
      organizationIds: ["123"],
      mode: "read",
      personalData: false,
      expiresAt: null,
    }),
  };

  let upgraded = false;
  expect(
    await fetch(new Request("https://gateway.example/ws", { headers }), {
      upgrade: (_request, options) => {
        upgraded = true;
        expect(options.data.platform).toBe("web-app");
        expect(options.data.apiKeyAccess?.organizationIds).toEqual(["123"]);
        expect(options.data.supportsNotificationVolunteer).toBe(false);
        expect(options.data.supportsPartyGatheringState).toBe(false);

        return true;
      },
    }),
  ).toBeUndefined();
  expect(upgraded).toBe(true);
  expect(
    (
      await fetch(
        new Request("https://gateway.example/ws", {
          headers: { ...headers, origin: "https://attacker.example" },
        }),
        server,
      )
    )?.status,
  ).toBe(403);
  expect(
    (
      await fetch(
        new Request("https://gateway.example/ws", {
          headers: { "x-auth-user-id": "u", "x-auth-discord-id": "d" },
        }),
        server,
      )
    )?.status,
  ).toBe(403);
});
