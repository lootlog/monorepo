import { afterAll, beforeAll, beforeEach, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import { Effect, Redacted } from "effect";
import pg from "pg";
import { drizzleDatabaseEffect } from "#src/database/database";
import { makeBattleDeletion } from "./battle-deletion.js";

let postgres: StartedPostgreSqlContainer;

const BATTLE_IDS = {
  one: "01a10000-0000-7000-8000-000000000001",
  two: "01a10000-0000-7000-8000-000000000002",
  other: "01a10000-0000-7000-8000-000000000003",
};

// "one" was saved before UUIDv7 IDs, so R2 keeps its object under its old ID.
const LEGACY_ONE = "legacy-one";

const battleName = (id: string) =>
  Object.entries(BATTLE_IDS).find(([, battleId]) => battleId === id)?.[0] ?? id;

const storedBattles = async () =>
  (await pool.query("SELECT id FROM battles ORDER BY id")).rows.map((row) =>
    battleName(row.id),
  );

let pool: pg.Pool;

beforeAll(async () => {
  postgres = await new PostgreSqlContainer(
    "timescale/timescaledb:2.24.0-pg17",
  ).start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });

  const child = Bun.spawn(["bun", "src/database/migrate.ts"], {
    cwd: new URL("../../../", import.meta.url).pathname,
    env: {
      ...process.env,
      POSTGRESQL_CONNECTION_URI: postgres.getConnectionUri(),
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (exit !== 0) throw new Error(`Migration failed: ${stdout}\n${stderr}`);
}, 60_000);

afterAll(async () => {
  await pool?.end();
  await postgres?.stop();
});

beforeEach(async () => {
  await pool.query(
    "TRUNCATE battles, battle_warriors, battle_timelines, battle_submissions, battle_legacy_ids, user_characters, battle_object_deletions",
  );
  await pool.query(`INSERT INTO battles (id, "createdAt", "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", public)
    SELECT id, battle_id_created_at(id), owner, 'account', 'character', 'world', 1, 'pvp', 'winner', 'loser', 1, 2, true
    FROM (VALUES ('${BATTLE_IDS.one}'::uuid, 'owner'), ('${BATTLE_IDS.two}'::uuid, 'owner'), ('${BATTLE_IDS.other}'::uuid, 'other-owner')) AS seed(id, owner);
    INSERT INTO battle_legacy_ids ("legacyId", "battleId") VALUES ('${LEGACY_ONE}', '${BATTLE_IDS.one}');
    INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('character', 'owner', 'character', 'name', 'world');
    INSERT INTO battle_warriors ("battleId", "userId", "originalId", name, lvl, prof, icon, team, turns)
    SELECT id, "userId", 'character', 'name', 1, 'w', 'icon', 1, 1 FROM battles;
    INSERT INTO battle_submissions ("userId", "submissionId", "battleId")
    SELECT "userId", id::text, id FROM battles;
    INSERT INTO battle_timelines ("battleId", "userId", events)
    SELECT id, "userId", '\\x00' FROM battles WHERE id <> '${BATTLE_IDS.one}';`);
});

const run = <A, E>(effect: Effect.Effect<A, E, PgClient.PgClient>) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(
        makePostgresLayer({ url: Redacted.make(postgres.getConnectionUri()) }),
      ),
    ),
  );

