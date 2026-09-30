import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { makePostgresLayer } from "@lootlog/database";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Effect, Layer, Redacted } from "effect";
import pg from "pg";
import { ActivityDatabase } from "#src/database/database";
import { migrateActivityDatabase } from "#src/database/migrate";
import { ActivitySource, ActivityType } from "#src/database/schema";
import { ActivityRepository } from "./activity-repository.js";
import type { CreateActivity } from "./activity-model.js";

describe("ActivityRepository", () => {
  let postgres: StartedPostgreSqlContainer;
  let pool: pg.Pool;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer(
      "timescale/timescaledb:latest-pg17",
    )
      .withDatabase("activity_repository")
      .withUsername("lootlog")
      .withPassword("lootlog")
      .withStartupTimeout(60_000)
      .start();
    pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });
    await Effect.runPromise(
      Effect.gen(function* () {
        yield* migrateActivityDatabase;
      }).pipe(
        Effect.provide(
          makePostgresLayer({
            url: Redacted.make(postgres.getConnectionUri()),
          }),
        ),
      ),
    );
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
    await postgres?.stop();
  });

  const repositoryLayer = () =>
    ActivityRepository.layer.pipe(
      Layer.provide(
        ActivityDatabase.layer.pipe(
          Layer.provide(
            makePostgresLayer({
              url: Redacted.make(postgres.getConnectionUri()),
            }),
          ),
        ),
      ),
    );

  const gameActivity = (key: string): CreateActivity => ({
    userId: key,
    guildId: key,
    discordId: key,
    type: ActivityType.CONNECT_EVENT,
    source: ActivitySource.GAME,
    details: { sessionId: key },
    idempotencyKey: key,
    actorSnapshot: {
      accountId: 123,
      characterId: 456,
      name: key,
      clanName: "Test clan",
      clanId: 789,
      icon: "test.gif",
      lvl: 100,
      prof: "w",
    },
  });

  it("reuses unchanged snapshots without rewriting tuples and preserves historical versions", async () => {
    const activity = gameActivity("snapshot-history");

    const run = (dto: CreateActivity) =>
      Effect.runPromise(
        Effect.gen(function* () {
          return yield* (yield* ActivityRepository).create(dto);
        }).pipe(Effect.provide(repositoryLayer())),
      );

    await run(activity);

    const original = await pool.query(
      `SELECT id, xmin::text, "createdAt" FROM "ActivityActorSnapshot" WHERE name = $1`,
      [activity.actorSnapshot?.name],
    );

    await run(activity);

    await run({ ...activity, idempotencyKey: "snapshot-history-next" });

    expect(
      (
        await pool.query(
          `SELECT id, xmin::text, "createdAt" FROM "ActivityActorSnapshot" WHERE name = $1`,
          [activity.actorSnapshot?.name],
        )
      ).rows,
    ).toEqual(original.rows);

    await run({
      ...activity,
      idempotencyKey: "snapshot-history-changed",
      actorSnapshot: { ...activity.actorSnapshot, lvl: 101 },
    });
    expect(
      (
        await pool.query(
          `SELECT a."idempotencyKey", s.lvl FROM "Activity" a
         JOIN "ActivityActorSnapshot" s ON s.id = a."actorSnapshotId"
         WHERE a."guildId" = $1 ORDER BY a."idempotencyKey"`,
          [activity.guildId],
        )
      ).rows,
    ).toEqual([
      { idempotencyKey: "snapshot-history", lvl: 100 },
      { idempotencyKey: "snapshot-history-changed", lvl: 101 },
      { idempotencyKey: "snapshot-history-next", lvl: 100 },
    ]);
  });

  it("resolves concurrent identical snapshots to one durable identifier", async () => {
    const activity = gameActivity("snapshot-concurrent");
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* ActivityRepository;
        yield* Effect.all(
          Array.from({ length: 12 }, (_, index) =>
            repository.create({
              ...activity,
              guildId: `snapshot-concurrent-${index}`,
              idempotencyKey: `snapshot-concurrent-${index}`,
            }),
          ),
          { concurrency: "unbounded" },
        );
      }).pipe(Effect.provide(repositoryLayer())),
    );
    expect(
      (
        await pool.query(
          `SELECT COUNT(*)::int AS count, COUNT(DISTINCT a."actorSnapshotId")::int AS snapshots
         FROM "Activity" a JOIN "ActivityActorSnapshot" s ON s.id = a."actorSnapshotId"
         WHERE s.name = $1`,
          [activity.actorSnapshot?.name],
        )
      ).rows,
    ).toEqual([{ count: 12, snapshots: 1 }]);
  });

  it.each(["COMMIT", "ROLLBACK"] as const)(
    "resolves an initially invisible snapshot after its owner %s",
    async (completion) => {
      const activity = gameActivity(`snapshot-visibility-${completion}`);

      const create = () =>
        Effect.runPromise(
          Effect.gen(function* () {
            return yield* (yield* ActivityRepository).create(activity);
          }).pipe(Effect.provide(repositoryLayer())),
        );

      await create();

      const { rows: snapshots } = await pool.query(
        `SELECT * FROM "ActivityActorSnapshot" WHERE name = $1`,
        [activity.actorSnapshot?.name],
      );

      const snapshot = snapshots[0];

      await pool.query(`DELETE FROM "Activity" WHERE "idempotencyKey" = $1`, [
        activity.idempotencyKey,
      ]);
      await pool.query(`DELETE FROM "ActivityActorSnapshot" WHERE id = $1`, [
        snapshot.id,
      ]);

      const owner = await pool.connect();
      let pending: Promise<unknown> | undefined;

      try {
        await owner.query("BEGIN");
        await owner.query(
          `INSERT INTO "ActivityActorSnapshot" SELECT * FROM json_populate_record(NULL::"ActivityActorSnapshot", $1)`,
          [JSON.stringify(snapshot)],
        );

        const { rows: owners } = await owner.query(
          `SELECT pg_backend_pid() AS pid, pg_current_xact_id()::text AS version`,
        );

        pending = create();

        // Wait for the real unique-index conflict, not an arbitrary delay.
        // The resolver's first read cannot see the owner's uncommitted row.
        let blocked = false;

        for (let attempt = 0; attempt < 200; attempt += 1) {
          const { rows } = await pool.query(
            `SELECT EXISTS (
              SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))
            ) AS blocked`,
            [owners[0].pid],
          );

          if (rows[0].blocked) {
            blocked = true;
            break;
          }

          await Bun.sleep(10);
        }

        expect(blocked).toBe(true);
        await owner.query(completion);
        await pending;

        const { rows } = await pool.query(
          `SELECT s.id, s.xmin::text AS version FROM "Activity" a
           JOIN "ActivityActorSnapshot" s ON s.id = a."actorSnapshotId"
           WHERE a."idempotencyKey" = $1`,
          [activity.idempotencyKey],
        );

        expect(rows).toHaveLength(1);

        if (completion === "COMMIT") {
          expect(rows[0]).toEqual({
            id: snapshot.id,
            version: owners[0].version,
          });
        } else {
          expect(rows[0].id).not.toBe(snapshot.id);
        }
      } finally {
        await owner.query("ROLLBACK");
        owner.release();
        await pending;
      }
    },
  );

  it("limits actor and clan suggestions to snapshots used by the Organization", async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* ActivityRepository;

        for (const [guildId, names] of [
          ["suggestions-a", ["Only A", "Shared"]],
          ["suggestions-b", ["Only B", "Shared"]],
        ] as const) {
          for (const name of names) {
            const activity = gameActivity(`${guildId}-${name}`);

            yield* repository.create({
              ...activity,
              guildId,
              actorSnapshot: {
                ...activity.actorSnapshot,
                name: `Actor ${name}`,
                clanName: `Clan ${name}`,
              },
            });
          }
        }

        for (const [guildId, suffix] of [
          ["suggestions-a", "A"],
          ["suggestions-b", "B"],
        ] as const) {
          const actors = yield* repository.suggestActorNames(guildId, "Actor");
          const clans = yield* repository.suggestClanNames(guildId, "Clan");

          expect(actors.sort()).toEqual([
            `Actor Only ${suffix}`,
            "Actor Shared",
          ]);
          expect(clans.sort()).toEqual([`Clan Only ${suffix}`, "Clan Shared"]);
        }
      }).pipe(Effect.provide(repositoryLayer())),
    );
  });

  it("persists a redelivered activity exactly once", async () => {
    const activity = {
      userId: "user-1",
      guildId: "guild-1",
      discordId: "discord-1",
      type: ActivityType.CONNECT_EVENT,
      source: ActivitySource.WEB_APP,
      details: { sessionId: "session-1" },
      idempotencyKey: "redelivered-activity-1",
    } as const;

    const [first, second] = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* ActivityRepository;

        return yield* Effect.all(
          [repository.create(activity), repository.create(activity)],
          { concurrency: "unbounded" },
        );
      }).pipe(Effect.provide(repositoryLayer())),
    );

    expect(second).toEqual(first);
    expect(
      await pool.query(
        `SELECT COUNT(*)::int AS count FROM "Activity" WHERE "idempotencyKey" = $1`,
        [activity.idempotencyKey],
      ),
    ).toMatchObject({ rows: [{ count: 1 }] });
  });

  it("paginates by creation time across mixed identifier formats", async () => {
    await pool.query(
      `INSERT INTO "Activity" ("id", "userId", "guildId", "discordId", "type", "createdAt", "source", "idempotencyKey") VALUES
        ('zzzzzzzzzzzzzzzzzzzzzzzzz', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:03:00Z', 'WEB_APP', 'pagination-newest'),
        ('yyyyyyyyyyyyyyyyyyyyyyyyy', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:02:00Z', 'WEB_APP', 'pagination-same-time'),
        ('10000000-0000-4000-8000-000000000000', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:02:00Z', 'WEB_APP', 'pagination-middle'),
        ('xxxxxxxxxxxxxxxxxxxxxxxxx', 'user-pagination', 'guild-pagination', 'discord-pagination', 'CONNECT_EVENT', '2026-09-04T12:01:00Z', 'WEB_APP', 'pagination-oldest')`,
    );

    const [firstPage, secondPage] = await Effect.runPromise(
      Effect.gen(function* () {
        const repository = yield* ActivityRepository;

        const first = yield* repository.findMany({
          guildId: "guild-pagination",
          limit: 2,
        });

        const second = yield* repository.findMany({
          guildId: "guild-pagination",
          cursor: first.nextCursor,
          limit: 2,
        });

        return [first, second] as const;
      }).pipe(Effect.provide(repositoryLayer())),
    );

    expect(firstPage.data).toEqual([
      expect.objectContaining({ id: "zzzzzzzzzzzzzzzzzzzzzzzzz" }),
      expect.objectContaining({ id: "yyyyyyyyyyyyyyyyyyyyyyyyy" }),
    ]);
    expect(secondPage.data).toEqual([
      expect.objectContaining({ id: "10000000-0000-4000-8000-000000000000" }),
      expect.objectContaining({ id: "xxxxxxxxxxxxxxxxxxxxxxxxx" }),
    ]);
  });

  // Runs last: retention also drops the fixed-date rows of earlier tests.
  it("drops seven-day-old activity without queuing writers behind readers", async () => {
    const insert = (key: string, age: string) =>
      pool.query(
        `INSERT INTO "Activity" ("id", "userId", "guildId", "discordId", "type", "createdAt", "source", "idempotencyKey")
         VALUES ($1, 'user-retention', 'guild-retention', 'discord-retention', 'CONNECT_EVENT', now() - $2::interval, 'WEB_APP', $1)`,
        [key, age],
      );

    const remaining = async () =>
      (
        await pool.query(
          `SELECT "idempotencyKey" FROM "Activity" WHERE "guildId" = 'guild-retention'`,
        )
      ).rows.map((row) => row.idempotencyKey);

    const { rows: jobs } = await pool.query(
      `SELECT job_id FROM timescaledb_information.jobs WHERE proc_name = 'activity_retention'`,
    );

    const runner = await pool.connect();
    const reader = await pool.connect();
    // Without the job's own lock bound, fail on this timeout instead of waiting for the reader.
    await runner.query(`SET statement_timeout = '5s'`);

    const retain = () => runner.query(`CALL run_job($1)`, [jobs[0].job_id]);

    try {
      await insert("retention-kept", "6 days");
      await insert("retention-expired", "9 days");

      // Every activity write reads snapshots, so dropping a chunk must not lock them.
      await reader.query("BEGIN");
      await reader.query(`SELECT count(*) FROM "ActivityActorSnapshot"`);
      await retain();
      expect(await remaining()).toEqual(["retention-kept"]);
      await reader.query("COMMIT");

      // A pending drop blocks every later query on its chunk, so it gives up instead.
      await insert("retention-late", "9 days");
      await reader.query("BEGIN");
      await reader.query(`SELECT count(*) FROM "Activity"`);
      await expect(retain()).rejects.toMatchObject({ code: "55P03" });
      await reader.query("COMMIT");
      await retain();
      expect(await remaining()).toEqual(["retention-kept"]);
    } finally {
      await reader.query("ROLLBACK");
      reader.release();
      runner.release(true);
    }
  }, 15_000);
});
