import { ActivityDatabase } from "#src/database/database";
import { userOnlineIntervals } from "#src/database/schema";
import { PgClient } from "@effect/sql-pg";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import {
  checkpoint,
  foldAllIntervals,
  startOnlineRepositoryHarness,
  type OnlineRepositoryHarness,
} from "./online-repository.integration.fixtures.js";
import { OnlineRepository } from "./online-repository.js";
import { ONLINE_HISTORY_RETENTION_DAYS } from "./online-retention.js";

describe("durable private online history retention", () => {
  let harness: OnlineRepositoryHarness;

  beforeAll(async () => {
    harness = await startOnlineRepositoryHarness();
  }, 60_000);

  afterAll(async () => {
    await harness?.stop();
  });

  it("cleans every batch while preserving retained history and tracking", async () => {
    const now = "2026-09-06T12:00:00Z";

    const cutoff = new Date(
      Date.parse(now) - ONLINE_HISTORY_RETENTION_DAYS * 86_400_000,
    ).toISOString();

    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        const db = yield* ActivityDatabase;
        yield* sql`DELETE FROM "UserOnlineRetention"`;
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId", "sessionId", "segmentId", "world", "startedAt", "endedAt", "observedAt")
          SELECT 'batch-' || kind, n::text, n::text, 'luvia', ${cutoff}::timestamptz - interval '1 hour',
            ${cutoff}::timestamptz + CASE WHEN kind = 'expired' THEN interval '0 hours' ELSE interval '1 hour' END,
            ${cutoff}::timestamptz + interval '1 hour'
          FROM generate_series(1, 2001) n CROSS JOIN (VALUES ('expired'), ('retained')) kinds(kind)`;
        yield* db.insert(userOnlineIntervals).values([
          {
            userId: "batch-expired",
            sessionId: "cutoff",
            segmentId: "cutoff",
            world: "luvia",
            startedAt: new Date(cutoff),
            endedAt: new Date(cutoff),
            observedAt: new Date(cutoff),
          },
          {
            userId: "batch-retained",
            sessionId: "long",
            segmentId: "long",
            world: "luvia",
            startedAt: new Date(Date.parse(cutoff) - 7 * 86_400_000),
            endedAt: new Date(Date.parse(cutoff) + 7200_000),
            observedAt: new Date(Date.parse(cutoff) + 7200_000),
          },
        ]);
        yield* foldAllIntervals(sql);
        yield* sql`INSERT INTO "UserOnlineTracking" ("userId", "lastObservedAt")
          SELECT 'batch-tracking-' || n, ${cutoff}::timestamptz FROM generate_series(1, 2001) n`;
        yield* sql`INSERT INTO "UserOnlineTracking" ("userId", "lastObservedAt") VALUES ('batch-fresh', ${now}::timestamptz)`;
      }).pipe(
        Effect.provide(
          Layer.provideMerge(ActivityDatabase.layer, harness.database),
        ),
      ),
    );

    const history = await harness.runAt(
      now,
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.ingest({
          version: 1,
          type: "collector",
          status: "healthy",
          observedAt: "2025-08-01T00:00:00Z",
        });
        yield* repo.prune;

        return yield* repo.find("batch-retained", {
          from: cutoff.slice(0, 10),
          to: cutoff.slice(0, 10),
        });
      }),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;

        const intervals = yield* sql<{
          userId: string;
          count: number;
          trimmed: boolean;
          latestEnd: string;
          worlds: boolean;
        }>`
          SELECT "userId", count(*)::integer AS count,
            bool_and("startedAt" = ${cutoff}::timestamptz) AS trimmed,
            max("endedAt")::text AS "latestEnd",
            bool_and(world = 'luvia') AS worlds
          FROM "UserOnlineInterval" WHERE "userId" IN ('batch-expired', 'batch-retained') GROUP BY "userId"`;

        const tracking = yield* sql<{
          userId: string;
        }>`SELECT "userId" FROM "UserOnlineTracking" WHERE "userId" LIKE 'batch-%'`;

        return { intervals, tracking };
      }).pipe(Effect.provide(harness.database)),
    );

    expect(result.intervals).toEqual([
      {
        userId: "batch-retained",
        count: 2002,
        trimmed: true,
        latestEnd: "2025-09-06 14:00:00+00",
        worlds: true,
      },
    ]);
    expect(result.tracking).toEqual([{ userId: "batch-fresh" }]);
    expect(history.days).toEqual([
      {
        date: "2025-09-06",
        onlineSeconds: 7200,
        partial: true,
        worlds: ["luvia"],
        worldsComplete: true,
      },
    ]);
  });

  it("coordinates concurrent replicas and does not repeat a completed hourly window", async () => {
    const now = "2026-09-06T12:00:00Z";
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        yield* sql`DELETE FROM "UserOnlineRetention"`;
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId", "sessionId", "segmentId", "startedAt", "endedAt", "observedAt") VALUES ('window-first', 's', 's', '2020-01-01', '2020-01-02', '2020-01-02')`;
      }).pipe(Effect.provide(harness.database)),
    );

    const prune = Effect.gen(function* () {
      const repo = yield* OnlineRepository;
      yield* repo.prune;
    });

    await Promise.all([harness.runAt(now, prune), harness.runAt(now, prune)]);
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;

        const rows =
          yield* sql`SELECT 1 FROM "UserOnlineInterval" WHERE "userId" = 'window-first'`;

        expect(rows).toHaveLength(0);
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId", "sessionId", "segmentId", "startedAt", "endedAt", "observedAt") VALUES ('window-next', 's', 's', '2020-01-01', '2020-01-02', '2020-01-02')`;
      }).pipe(Effect.provide(harness.database)),
    );
    await harness.runAt("2026-09-06T12:59:00Z", prune);
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;

        const rows =
          yield* sql`SELECT 1 FROM "UserOnlineInterval" WHERE "userId" = 'window-next'`;

        expect(rows).toHaveLength(1);
      }).pipe(Effect.provide(harness.database)),
    );
    await harness.runAt("2026-09-06T13:00:00Z", prune);
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;

        const rows =
          yield* sql`SELECT 1 FROM "UserOnlineInterval" WHERE "userId" = 'window-next'`;

        expect(rows).toHaveLength(0);
      }).pipe(Effect.provide(harness.database)),
    );
  });

  it("preserves committed batches after a database failure and resumes unfinished cleanup", async () => {
    const now = "2026-09-06T12:00:00Z";
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        yield* sql`DELETE FROM "UserOnlineRetention"`;
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId", "sessionId", "segmentId", "startedAt", "endedAt", "observedAt")
          SELECT 'recovery', n::text, n::text, '2020-01-01', '2020-01-02', '2020-01-02' FROM generate_series(1, 2001) n`;
        yield* sql`CREATE SEQUENCE retention_failure_counter`;
        yield* sql`CREATE FUNCTION fail_retention_once() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN
            IF OLD."userId" = 'recovery' AND nextval('retention_failure_counter') = 1001 THEN
              RAISE EXCEPTION 'Injected retention failure';
            END IF;
            RETURN OLD;
          END $$`;
        yield* sql`CREATE TRIGGER retention_failure BEFORE DELETE ON "UserOnlineInterval" FOR EACH ROW EXECUTE FUNCTION fail_retention_once()`;
      }).pipe(Effect.provide(harness.database)),
    );

    const prune = Effect.gen(function* () {
      const repo = yield* OnlineRepository;
      yield* repo.prune;
    });

    try {
      const failure = await harness.runAt(now, prune.pipe(Effect.result));
      expect(failure._tag).toBe("Failure");
      await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* PgClient.PgClient;

          const rows = yield* sql<{
            count: number;
          }>`SELECT count(*)::integer AS count FROM "UserOnlineInterval" WHERE "userId" = 'recovery'`;

          expect(rows[0]?.count).toBeGreaterThan(0);
          expect(rows[0]?.count).toBeLessThan(2001);
        }).pipe(Effect.provide(harness.database)),
      );
      await harness.runAt(now, prune);
      await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* PgClient.PgClient;

          const rows =
            yield* sql`SELECT 1 FROM "UserOnlineInterval" WHERE "userId" = 'recovery'`;

          expect(rows).toHaveLength(0);
        }).pipe(Effect.provide(harness.database)),
      );
    } finally {
      await Effect.runPromise(
        Effect.gen(function* () {
          const sql = yield* PgClient.PgClient;
          yield* sql`DROP TRIGGER retention_failure ON "UserOnlineInterval"`;
          yield* sql`DROP FUNCTION fail_retention_once()`;
          yield* sql`DROP SEQUENCE retention_failure_counter`;
        }).pipe(Effect.provide(harness.database)),
      );
    }
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
        yield* sql`DELETE FROM "UserOnlineRetention"`;
        yield* sql`INSERT INTO "UserOnlineInterval" ("userId","sessionId","segmentId","startedAt","endedAt","observedAt") VALUES ('expired','old','old','2020-01-01','2020-01-02','2020-01-02')`;
      }).pipe(Effect.provide(harness.database)),
    );
    await harness.run(
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.prune;
        yield* repo.ingest(expired);
      }),
    );

    const rows = await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;

        return yield* sql`SELECT * FROM "UserOnlineInterval" WHERE "userId"='expired'`;
      }).pipe(Effect.provide(harness.database)),
    );

    expect(rows).toHaveLength(0);
  });

  it("physically trims the retention boundary and replay cannot restore the forgotten start", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const sql = yield* PgClient.PgClient;
        yield* sql`DELETE FROM "UserOnlineRetention"`;
      }).pipe(Effect.provide(harness.database)),
    );
    const now = "2026-09-06T12:00:00Z";
    const cutoff = Date.parse(now) - ONLINE_HISTORY_RETENTION_DAYS * 86_400_000;

    const input = checkpoint(
      "retention-boundary",
      "stable-segment",
      new Date(cutoff - 3600_000).toISOString(),
      new Date(cutoff + 7200_000).toISOString(),
    );

    await harness.runAt(
      now,
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.ingest(input);
      }),
    );
    const later = new Date(Date.parse(now) + 3600_000).toISOString();

    const result = await harness.runAt(
      later,
      Effect.gen(function* () {
        const repo = yield* OnlineRepository;
        yield* repo.prune;
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

    const changedStart = await harness.runAt(
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
      }).pipe(Effect.provide(harness.database)),
    );

    expect(rows).toHaveLength(1);
    expect(Date.parse(rows[0]?.startedAt ?? "")).toBe(cutoff + 3600_000);
  });
});
