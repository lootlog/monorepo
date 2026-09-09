import { describe, expect, it } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer, Redacted, Queue } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import {
  ActivityRepository,
  type ActivityRepositoryValue,
} from "#src/activities/activity-repository";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Redis } from "effect/unstable/persistence";
import { ActivityConfig } from "#src/config/activity-config";
import { ApiHttpClient, ApiHttpClientFailure } from "#src/http/api-http-client";
import { OnlineRepository } from "#src/online/online-repository";
import { Permissions } from "#src/activities/activity-permissions";
import {
  ActivityHealth,
  ActivityRoutes,
  type ActivityHealthValue,
} from "./activity-http.js";

const repository: ActivityRepositoryValue = {
  create: () => Effect.succeed({}),
  clearActiveSessionsForMember: () => Effect.void,
  findMany: (query) =>
    Effect.succeed({
      data: [{ guildId: query.guildId, userId: query.userId }],
      hasMore: false,
    }),
  findOne: (id, guildId) => Effect.succeed({ id, guildId }),
  deleteOne: () => Effect.succeed(1),
  memberStats: () => Effect.succeed([]),
  suggestActorNames: () => Effect.succeed(["Hero"]),
  suggestWorlds: () => Effect.succeed(["Tempest"]),
  suggestClanNames: () => Effect.succeed(["Clan"]),
};
const health: ActivityHealthValue = {
  check: () =>
    Effect.succeed({ status: "ok", info: {}, error: null, details: {} }),
};
const unusedOnlineRepository = Layer.succeed(OnlineRepository, {
  ingest: () =>
    Effect.die(new Error("Unexpected online ingest in activity route test")),
  find: () =>
    Effect.die(new Error("Unexpected online query in activity route test")),
  prune: () =>
    Effect.die(new Error("Unexpected online pruning in activity route test")),
});

const makeBoundary = (capabilities: Permission[]) => {
  const routes = ActivityRoutes.pipe(
    Layer.provideMerge(Layer.succeed(ActivityRepository, repository)),
    Layer.provideMerge(Layer.succeed(ActivityHealth, health)),
    Layer.provideMerge(
      Layer.succeed(
        Permissions,
        Permissions.of({
          resolveGuildId: (id) => Effect.succeed(id === "vanity" ? "123" : id),
          getUserGuildPermissions: () => Effect.succeed(capabilities),
        }),
      ),
    ),
    Layer.provideMerge(unusedOnlineRepository),
    Layer.provide(HttpServer.layerServices),
  );
  const boundary = HttpRouter.toWebHandler(routes, { disableLogger: true });
  return {
    dispose: boundary.dispose,
    handler: boundary.handler,
  };
};
const headers = {
  authorization: "Bearer forwarded",
  "x-auth-discord-id": "discord",
  "x-auth-user-id": "user",
};

describe("Activity HttpApi contract", () => {
  it("requires the deployed forward-auth headers", async () => {
    const boundary = makeBoundary([Permission.ADMIN]);
    const response = await boundary.handler(
      new Request("https://activity/guilds/g/activity-logs", {
        headers: { authorization: "Bearer forwarded" },
      }),
    );
    expect(response.status).toBe(401);
    await boundary.dispose();
  });

  it("resolves vanity organizations before querying", async () => {
    const boundary = makeBoundary([Permission.ADMIN]);
    const response = await boundary.handler(
      new Request("https://activity/guilds/vanity/activity-logs", { headers }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ guildId: "123" }],
      hasMore: false,
    });
    await boundary.dispose();
  });

  it("requires OWNER for deletion", async () => {
    const admin = makeBoundary([Permission.ADMIN]);
    const owner = makeBoundary([Permission.OWNER]);
    const forbidden = await admin.handler(
      new Request("https://activity/guilds/g/activity-logs/a", {
        method: "DELETE",
        headers,
      }),
    );
    const allowed = await owner.handler(
      new Request("https://activity/guilds/g/activity-logs/a", {
        method: "DELETE",
        headers,
      }),
    );
    expect(forbidden.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ count: 1 });
    await Promise.all([admin.dispose(), owner.dispose()]);
  });

  it("keeps suggestion response envelopes", async () => {
    const boundary = makeBoundary([Permission.ADMIN]);
    const response = await boundary.handler(
      new Request(
        "https://activity/guilds/g/activity-logs/actor-name-suggestions",
        { headers },
      ),
    );
    expect(await response.json()).toEqual({ suggestions: ["Hero"] });
    await boundary.dispose();
  });
});

