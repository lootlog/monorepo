import { afterAll, beforeAll, beforeEach, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import { Effect, Redacted } from "effect";
import { TestClock } from "effect/testing";
import pg from "pg";
import { drizzleDatabaseEffect } from "#src/database/database";
import { createBattleId } from "#src/battles/battle-id";
import {
  BATTLE_SUBMISSION_RETENTION_DAYS,
  pruneBattleSubmissions,
} from "#src/battles/submission/battle-submission-retention";
import { makeBattleDeletion } from "./battle-deletion.js";

let postgres: StartedPostgreSqlContainer;

const BATTLE_IDS = {
  one: "01a10000-0000-7000-8000-000000000001",
  two: "01a10000-0000-7000-8000-000000000002",
  other: "01a10000-0000-7000-8000-000000000003",
};

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
    "timescale/timescaledb:2.32.0-pg18",
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
    "TRUNCATE battles, battle_warriors, battle_warrior_filters, battle_timelines, battle_submissions, battle_legacy_ids, user_characters, weapon_kills",
  );
  await pool.query(`INSERT INTO battles (id, "createdAt", "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", public)
    SELECT id, battle_id_created_at(id), owner, 'account', 'character', 'world', 1, 'pvp', 'winner', 'loser', 1, 2, true
    FROM (VALUES ('${BATTLE_IDS.one}'::uuid, 'owner'), ('${BATTLE_IDS.two}'::uuid, 'owner'), ('${BATTLE_IDS.other}'::uuid, 'other-owner')) AS seed(id, owner);
    INSERT INTO battle_legacy_ids ("legacyId", "battleId") VALUES ('${LEGACY_ONE}', '${BATTLE_IDS.one}');
    INSERT INTO user_characters (id, "userId", "characterId", name, world) VALUES ('character', 'owner', 'character', 'name', 'world');
    INSERT INTO weapon_kills (world, "characterId", "killFingerprint", "itemId", "userId") VALUES ('world', 'character', 'owner-kill', 'item', 'owner'), ('world', 'character', 'other-kill', 'item', 'other-owner');
    INSERT INTO battle_warriors ("battleId", "originalId", name, lvl, prof, icon, team, turns)
    SELECT id, 'character', 'name', 1, 'w', 'icon', 1, 1 FROM battles;
    INSERT INTO battle_warrior_filters ("userId", "battleId", "originalId", name, lvl, ph, team)
    SELECT "userId", id, 'character', 'name', 1, 0, 1 FROM battles;
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
  it(`removes a ${mode} deletion's rows from every battle table`, async () => {
    await run(
      Effect.gen(function* () {
        const deletion = makeBattleDeletion(yield* drizzleDatabaseEffect, {
          invalidateAnalyticsCache: () => Effect.void,
        });

        if (mode === "single") yield* deletion.deleteBattle(BATTLE_IDS.one);
        else yield* deletion.deleteUserBattles("owner");
      }),
    );

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

    expect(
      (
        await pool.query(
          'SELECT "killFingerprint" FROM weapon_kills ORDER BY "killFingerprint"',
        )
      ).rows,
    ).toEqual(
      mode === "single"
        ? [{ killFingerprint: "other-kill" }, { killFingerprint: "owner-kill" }]
        : [{ killFingerprint: "other-kill" }],
    );

    for (const table of [
      "battle_warriors",
      "battle_warrior_filters",
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
  });
}

it("forgets submission ids only after the retry window", async () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const day = 86_400_000;

  const seeds = {
    expired: createBattleId(now - BATTLE_SUBMISSION_RETENTION_DAYS * day - 1)
      .id,
    retained: createBattleId(now - BATTLE_SUBMISSION_RETENTION_DAYS * day + 1)
      .id,
  };

  await pool.query(`TRUNCATE battle_submissions;
    INSERT INTO battle_submissions ("userId", "submissionId", "battleId")
    SELECT 'owner', 'expired-' || n, '${seeds.expired}'::uuid FROM generate_series(1, 5001) n
    UNION ALL SELECT 'owner', 'retained', '${seeds.retained}'::uuid`);

  await run(
    Effect.gen(function* () {
      yield* TestClock.setTime(now);
      yield* pruneBattleSubmissions(yield* drizzleDatabaseEffect);
    }).pipe(Effect.provide(TestClock.layer())),
  );

  expect(
    (await pool.query('SELECT "submissionId" FROM battle_submissions')).rows,
  ).toEqual([{ submissionId: "retained" }]);
});
