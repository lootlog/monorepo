import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import postgres from "@prisma/orm-postgres/runtime";
import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import type { Contract } from "../src/prisma/contract.js";
import contractJson from "../src/prisma/runtime-contract.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dirname, "..");
const legacyMigrationsRoot = path.join(dirname, "fixtures/prisma7/migrations");
const finalLegacyMigration =
  "20260829043000_archive_comment_only_organization_loot_records";
const containers: Array<Awaited<ReturnType<PostgreSqlContainer["start"]>>> = [];

afterEach(async () => {
  await Promise.all(containers.splice(0).map((container) => container.stop()));
});

describe("Prisma database cutover", () => {
  it("signs and verifies a database created by the previous migration history", async () => {
    const container = await startPostgres();
    const connectionUri = container.getConnectionUri();
    const pool = new Pool({ connectionString: connectionUri });

    try {
      expect(migrationDirectories().at(-1)?.name).toBe(finalLegacyMigration);
      await applyLegacyMigrations(pool);
      const migrationCountBefore = await legacyMigrationCount(pool);

      runPrisma(connectionUri, ["db", "sign", "--contract", "db"]);
      runPrisma(connectionUri, ["migration", "status", "--to", "db"]);
      runPrisma(connectionUri, ["db", "verify"]);

      expect(await legacyMigrationCount(pool)).toBe(migrationCountBefore);
      expect(migrationCountBefore).toBeGreaterThan(0);
    } finally {
      await pool.end();
    }
  });

  it("creates and verifies a fresh database with legacy defaults and the rollout trigger", async () => {
    const container = await startPostgres();
    const connectionUri = container.getConnectionUri();
    runPrisma(connectionUri, ["db", "migrate", "--advance-ref", "db"]);

    const pool = new Pool({ connectionString: connectionUri });
    const database = postgres<Contract>({ contractJson, pg: pool });

    try {
      const trigger = await pool.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'Reservation_rollout_bridge_trigger'
            AND NOT tgisinternal
        ) AS "exists"
      `);
      const arrayDefaults = await pool.query<{ count: string }>(`
        SELECT COUNT(*)::text AS "count"
        FROM pg_attrdef d
        JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
        JOIN pg_class c ON c.oid = d.adrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND (
            (c.relname = 'DiscordGuildChannelSnapshot' AND a.attname IN ('requiredPermissions', 'grantedPermissions', 'missingPermissions'))
            OR (c.relname = 'DiscordGuildSyncState' AND a.attname IN ('requiredPermissions', 'grantedPermissions', 'missingPermissions'))
            OR (c.relname = 'Role' AND a.attname = 'permissions')
            OR (c.relname = 'UserCharactersLootlogSettings' AND a.attname = 'catchingGuildIds')
            OR (c.relname = 'UserGuildTimerSettings' AND a.attname IN ('hiddenTimers', 'pinnedTimers'))
            OR (c.relname = 'UserSettings' AND a.attname IN ('guildsOrder', 'hiddenGuildIds'))
          )
      `);

      expect(trigger.rows[0]?.exists).toBe(true);
      expect(Number(arrayDefaults.rows[0]?.count)).toBe(12);
      await expect(
        database.transaction(async (transaction) => {
          await transaction.execute(
            database.raw.sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
              .affectedCount()
              .build(),
          );
          return "serializable";
        }),
      ).resolves.toBe("serializable");
    } finally {
      await database.close();
      await pool.end();
    }
  });
});

async function startPostgres() {
  const container = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase("lootlog")
    .withUsername("lootlog")
    .withPassword("lootlog")
    .start();
  containers.push(container);
  return container;
}

function runPrisma(connectionUri: string, args: string[]) {
  const result = spawnSync("pnpm", ["exec", "prisma", ...args], {
    cwd: apiRoot,
    encoding: "utf8",
    env: { ...process.env, POSTGRESQL_CONNECTION_URI: connectionUri },
  });

  if (result.status !== 0) {
    throw new Error(
      [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
    );
  }
}

async function applyLegacyMigrations(pool: Pool) {
  await pool.query(`
    CREATE TABLE "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);

  for (const directory of migrationDirectories()) {
    const sql = readFileSync(
      path.join(legacyMigrationsRoot, directory.name, "migration.sql"),
      "utf8",
    );
    const statements = sql.includes("CONCURRENTLY")
      ? sql.split(/;\s*(?:\n|$)/u).filter((statement) => statement.trim())
      : [sql];
    for (const statement of statements) {
      // eslint-disable-next-line no-await-in-loop -- legacy migrations must be replayed in order
      await pool.query(statement);
    }
    // eslint-disable-next-line no-await-in-loop -- record each migration only after its SQL succeeds
    await recordLegacyMigration(pool, directory.name, sql);
  }
}

function migrationDirectories(): Dirent[] {
  return readdirSync(legacyMigrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
}

function recordLegacyMigration(pool: Pool, name: string, sql: string) {
  return pool.query(
    `INSERT INTO "_prisma_migrations"
      ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
     VALUES ($1, $2, NOW(), $3, 1)`,
    [randomUUID(), createHash("sha256").update(sql).digest("hex"), name],
  );
}

async function legacyMigrationCount(pool: Pool) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS "count" FROM "_prisma_migrations"`,
  );
  return Number(result.rows[0]?.count ?? 0);
}
