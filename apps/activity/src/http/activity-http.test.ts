import { describe, expect, it } from "bun:test";
import { PgClient } from "@effect/sql-pg";
import { Reactivity } from "effect/reactivity";
import { SqlClient, SqlError } from "effect/sql";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Layer, Redacted, Queue } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import {
  ActivityRepository,
  type ActivityRepositoryValue,
} from "#src/activities/activity-repository";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Redis } from "effect/persistence";
import { ActivityConfig } from "#src/config/activity-config";
import { ApiHttpClient, ApiHttpClientFailure } from "#src/http/api-http-client";
import { OnlineRepository } from "#src/online/online-repository";
import { Permissions } from "#src/activities/activity-permissions";
import {
  ActivityReadiness,
  ActivityRoutes,
  type ActivityReadinessValue,
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

const readiness: ActivityReadinessValue = {
  check: () =>
    Effect.succeed({
      status: "ok",
      info: { database: { status: "up" } },
      error: null,
      details: { database: { status: "up" } },
    }),
};

const unusedOnlineRepository = Layer.succeed(OnlineRepository, {
  ingest: () =>
    Effect.die(new Error("Unexpected online ingest in activity route test")),
  find: () =>
    Effect.die(new Error("Unexpected online query in activity route test")),
  prune: () =>
    Effect.die(new Error("Unexpected online pruning in activity route test")),
});

const makeBoundary = (
  capabilities: Permission[],
  readinessLayer = Layer.succeed(ActivityReadiness, readiness),
) => {
  const routes = ActivityRoutes.pipe(
    Layer.provideMerge(Layer.succeed(ActivityRepository, repository)),
    Layer.provideMerge(readinessLayer),
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
        Layer.provideMerge(Layer.succeed(ActivityReadiness, readiness)),
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

const probeDatabaseLayer = (
  query: Effect.Effect<ReadonlyArray<unknown>, SqlError.SqlError>,
  connect: Effect.Effect<void, SqlError.SqlError> = Effect.void,
) =>
  Layer.effect(
    SqlClient.SqlClient,
    SqlClient.make({
      compiler: PgClient.makeCompiler(),
      spanAttributes: [],
      acquirer: Effect.as(connect, {
        execute: () => query,
        executeRaw: () => Effect.die("Unexpected raw query"),
        executeStream: () => {
          throw new Error("Unexpected streaming query");
        },
        executeValues: () => Effect.die("Unexpected values query"),
        executeValuesUnprepared: () =>
          Effect.die("Unexpected unprepared query"),
        executeUnprepared: () => Effect.die("Unexpected unprepared query"),
      }),
    }),
  ).pipe(Layer.provide(Reactivity.layer));

const liveResponse = {
  status: "ok",
  info: { process: { status: "up" } },
  error: null,
  details: { process: { status: "up" } },
};

const readyResponse = {
  status: "ok",
  info: { database: { status: "up" } },
  error: null,
  details: { database: { status: "up" } },
};

const unreadyResponse = {
  status: "error",
  info: null,
  error: { database: { status: "down" } },
  details: { database: { status: "down" } },
};

it("keeps liveness healthy during a database outage and recovers readiness without a restart", async () => {
  let unavailable = true;
  let queries = 0;

  const database = probeDatabaseLayer(
    Effect.suspend(() => {
      queries++;

      return unavailable
        ? Effect.fail(
            new SqlError.SqlError({
              reason: new SqlError.ConnectionError({
                cause: new Error("Database unavailable"),
              }),
            }),
          )
        : Effect.succeed([{ value: 1 }]);
    }),
  );

  const boundary = makeBoundary(
    [],
    ActivityReadiness.layer.pipe(Layer.provide(database)),
  );

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const live = await boundary.handler(
        new Request("https://activity/healthz"),
      );

      expect(live.status).toBe(200);
      expect(await live.json()).toEqual(liveResponse);
    }

    expect(queries).toBe(0);

    const unready = await boundary.handler(
      new Request("https://activity/readyz"),
    );

    expect(unready.status).toBe(503);
    expect(await unready.json()).toEqual(unreadyResponse);

    unavailable = false;

    const ready = await boundary.handler(
      new Request("https://activity/readyz"),
    );

    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual(readyResponse);
  } finally {
    await boundary.dispose();
  }
});

for (const stalledOperation of ["connection", "query"] as const) {
  it(`bounds a stalled database ${stalledOperation} without delaying liveness or retaining the pending probe`, async () => {
    let stalled = true;
    let pending = 0;
    const started = Promise.withResolvers<void>();

    const waitForDatabase = Effect.suspend(() => {
      if (!stalled) return Effect.void;
      pending++;
      started.resolve();

      return Effect.never.pipe(Effect.ensuring(Effect.sync(() => pending--)));
    });

    const database = probeDatabaseLayer(
      stalledOperation === "query"
        ? Effect.as(waitForDatabase, [{ value: 1 }])
        : Effect.succeed([{ value: 1 }]),
      stalledOperation === "connection" ? waitForDatabase : Effect.void,
    );

    const boundary = makeBoundary(
      [],
      ActivityReadiness.layer.pipe(Layer.provide(database)),
    );

    try {
      const unready = boundary.handler(new Request("https://activity/readyz"));
      await started.promise;

      const live = await boundary.handler(
        new Request("https://activity/healthz"),
      );

      expect(live.status).toBe(200);
      expect(await live.json()).toEqual(liveResponse);
      expect(pending).toBe(1);

      const response = await unready;
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual(unreadyResponse);
      expect(pending).toBe(0);

      stalled = false;

      const ready = await boundary.handler(
        new Request("https://activity/readyz"),
      );

      expect(ready.status).toBe(200);
      expect(await ready.json()).toEqual(readyResponse);
    } finally {
      await boundary.dispose();
    }
  }, 5000);
}

it("answers readiness before slow PostgreSQL cancellation and rejects overlapping probes until cleanup completes", async () => {
  const cleanupStarted = Promise.withResolvers<void>();
  const releaseCleanup = Promise.withResolvers<void>();
  const cleanupFinished = Promise.withResolvers<void>();
  let queries = 0;

  const database = probeDatabaseLayer(
    Effect.suspend(() => {
      queries++;

      if (queries > 1) return Effect.succeed([{ value: 1 }]);

      return Effect.never.pipe(
        Effect.ensuring(
          Effect.promise(() => {
            cleanupStarted.resolve();

            return releaseCleanup.promise;
          }).pipe(Effect.andThen(Effect.sync(() => cleanupFinished.resolve()))),
        ),
      );
    }),
  );

  const boundary = makeBoundary(
    [],
    ActivityReadiness.layer.pipe(Layer.provide(database)),
  );

  const watchdog = setTimeout(() => releaseCleanup.resolve(), 4500);

  try {
    const startedAt = performance.now();

    const unready = await boundary.handler(
      new Request("https://activity/readyz"),
    );

    expect(performance.now() - startedAt).toBeLessThan(4000);
    expect(unready.status).toBe(503);
    expect(await unready.json()).toEqual(unreadyResponse);
    await cleanupStarted.promise;

    const live = await boundary.handler(
      new Request("https://activity/healthz"),
    );

    const busy = await boundary.handler(new Request("https://activity/readyz"));

    expect(live.status).toBe(200);
    expect(await live.json()).toEqual(liveResponse);
    expect(busy.status).toBe(503);
    expect(await busy.json()).toEqual(unreadyResponse);
    expect(queries).toBe(1);

    releaseCleanup.resolve();
    await cleanupFinished.promise;
    await Bun.sleep(0);

    const ready = await boundary.handler(
      new Request("https://activity/readyz"),
    );

    expect(ready.status).toBe(200);
    expect(await ready.json()).toEqual(readyResponse);
    expect(queries).toBe(2);
  } finally {
    clearTimeout(watchdog);
    releaseCleanup.resolve();
    await boundary.dispose();
  }
}, 6000);
