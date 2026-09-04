import { afterAll, beforeAll, beforeEach, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import { Effect, Redacted } from "effect";
import pg from "pg";
import { readdir } from "node:fs/promises";
import { makeDrizzleDatabase } from "#src/database/database";
import { makeBattleDeletion } from "./battle-deletion.js";

let postgres: StartedPostgreSqlContainer;
let pool: pg.Pool;

beforeAll(async () => {
  postgres = await new PostgreSqlContainer("postgres:17-alpine").start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });
  const migrations = new URL("../../../drizzle/", import.meta.url);
  for (const entry of (await readdir(migrations)).sort()) {
    if (entry === "20260904192453_pending_object_deletions") continue;
    const migration = Bun.file(new URL(`${entry}/migration.sql`, migrations));
    if (await migration.exists()) await pool.query(await migration.text());
  }
  for (const command of [
    ["bun", "scripts/migrate-init.ts"],
    ["bun", "src/database/migrate.ts"],
    ["bun", "src/database/migrate.ts"],
  ]) {
    const child = Bun.spawn(command, {
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
  }
  const tracked = await pool.query(
    "SELECT name FROM drizzle.__drizzle_migrations ORDER BY name",
  );
  expect(tracked.rows).toHaveLength(8);
  expect(tracked.rows.at(-1)?.name).toBe(
    "20260904192453_pending_object_deletions",
  );
  // The adoption command must not mark new migrations as applied without SQL.
  expect(
    (await pool.query(`SELECT to_regclass('battle_object_deletions') AS table`))
      .rows,
  ).toEqual([{ table: "battle_object_deletions" }]);
}, 60_000);

afterAll(async () => {
  await pool?.end();
  await postgres?.stop();
});

beforeEach(async () => {
  await pool.query(
    "TRUNCATE battles, user_characters, battle_object_deletions CASCADE",
  );
  await pool.query(`INSERT INTO battles (id, "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", statistics, public)
    SELECT id, owner, 'account', 'character', 'world', 1, 'pvp', 'winner', 'loser', 1, 2, '{}', true
    FROM (VALUES ('one', 'owner'), ('two', 'owner'), ('other', 'other-owner')) AS seed(id, owner);
    INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('character', 'owner', 'character', 'name', 'world');
    INSERT INTO battle_warriors (id, "battleId", "originalId", name, lvl, prof, icon, team, turns)
    VALUES ('warrior', 'one', 'character', 'name', 1, 'w', 'icon', 1, 1);`);
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
      deleteBattleData: async (id: string) => {
        if (fail && id === "one") throw new Error("R2 unavailable");
        removed.push(id);
      },
    };
    const analytics = { invalidateAnalyticsCache: () => Effect.void };
    await run(
      Effect.gen(function* () {
        const deletion = makeBattleDeletion(
          yield* makeDrizzleDatabase,
          storage,
          analytics,
        );
        if (mode === "single") yield* deletion.deleteBattle("one");
        else yield* deletion.deleteUserBattles("owner");
        yield* deletion.drain;
      }),
    );

    const expected = mode === "single" ? ["one"] : ["one", "two"];
    expect(
      (
        await pool.query(
          'SELECT "battleId" FROM battle_object_deletions ORDER BY "battleId"',
        )
      ).rows,
    ).toEqual([{ battleId: "one" }]);
    expect(
      (await pool.query("SELECT id FROM battles ORDER BY id")).rows,
    ).toEqual(
      mode === "single" ? [{ id: "other" }, { id: "two" }] : [{ id: "other" }],
    );
    if (mode === "user")
      expect((await pool.query("SELECT * FROM user_characters")).rows).toEqual(
        [],
      );

    expect((await pool.query("SELECT id FROM battle_warriors")).rows).toEqual(
      [],
    );
    expect(
      (
        await pool.query(
          `SELECT id FROM battles WHERE id = 'one' AND public = true`,
        )
      ).rows,
    ).toEqual([]);
    fail = false;
    await pool.query('UPDATE battle_object_deletions SET "retryAt" = now()');
    // A fresh module/runtime has no memory of the request that removed the row.
    await run(
      Effect.gen(function* () {
        const restarted = makeBattleDeletion(
          yield* makeDrizzleDatabase,
          storage,
          analytics,
        );
        yield* restarted.drain;
        yield* restarted.drain;
      }),
    );
    expect(removed.sort()).toEqual(expected);
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
            yield* makeDrizzleDatabase,
            { deleteBattleData: async () => {} },
            { invalidateAnalyticsCache: () => Effect.void },
          );
          yield* deletion.deleteUserBattles("owner");
        }),
      ),
    ).rejects.toBeDefined();
    expect(
      (await pool.query("SELECT id FROM battles ORDER BY id")).rows,
    ).toEqual([{ id: "one" }, { id: "other" }, { id: "two" }]);
    expect((await pool.query("SELECT id FROM user_characters")).rows).toEqual([
      { id: "character" },
    ]);
  } finally {
    await pool.query(
      "ALTER TABLE battle_object_deletions DROP CONSTRAINT reject_cleanup",
    );
  }
});