for (const failure of ["status", "transport", "invalid-body"] as const) {
  it(`returns 503 on ${failure} authorization failure and recovers without caching the failure`, async () => {
    const cache = new Map<string, string>();
    const redis = Redis.Redis.of({
      send: <A>(command: string, ...args: ReadonlyArray<string | number>) =>
        Effect.sync(() => {
          if (command !== "GET" && command !== "SET" && command !== "PING") {
            throw new Error(`Unexpected Redis command: ${command}`);
          }
          if (command === "SET") cache.set(String(args[0]), String(args[1]));
          const reply =
            command === "GET" ? (cache.get(String(args[0])) ?? null) : "OK";
          // SAFETY: These cache scenarios request string | null for GET and ignore SET/PING replies; Redis's caller-selected A is erased at the fake transport boundary.
          return reply as A;
        }),
      subscribe: () => Queue.unbounded<Redis.RedisMessage, Redis.RedisError>(),
      eval:
        <
          Config extends {
            readonly params: ReadonlyArray<unknown>;
            readonly result: unknown;
          },
        >() =>
        (..._params: Config["params"]) =>
          Effect.die("unused"),
    });
    let unavailable = true;
    let permissionRequests = 0;
    const config = ActivityConfig.of({
      environment: RuntimeEnvironment.LOCAL,
      port: 0,
      serviceName: "activity-test",
      serviceNamespace: "test",
      databaseUrl: Redacted.make("postgresql://unused"),
      rabbitmqUri: Redacted.make("amqp://unused"),
      redisUrl: Redacted.make("redis://configured"),
      apiServiceUrl: "http://api.test",
      signatureSecret: Redacted.make("a".repeat(32)),
    });
    const permissions = Permissions.layer.pipe(
      Layer.provide(Layer.succeed(ActivityConfig, config)),
      Layer.provide(Layer.succeed(Redis.Redis, redis)),
      Layer.provide(
        Layer.succeed(
          ApiHttpClient,
          ApiHttpClient.of({
            get: (_operation, url) => {
              if (!String(url).includes("user-permissions"))
                return Effect.succeed({
                  status: 200,
                  body: new TextEncoder().encode(JSON.stringify({ id: "g" })),
                });
              permissionRequests++;
              if (unavailable && failure === "transport")
                return Effect.fail(
                  new ApiHttpClientFailure({
                    operationId: "permissions",
                    reason: "transport",
                    retryable: true,
                  }),
                );
              const body = unavailable
                ? "invalid"
                : JSON.stringify([
                    { guild: { id: "g", ownerId: "discord" }, roles: [] },
                  ]);
              return Effect.succeed({
                status: unavailable && failure === "status" ? 503 : 200,
                body: new TextEncoder().encode(body),
              });
            },
          }),
        ),
      ),
    );
    const boundary = HttpRouter.toWebHandler(
      ActivityRoutes.pipe(
        Layer.provideMerge(permissions),
        Layer.provideMerge(Layer.succeed(ActivityRepository, repository)),
        Layer.provideMerge(Layer.succeed(ActivityHealth, health)),
        Layer.provideMerge(unusedOnlineRepository),
        Layer.provide(HttpServer.layerServices),
      ),
      { disableLogger: true },
    );
    const handler = boundary.handler;
    try {
      const response = await handler(
        new Request("https://activity/guilds/g/activity-logs", { headers }),
      );
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        message: "Authorization service unavailable",
        statusCode: 503,
      });
      expect(cache.has("permissions:user:discord")).toBe(false);
      unavailable = false;
      const recovered = await handler(
        new Request("https://activity/guilds/g/activity-logs", { headers }),
      );
      expect(recovered.status).toBe(200);
      expect(await recovered.json()).toEqual({
        data: [{ guildId: "g" }],
        hasMore: false,
      });
      expect(permissionRequests).toBe(2);
    } finally {
      await boundary.dispose();
    }
  });
}

it("restricts API keys after canonical organization resolution and before writes", async () => {
  const boundary = makeBoundary([Permission.OWNER, Permission.ADMIN]);
  const access = {
    keyId: "key",
    organizationIds: ["123"],
    mode: "read",
    personalData: false,
    expiresAt: null,
  };
  const keyHeaders = {
    ...headers,
    "x-auth-api-key-access": JSON.stringify(access),
  };
  try {
    const allowed = await boundary.handler(
      new Request("https://activity/guilds/vanity/activity-logs", {
        headers: keyHeaders,
      }),
    );
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ data: [{ guildId: "123" }] });
    const denied = await boundary.handler(
      new Request("https://activity/guilds/456/activity-logs", {
        headers: keyHeaders,
      }),
    );
    expect(denied.status).toBe(403);
    const write = await boundary.handler(
      new Request("https://activity/guilds/123/activity-logs/a", {
        method: "DELETE",
        headers: keyHeaders,
      }),
    );
    expect(write.status).toBe(403);
    const personal = await boundary.handler(
      new Request("https://activity/users/@me/activity/online", {
        headers: keyHeaders,
      }),
    );
    expect(personal.status).toBe(403);
  } finally {
    await boundary.dispose();
  }
});
