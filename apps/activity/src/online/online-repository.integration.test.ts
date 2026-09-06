import { TestClock } from "effect/testing";
import { RabbitMessaging, type RabbitDelivery } from "@lootlog/messaging";
import {
  signActivityEvent,
  ACTIVITY_EVENT_SIGNATURE_HEADER,
} from "@lootlog/protocol/rabbit/activity-signature";
import {
  RabbitRoutingKey,
  RabbitExchange,
} from "@lootlog/protocol/rabbit/topology";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { ActivityConfig } from "#src/config/activity-config";
import { OnlineConsumer } from "./online-consumer.js";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { makePostgresLayer } from "@lootlog/database";
import { Effect, Layer, Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { PgClient } from "@effect/sql-pg";
import { OnlineRepository } from "./online-repository.js";
import type { UserOnlineCheckpointV1 } from "@lootlog/protocol/rabbit/events";
import { ActivityRoutes, ActivityHealth } from "#src/http/activity-http";
import { ActivityRepository } from "#src/activities/activity-repository";
import { Permissions } from "#src/activities/activity-permissions";

describe("durable private online history", () => {
  let postgres: StartedPostgreSqlContainer;
  let database: ReturnType<typeof makePostgresLayer>;
  const checkpoint = (
    userId: string,
    segmentId: string,
    startedAt: string,
    endedAt: string,
  ): UserOnlineCheckpointV1 => ({
    version: 1,
    type: "checkpoint",
    userId,
    sessionId: segmentId,
    segmentId,
    startedAt,
    endedAt,
    observedAt: endedAt,
  });
  const run = <A, E>(effect: Effect.Effect<A, E, OnlineRepository>) =>
    Effect.runPromise(
      effect.pipe(
        Effect.provide(OnlineRepository.layer.pipe(Layer.provide(database))),
      ),
    );
  const runAt = <A, E>(
    time: string,
    effect: Effect.Effect<A, E, OnlineRepository>,
  ) =>
    run(
      Effect.gen(function* () {
        yield* TestClock.setTime(Date.parse(time));
        return yield* effect;
      }).pipe(Effect.provide(TestClock.layer())),
    );
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("online_history")
      .withUsername("lootlog")
      .withPassword("lootlog")
      .start();
    database = makePostgresLayer({
      url: Redacted.make(postgres.getConnectionUri()),
    });
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        const migration = yield* Effect.promise(() =>
          Bun.file(
            new URL(
              "../../drizzle/migrations/0001_user_online_history.sql",
              import.meta.url,
            ),
          ).text(),
        );
        yield* sql.unsafe(migration).unprepared;
        yield* sql.unsafe(migration).unprepared;
      }).pipe(Effect.provide(database)),
    );
  }, 60_000);
  afterAll(async () => {
    await postgres?.stop();
  });

  it("unions parallel sessions, retries and out-of-order cumulative checkpoints without filling gaps", async () => {
    const result = await run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        const initial = yield* repo.find("never", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
        expect(initial.status).toBe("unavailable");
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: "2025-10-25T00:00:00Z",
        });
        const first = checkpoint(
          "union",
          "a",
          "2026-09-01T08:00:00Z",
          "2026-09-01T09:00:00Z",
        );
        yield* repo.ingest(first);
        yield* repo.ingest({
          ...first,
          endedAt: "2026-09-01T10:00:00Z",
          observedAt: "2026-09-01T10:00:00Z",
        });
        yield* Effect.all([repo.ingest(first), repo.ingest(first)], {
          concurrency: "unbounded",
        });
        yield* repo.ingest(
          checkpoint(
            "union",
            "b",
            "2026-09-01T09:00:00Z",
            "2026-09-01T11:00:00Z",
          ),
        );
        yield* repo.ingest(
          checkpoint(
            "union",
            "c",
            "2026-09-01T12:00:00Z",
            "2026-09-01T13:00:00Z",
          ),
        );
        yield* repo.ingest(
          checkpoint(
            "different-user",
            "a",
            "2026-09-01T00:00:00Z",
            "2026-09-01T20:00:00Z",
          ),
        );
        return yield* repo.find("union", {
          from: "2026-08-31",
          to: "2026-09-02",
        });
      }),
    );
    expect(result.days).toEqual([
      { date: "2026-08-31", onlineSeconds: 0, partial: false },
      { date: "2026-09-01", onlineSeconds: 14_400, partial: false },
      { date: "2026-09-02", onlineSeconds: 0, partial: false },
    ]);
    expect(result.trackingStartedAt).toBe("2025-10-25T00:00:00.000Z");
  });

  it("keeps dates before instrumentation and the partially observed first day unknown", async () => {
    const result = await runAt(
      "2025-10-27T12:00:00Z",
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        return yield* repo.find("never-played", {
          from: "2025-10-24",
          to: "2025-10-26",
        });
      }),
    );
    expect(result.days).toEqual([
      { date: "2025-10-24", onlineSeconds: null, partial: false },
      { date: "2025-10-25", onlineSeconds: null, partial: true },
      { date: "2025-10-26", onlineSeconds: 0, partial: false },
    ]);
    const confirmed = await runAt(
      "2025-10-27T12:00:00Z",
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.ingest(
          checkpoint(
            "deployment-day",
            "a",
            "2025-10-25T08:00:00Z",
            "2025-10-25T09:00:00Z",
          ),
        );
        return yield* repo.find("deployment-day", {
          from: "2025-10-25",
          to: "2025-10-25",
        });
      }),
    );
    expect(confirmed.days[0]).toEqual({
      date: "2025-10-25",
      onlineSeconds: 3600,
      partial: true,
    });
    expect(result.lastObservedAt).toBeNull();
    expect(result.status).toBe("stale");
  });

  it("splits Warsaw midnights with both spring and autumn DST", async () => {
    for (const [user, now, start, end, date, seconds] of [
      [
        "spring",
        "2026-03-30T12:00:00Z",
        "2026-03-28T23:00:00Z",
        "2026-03-29T22:00:00Z",
        "2026-03-29",
        23 * 3600,
      ],
      [
        "autumn",
        "2025-10-27T12:00:00Z",
        "2025-10-25T22:00:00Z",
        "2025-10-26T23:00:00Z",
        "2025-10-26",
        25 * 3600,
      ],
    ] as const) {
      const result = await runAt(
        now,
        Effect.gen(function* () {
          const repo = yield* OnlineRepository;
          yield* repo.ingest(checkpoint(user, "a", start, end));
          return yield* repo.find(user, { from: date, to: date });
        }),
      );
      expect(result.days[0]?.onlineSeconds).toBe(seconds);
    }
  });

  it("keeps offline users fresh from a healthy collector and does not replace degraded with older health", async () => {
    const result = await run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        const observedAt = new Date().toISOString();
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt,
        });
        const fresh = yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "degraded",
          observedAt,
        });
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt,
        });
        const stale = yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
        const unavailable = yield* repo.find("never", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
        return { fresh, stale, unavailable };
      }),
    );
    expect(result.fresh.status).toBe("fresh");
    expect(result.stale.status).toBe("stale");
    expect(result.unavailable.status).toBe("stale");
    expect(result.unavailable.days[0]?.onlineSeconds).toBe(0);
  });

  it("persists a degraded gateway lease across newer healthy peers and repository restarts", async () => {
    const now = Date.now();
    const first = await run(
      Effect.gen(function* () {
        yield* TestClock.setTime(now);
        const repo = yield* OnlineRepository;
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "degraded",
          observedAt: new Date(now).toISOString(),
        });
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: new Date(now + 1000).toISOString(),
        });
        return yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }).pipe(Effect.provide(TestClock.layer())),
    );
    expect(first.status).toBe("stale");
    const beforeExpiry = await run(
      Effect.gen(function* () {
        yield* TestClock.setTime(now + 179_000);
        const repo = yield* OnlineRepository;
        return yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }).pipe(Effect.provide(TestClock.layer())),
    );
    expect(beforeExpiry.status).toBe("stale");
    const recovered = await run(
      Effect.gen(function* () {
        yield* TestClock.setTime(now + 180_000);
        const repo = yield* OnlineRepository;
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: new Date(now + 180_000).toISOString(),
        });
        return yield* repo.find("union", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }).pipe(Effect.provide(TestClock.layer())),
    );
    expect(recovered.status).toBe("fresh");
  });

  it("accepts signed broker redeliveries and retains invalid signatures in the DLQ", async () => {
    const payload = checkpoint(
      "signed",
      "a",
      "2026-09-01T08:00:00Z",
      "2026-09-01T09:00:00Z",
    );
    const secret = "s".repeat(32);
    let consumeHandler:
      | ((delivery: RabbitDelivery) => Effect.Effect<void, unknown>)
      | undefined;
    const published: string[] = [];
    const rabbit = RabbitMessaging.of({
      publish: (options) =>
        Effect.sync(() => {
          published.push(options.routingKey);
        }),
      ack: () => Effect.void,
      nack: () => Effect.void,
      consume: (options, handler) => {
        consumeHandler = handler;
        return Effect.succeed({
          consumerTag: options.queue,
          cancel: Effect.void,
        });
      },
    });
    const delivery = (signature: string): RabbitDelivery => {
      const raw: RabbitDelivery["raw"] = {
        content: Buffer.from(JSON.stringify(payload)),
        fields: {
          consumerTag: "online",
          deliveryTag: 1,
          redelivered: true,
          exchange: RabbitExchange.DEFAULT,
          routingKey: RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1,
        },
        properties: {
          contentType: "application/json",
          contentEncoding: undefined,
          deliveryMode: 2,
          priority: undefined,
          correlationId: undefined,
          replyTo: undefined,
          expiration: undefined,
          messageId: undefined,
          timestamp: undefined,
          type: undefined,
          userId: undefined,
          appId: undefined,
          clusterId: undefined,
          headers: { [ACTIVITY_EVENT_SIGNATURE_HEADER]: signature },
        },
      };
      return {
        raw,
        content: raw.content,
        properties: raw.properties,
        exchange: raw.fields.exchange,
        routingKey: raw.fields.routingKey,
        redelivered: true,
      };
    };
    await Effect.runPromise(
      Effect.gen(function* () {
        yield* Layer.build(
          OnlineConsumer.pipe(
            Layer.provide(Layer.succeed(RabbitMessaging, rabbit)),
            Layer.provide(OnlineRepository.layer.pipe(Layer.provide(database))),
            Layer.provide(
              Layer.succeed(ActivityConfig, {
                environment: RuntimeEnvironment.LOCAL,
                port: 0,
                serviceName: "online-test",
                serviceNamespace: "test",
                databaseUrl: Redacted.make(postgres.getConnectionUri()),
                rabbitmqUri: Redacted.make("amqp://unused"),
                apiServiceUrl: "http://unused",
                signatureSecret: Redacted.make(secret),
              }),
            ),
          ),
        );
        if (!consumeHandler)
          return yield* Effect.die("Online consumer not installed");
        yield* consumeHandler(delivery("invalid"));
        yield* consumeHandler(delivery(signActivityEvent(payload, secret)));
        yield* consumeHandler(delivery(signActivityEvent(payload, secret)));
      }).pipe(Effect.scoped),
    );
    expect(published).toEqual([
      RabbitRoutingKey.USERS_ONLINE_CHECKPOINT_V1_DLQ,
    ]);
    const result = await run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        return yield* repo.find("signed", {
          from: "2026-09-01",
          to: "2026-09-01",
        });
      }),
    );
    expect(result.days[0]?.onlineSeconds).toBe(3600);
  });

  it("expires old intervals independently and ignores delayed expired redeliveries", async () => {
    const expired = checkpoint(
      "expired",
      "old",
      "2020-01-01T00:00:00Z",
      "2020-01-01T01:00:00Z",
    );
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId","sessionId","segmentId","startedAt","endedAt","observedAt") VALUES ('expired','old','old','2020-01-01','2020-01-02','2020-01-02')`;
      }).pipe(Effect.provide(database)),
    );
    await run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.prune();
        yield* repo.ingest(expired);
      }),
    );
    const rows = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        return yield* sql`SELECT * FROM "UserOnlineInterval" WHERE "userId"='expired'`;
      }).pipe(Effect.provide(database)),
    );
    expect(rows).toHaveLength(0);
  });

  it("physically trims the 112-day boundary and replay cannot restore the forgotten start", async () => {
    const now = "2026-09-06T12:00:00Z";
    const cutoff = Date.parse(now) - 112 * 86_400_000;
    const input = checkpoint(
      "retention-boundary",
      "stable-segment",
      new Date(cutoff - 3600_000).toISOString(),
      new Date(cutoff + 7200_000).toISOString(),
    );
    await runAt(
      now,
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.ingest(input);
      }),
    );
    const later = new Date(Date.parse(now) + 3600_000).toISOString();
    const result = await runAt(
      later,
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.prune();
        yield* repo.ingest(input);
        yield* repo.ingest({
          ...input,
          endedAt: new Date(cutoff).toISOString(),
        });
        return yield* repo.find("retention-boundary", {
          from: new Date(cutoff - 86_400_000).toISOString().slice(0, 10),
          to: new Date(cutoff).toISOString().slice(0, 10),
        });
      }),
    );
    const changedStart = await runAt(
      later,
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        return yield* repo
          .ingest({
            ...input,
            startedAt: new Date(cutoff + 5400_000).toISOString(),
          })
          .pipe(Effect.result);
      }),
    );
    expect(changedStart._tag).toBe("Failure");
    expect(result.days[0]?.onlineSeconds).toBeNull();
    expect(result.days[1]?.onlineSeconds).toBe(3600);
    const rows = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        return yield* sql<{
          startedAt: string;
        }>`SELECT "startedAt"::text AS "startedAt" FROM "UserOnlineInterval" WHERE "userId"='retention-boundary'`;
      }).pipe(Effect.provide(database)),
    );
    expect(rows).toHaveLength(1);
    expect(Date.parse(rows[0]?.startedAt ?? "")).toBe(cutoff + 3600_000);
  });

  it("migrates existing history to sixteen weeks without retaining expired timestamps", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId","sessionId","segmentId","startedAt","endedAt","observedAt") VALUES
        ('migration-expired','a','a',CURRENT_TIMESTAMP-interval '114 days',CURRENT_TIMESTAMP-interval '113 days',CURRENT_TIMESTAMP-interval '113 days'),
        ('migration-crossing','a','a',CURRENT_TIMESTAMP-interval '113 days',CURRENT_TIMESTAMP-interval '111 days',CURRENT_TIMESTAMP-interval '111 days')`;
        yield* sql`INSERT INTO "UserOnlineTracking" ("userId","lastObservedAt") VALUES ('migration-expired',CURRENT_TIMESTAMP-interval '113 days')`;
        const before = yield* sql<{
          cutoff: string;
        }>`SELECT (CURRENT_TIMESTAMP-interval '112 days')::text AS cutoff`;
        const migration = yield* Effect.promise(() =>
          Bun.file(
            new URL(
              "../../drizzle/migrations/0002_online_history_16_week_retention.sql",
              import.meta.url,
            ),
          ).text(),
        );
        yield* sql.unsafe(migration).unprepared;
        yield* sql.unsafe(migration).unprepared;
        const rows = yield* sql<{
          userId: string;
          startedAt: string;
        }>`SELECT "userId","startedAt"::text AS "startedAt" FROM "UserOnlineInterval" WHERE "userId" IN ('migration-expired','migration-crossing')`;
        const metadata =
          yield* sql`SELECT * FROM "UserOnlineTracking" WHERE "userId"='migration-expired'`;
        return { before, rows, metadata };
      }).pipe(Effect.provide(database)),
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.userId).toBe("migration-crossing");
    expect(Date.parse(result.rows[0]?.startedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(result.before[0]?.cutoff ?? ""),
    );
    expect(result.metadata).toHaveLength(0);
  });

  it("serves only the authenticated internal user and rejects missing identity and invalid date ranges", async () => {
    const routes = ActivityRoutes.pipe(
      Layer.provideMerge(
        OnlineRepository.layer.pipe(Layer.provideMerge(database)),
      ),
      Layer.provideMerge(
        Layer.succeed(ActivityHealth, {
          check: () => Effect.die("unused health"),
        }),
      ),
      Layer.provideMerge(
        Layer.succeed(ActivityRepository, {
          create: () => Effect.die("unused"),
          clearActiveSessionsForMember: () => Effect.die("unused"),
          findMany: () => Effect.die("unused"),
          findOne: () => Effect.die("unused"),
          deleteOne: () => Effect.die("unused"),
          memberStats: () => Effect.die("unused"),
          suggestActorNames: () => Effect.die("unused"),
          suggestWorlds: () => Effect.die("unused"),
          suggestClanNames: () => Effect.die("unused"),
        }),
      ),
      Layer.provideMerge(
        Layer.succeed(Permissions, {
          resolveGuildId: () => Effect.die("unused"),
          getUserGuildPermissions: () => Effect.die("unused"),
        }),
      ),
      Layer.provideMerge(HttpServer.layerServices),
    );
    const boundary = HttpRouter.toWebHandler(routes, { disableLogger: true });
    const url =
      "https://activity/users/@me/activity/online?from=2026-09-01&to=2026-09-01";
    try {
      expect((await boundary.handler(new Request(url))).status).toBe(401);
      const headers = {
        authorization: "Bearer forwarded",
        "x-auth-user-id": "union",
      };
      const response = await boundary.handler(
        new Request(url + "&userId=different-user", { headers }),
      );
      expect(response.status).toBe(200);
      expect((await response.json()).days[0].onlineSeconds).toBe(14_400);
      expect(
        (
          await boundary.handler(
            new Request(url.replace("@me", "different-user"), { headers }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await boundary.handler(
            new Request(url.replace("2026-09-01&to", "2026-02-30&to"), {
              headers,
            }),
          )
        ).status,
      ).toBe(400);
    } finally {
      await boundary.dispose();
    }
  });
});
