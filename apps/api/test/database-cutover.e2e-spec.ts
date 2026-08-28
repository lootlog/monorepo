import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { createApiApplicationDatabase } from "../src/db/application-client";
import { createApiDatabase } from "../src/db/database";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(dirname, "..");
const legacyMigrationsRoot = path.join(dirname, "fixtures/prisma7/migrations");

const containers: Array<Awaited<ReturnType<PostgreSqlContainer["start"]>>> = [];

afterEach(async () => {
  await Promise.all(containers.splice(0).map((container) => container.stop()));
});

describe("Prisma 8 database cutover", () => {
  it("signs and verifies a database created by the Prisma 7 migration history", async () => {
    const container = await startPostgres();
    const connectionUri = container.getConnectionUri();
    const pool = new Pool({ connectionString: connectionUri });

    await applyLegacyMigrations(pool, legacyMigrationsRoot);
    const migrationCountBefore = await legacyMigrationCount(pool);

    runPrisma(connectionUri, ["db", "sign", "--contract", "db"]);
    runPrisma(connectionUri, ["migration", "status", "--to", "db"]);
    runPrisma(connectionUri, ["db", "verify"]);

    expect(await legacyMigrationCount(pool)).toBe(migrationCountBefore);
    expect(migrationCountBefore).toBeGreaterThan(0);
    await pool.end();
  });

  it("creates and verifies a fresh database with the rollout trigger and runtime contract", async () => {
    const container = await startPostgres();
    const connectionUri = container.getConnectionUri();
    runPrisma(connectionUri, ["db", "migrate", "--advance-ref", "db"]);
    runPrisma(connectionUri, ["db", "verify"]);

    const pool = new Pool({ connectionString: connectionUri });
    const trigger = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'Reservation_rollout_bridge_trigger'
          AND NOT tgisinternal
      ) AS "exists"
    `);
    expect(trigger.rows[0]?.exists).toBe(true);

    const database = createApiApplicationDatabase(createApiDatabase({ pool }));
    await database.orm.public.Guild.create({
      data: { id: "cutover-guild", name: "Cutover", ownerId: "owner" },
    });
    await database.orm.public.Role.create({
      data: {
        id: "cutover-role",
        guildId: "cutover-guild",
        name: "Admin",
        permissions: ["ADMIN"],
        position: 10,
      },
    });

    const role = await database.orm.public.Role.update({
      where: { id: "cutover-role" },
      data: { position: { increment: 2 } },
    });
    const roles = await database.orm.public.Role.findMany({
      where: { permissions: { has: "ADMIN" } },
      select: { id: true, permissions: true },
    });

    expect(role.position).toBe(12);
    expect(roles).toEqual([{ id: "cutover-role", permissions: ["ADMIN"] }]);
    await pool.end();
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
  execFileSync("pnpm", ["exec", "prisma", ...args], {
    cwd: apiRoot,
    env: { ...process.env, POSTGRESQL_CONNECTION_URI: connectionUri },
    stdio: "pipe",
  });
}

async function applyLegacyMigrations(pool: Pool, migrationsRoot: string) {
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

  for (const directory of migrationDirectories(migrationsRoot)) {
    const sql = readFileSync(
      path.join(migrationsRoot, directory.name, "migration.sql"),
      "utf8",
    );
    const statements = sql.includes("CONCURRENTLY")
      ? sql.split(/;\s*(?:\n|$)/u).filter((statement) => statement.trim())
      : [sql];
    for (const statement of statements) {
      await pool.query(statement);
    }
    await pool.query(
      `INSERT INTO "_prisma_migrations" (
        "id", "checksum", "finished_at", "migration_name", "applied_steps_count"
      ) VALUES ($1, $2, NOW(), $3, 1)`,
      [
        randomUUID(),
        createHash("sha256").update(sql).digest("hex"),
        directory.name,
      ],
    );
  }
}

function migrationDirectories(migrationsRoot: string): Dirent[] {
  return readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function legacyMigrationCount(pool: Pool) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS "count" FROM "_prisma_migrations"`,
  );
  return Number(result.rows[0]?.count ?? 0);
}
