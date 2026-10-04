import { afterAll, beforeAll, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const appRoot = new URL("../../", import.meta.url).pathname;

const TIMESCALE_MIGRATION = "20261004153153_battlelog_timescale";

let postgres: StartedPostgreSqlContainer;

let pool: pg.Pool;

const run = async (command: string[]) => {
  const child = Bun.spawn(command, {
    cwd: appRoot,
    env: {
      ...process.env,
      POSTGRESQL_CONNECTION_URI: postgres.getConnectionUri(),
      // Two battles per batch, so batches end inside the copied history.
      CUTOVER_BATCH_SIZE: "2",
    },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [exit, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  if (exit !== 0)
    throw new Error(`${command.join(" ")} failed: ${stdout}\n${stderr}`);

  return stdout;
};

const cutover = (step: string) =>
  run(["bun", "scripts/battlelog-timescale-cutover.ts", step]);

const oldBattles = [
  // Two battles saved in the same millisecond keep their previous order.
  { id: "cmglj0y2u0224qd0ioniw0lxa", createdAt: "2026-03-01 10:00:00.123" },
  { id: "cmglj0y2u0224qd0ioniw0lxb", createdAt: "2026-03-01 10:00:00.123" },
  {
    id: "yer8pvzi39ste3s7k7cre7ul",
    createdAt: "2026-06-01 12:00:00.000",
    submissionId: "accepted-submission",
  },
  {
    id: "4708cd7c-fc52-4e76-a4f8-e1b0222bd081",
    createdAt: "2026-09-20 08:30:00.500",
    public: true,
  },
  {
    id: "c0ffee00-fc52-4e76-a4f8-e1b0222bd081",
    createdAt: "2026-09-21 08:30:00.500",
  },
];

const insertOldBattle = async ({
  id,
  createdAt,
  submissionId = null,
  public: isPublic = false,
}: {
  id: string;
  createdAt: string;
  submissionId?: string | null;
  public?: boolean;
}) => {
  await pool.query(
    `INSERT INTO battles (id, "createdAt", "updatedAt", public, "userId", "accountId", "characterId", world, duration, type, winner, loser, "winningTeam", "losingTeam", statistics, "submissionId")
     VALUES ($1, $2, $2, $3, 'owner', 'account', 'hero', 'world', 10, '1v1', 'Hero', 'Enemy', 1, 2, '{}', $4)`,
    [id, createdAt, isPublic, submissionId],
  );
  await pool.query(
    `INSERT INTO battle_warriors (id, "battleId", "originalId", name, lvl, prof, icon, team, turns, ph)
     VALUES (gen_random_uuid()::text, $1, 'hero', 'Hero', 100, 'w', 'hero.gif', 1, 3, 5),
            (gen_random_uuid()::text, $1, 'enemy', 'Enemy', 90, 'm', 'enemy.gif', 2, 3, 0)`,
    [id],
  );
};

beforeAll(async () => {
  postgres = await new PostgreSqlContainer(
    "timescale/timescaledb:2.24.0-pg17",
  ).start();
  pool = new pg.Pool({ connectionString: postgres.getConnectionUri() });

  // The released schema: every migration before the TimescaleDB one.
  const released = await mkdtemp(join(tmpdir(), "battlelog-released-"));

  try {
    for (const entry of await readdir(join(appRoot, "drizzle"))) {
      if (/^\d{14}_/.test(entry) && entry < TIMESCALE_MIGRATION)
        await cp(join(appRoot, "drizzle", entry), join(released, entry), {
          recursive: true,
        });
    }

    await migrate(drizzle({ client: pool }), { migrationsFolder: released });
  } finally {
    await rm(released, { recursive: true, force: true });
  }

  for (const battle of oldBattles) await insertOldBattle(battle);
}, 120_000);

afterAll(async () => {
  await pool?.end();
  await postgres?.stop();
});

it("moves battles onto the TimescaleDB schema online, keeping old links, order and every change the released service makes", async () => {
  const deployMigrations = () => run(["bun", "src/database/migrate.ts"]);

  await expect(deployMigrations()).rejects.toThrow(
    "migrate them with scripts/battlelog-timescale-cutover.ts",
  );

  await cutover("prepare");
  await cutover("copy");

  // The released service keeps writing while the copy runs.
  await insertOldBattle({
    id: "5ca1ab1e-fc52-4e76-a4f8-e1b0222bd081",
    createdAt: "2026-10-01 00:00:00.000",
  });
  await pool.query(
    `UPDATE battles SET public = false WHERE id = '4708cd7c-fc52-4e76-a4f8-e1b0222bd081'`,
  );
  await pool.query(
    `DELETE FROM battles WHERE id = 'c0ffee00-fc52-4e76-a4f8-e1b0222bd081'`,
  );

  await cutover("cutover");

  const expectedOrder = (
    await pool.query(
      `SELECT id FROM battlelog_old.battles ORDER BY "createdAt" DESC, id DESC`,
    )
  ).rows.map((row) => row.id);

  const migrated = await pool.query(
    `SELECT legacy."legacyId", battle.id, battle.public, battle."createdAt",
       battle_id_created_at(battle.id) AS "idTime",
       (SELECT count(*)::int FROM battle_warriors warrior
        WHERE warrior."battleId" = battle.id AND warrior."userId" = battle."userId") AS warriors,
       (SELECT "submissionId" FROM battle_submissions submission
        WHERE submission."battleId" = battle.id) AS "submissionId"
     FROM battles battle
     JOIN battle_legacy_ids legacy ON legacy."battleId" = battle.id
     ORDER BY battle.id DESC`,
  );

  expect(migrated.rows.map((row) => row.legacyId)).toEqual(expectedOrder);
  expect(expectedOrder).not.toContain("c0ffee00-fc52-4e76-a4f8-e1b0222bd081");
  expect(expectedOrder).toContain("5ca1ab1e-fc52-4e76-a4f8-e1b0222bd081");

  for (const row of migrated.rows) {
    expect(row.idTime).toEqual(row.createdAt);
    expect(row.warriors).toBe(2);
    expect(row.public).toBe(false);
  }

  expect(
    migrated.rows.find((row) => row.legacyId === "yer8pvzi39ste3s7k7cre7ul")
      ?.submissionId,
  ).toBe("accepted-submission");
  expect(
    (
      await pool.query(
        `SELECT hypertable_name FROM timescaledb_information.hypertables
         WHERE hypertable_schema = 'public' ORDER BY 1`,
      )
    ).rows,
  ).toEqual([
    { hypertable_name: "battle_timelines" },
    { hypertable_name: "battle_warriors" },
    { hypertable_name: "battles" },
  ]);
  expect(
    (
      await pool.query(
        `SELECT bool_and(scheduled) AS scheduled FROM timescaledb_information.jobs
         WHERE hypertable_schema = 'public' AND proc_name = 'policy_compression'`,
      )
    ).rows,
  ).toEqual([{ scheduled: true }]);

  // The cutover recorded the migration, so a deploy has nothing left to apply.
  await deployMigrations();

  expect(await cutover("verify")).toContain(
    "old battles without a migrated battle: 0",
  );
  await cutover("cleanup");
  expect(
    (
      await pool.query(
        `SELECT schema_name FROM information_schema.schemata
         WHERE schema_name IN ('battlelog_next', 'battlelog_old')`,
      )
    ).rows,
  ).toEqual([]);
}, 120_000);