for (const mode of ["single", "user"] as const) {
  it(`retains durable ${mode} deletion work across R2 failure and a restarted worker`, async () => {
    const removed: string[] = [];
    let fail = true;

    const storage = {
      deleteBattlesData: async (ids: readonly string[]) => {
        const failed = ids.filter((id) => fail && id === LEGACY_ONE);
        removed.push(...ids.filter((id) => !failed.includes(id)));

        return failed;
      },
    };

    const analytics = { invalidateAnalyticsCache: () => Effect.void };
    await run(
      Effect.gen(function* () {
        const deletion = makeBattleDeletion(
          yield* drizzleDatabaseEffect,
          storage,
          analytics,
        );

        if (mode === "single") yield* deletion.deleteBattle(BATTLE_IDS.one);
        else yield* deletion.deleteUserBattles("owner");
        yield* deletion.drain;
      }),
    );

    // Only the battle saved before timelines moved to Postgres owns an object.
    const expected = [LEGACY_ONE];

    expect(
      (
        await pool.query(
          'SELECT "battleId" FROM battle_object_deletions ORDER BY "battleId"',
        )
      ).rows,
    ).toEqual([{ battleId: LEGACY_ONE }]);
    expect(await storedBattles()).toEqual(
      mode === "single" ? ["two", "other"] : ["other"],
    );
    expect((await pool.query("SELECT * FROM battle_legacy_ids")).rows).toEqual(
      [],
    );

    if (mode === "user")
      expect((await pool.query("SELECT * FROM user_characters")).rows).toEqual(
        [],
      );

    // Battle hypertables have no cascading foreign keys.
    for (const table of [
      "battle_warriors",
      "battle_timelines",
      "battle_submissions",
    ])
      expect(
        (
          await pool.query(
            `SELECT "battleId" FROM ${table} ORDER BY "battleId"`,
          )
        ).rows.map((row) => battleName(row.battleId)),
      ).toEqual(mode === "single" ? ["two", "other"] : ["other"]);
    expect(
      (
        await pool.query(
          `SELECT id FROM battles WHERE id = '${BATTLE_IDS.one}' AND public = true`,
        )
      ).rows,
    ).toEqual([]);
    fail = false;
    await pool.query('UPDATE battle_object_deletions SET "retryAt" = now()');
    // A fresh module/runtime has no memory of the request that removed the row.
    await run(
      Effect.gen(function* () {
        const restarted = makeBattleDeletion(
          yield* drizzleDatabaseEffect,
          storage,
          analytics,
        );

        yield* restarted.drain;
        yield* restarted.drain;
      }),
    );
    expect(removed.sort()).toEqual(expected.sort());
    expect(
      (await pool.query("SELECT * FROM battle_object_deletions")).rows,
    ).toEqual([]);
  });
}

it("rolls back database removal if durable cleanup cannot be recorded", async () => {
  await pool.query(
    `ALTER TABLE battle_object_deletions ADD CONSTRAINT reject_cleanup CHECK (false)`,
  );

  try {
    await expect(
      run(
        Effect.gen(function* () {
          const deletion = makeBattleDeletion(
            yield* drizzleDatabaseEffect,
            { deleteBattlesData: async () => [] },
            { invalidateAnalyticsCache: () => Effect.void },
          );

          yield* deletion.deleteUserBattles("owner");
        }),
      ),
    ).rejects.toBeDefined();
    expect(await storedBattles()).toEqual(["one", "two", "other"]);
    expect((await pool.query("SELECT id FROM user_characters")).rows).toEqual([
      { id: "character" },
    ]);
  } finally {
    await pool.query(
      "ALTER TABLE battle_object_deletions DROP CONSTRAINT reject_cleanup",
    );
  }
});

it("claims disjoint cleanup batches across workers and invalidates each owner once", async () => {
  await pool.query(`INSERT INTO battle_object_deletions ("battleId", "userId")
    SELECT 'pending-' || n, 'owner' FROM generate_series(1, 2000) n`);
  const seen: string[][] = [];
  let invalidations = 0;
  const firstStarted = Promise.withResolvers<void>();
  const releaseFirst = Promise.withResolvers<void>();

  const storage = {
    deleteBattlesData: async (ids: readonly string[]) => {
      seen.push([...ids]);

      if (seen.length === 1) {
        firstStarted.resolve();
        await releaseFirst.promise;
      }

      return [];
    },
  };

  const analytics = {
    invalidateAnalyticsCache: () =>
      Effect.sync(() => {
        invalidations += 1;
      }),
  };

  const drain = () =>
    run(
      Effect.gen(function* () {
        yield* makeBattleDeletion(
          yield* drizzleDatabaseEffect,
          storage,
          analytics,
        ).drain;
      }),
    );

  const first = drain();
  await firstStarted.promise;

  try {
    await drain();
    expect(seen.map((batch) => batch.length)).toEqual([1000, 1000]);
    expect(new Set(seen.flat()).size).toBe(2000);
    expect(invalidations).toBe(2);
  } finally {
    releaseFirst.resolve();
    await first;
  }

  expect(
    (await pool.query("SELECT * FROM battle_object_deletions")).rows,
  ).toEqual([]);
});
