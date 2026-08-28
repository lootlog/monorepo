import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterEach, describe, expect, it } from "vitest";
import { createActivityApplicationDatabase } from "../src/shared/db/application-client";
import { createActivityDatabase } from "../src/shared/db/database";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const activityRoot = path.resolve(dirname, "..");
const legacyMigrationsRoot = path.join(dirname, "fixtures/prisma7/migrations");
const containers: StartedTestContainer[] = [];

afterEach(async () => {
  await Promise.all(containers.splice(0).map((container) => container.stop()));
});

describe("Prisma 8 Activity database cutover", () => {
  it("signs and verifies the TimescaleDB schema created by Prisma 7 migrations", async () => {
    const { connectionUri } = await startTimescale();
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

  it("creates a fresh hypertable with retention and supports atomic stats updates", async () => {
    const { connectionUri } = await startTimescale();
    runPrisma(connectionUri, ["db", "migrate", "--advance-ref", "db"]);
    runPrisma(connectionUri, ["db", "verify"]);

    const pool = new Pool({ connectionString: connectionUri });
    const hypertable = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM timescaledb_information.hypertables
        WHERE hypertable_schema = 'public'
          AND hypertable_name = 'Activity'
      ) AS "exists"
    `);
    const retention = await pool.query<{ dropAfter: string }>(`
      SELECT config ->> 'drop_after' AS "dropAfter"
      FROM timescaledb_information.jobs
      WHERE hypertable_schema = 'public'
        AND hypertable_name = 'Activity'
        AND proc_name = 'policy_retention'
    `);
    const dimension = await pool.query<{ interval: string }>(`
      SELECT time_interval::text AS "interval"
      FROM timescaledb_information.dimensions
      WHERE hypertable_schema = 'public'
        AND hypertable_name = 'Activity'
        AND column_name = 'createdAt'
    `);

    expect(hypertable.rows[0]?.exists).toBe(true);
    expect(retention.rows[0]?.dropAfter).toBe("7 days");
    expect(dimension.rows[0]?.interval).toBe("1 day");

    const database = createActivityApplicationDatabase(
      createActivityDatabase({ pool }),
    );
    const key = {
      guildId: "cutover-guild",
      discordId: "cutover-user",
      source: "GAME",
    };
    await database.orm.public.MemberActivityStats.upsert({
      where: { guildId_discordId_source: key },
      create: {
        ...key,
        activeSessionCount: 1,
        lastSeenAt: new Date(),
        visitCount: 1,
      },
      update: {
        activeSessionCount: 1,
        lastSeenAt: new Date(),
        visitCount: { increment: 1 },
      },
    });
    const stats = await database.orm.public.MemberActivityStats.upsert({
      where: { guildId_discordId_source: key },
      create: {
        ...key,
        activeSessionCount: 1,
        lastSeenAt: new Date(),
        visitCount: 1,
      },
      update: {
        activeSessionCount: 2,
        lastSeenAt: new Date(),
        visitCount: { increment: 2 },
      },
    });

    expect(stats.visitCount).toBe(3);
    expect(stats.updatedAt).toBeInstanceOf(Date);
    await pool.end();
  });
});

async function startTimescale() {
  const container = await new GenericContainer(
    "timescale/timescaledb:latest-pg17",
  )
    .withEnvironment({
      POSTGRES_DB: "activity",
      POSTGRES_PASSWORD: "lootlog",
      POSTGRES_USER: "lootlog",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/u, 2),
    )
    .start();
  containers.push(container);
  return {
    connectionUri: `postgresql://lootlog:lootlog@${container.getHost()}:${container.getMappedPort(5432)}/activity`,
  };
}

function runPrisma(connectionUri: string, args: string[]) {
  execFileSync("pnpm", ["exec", "prisma", ...args], {
    cwd: activityRoot,
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
    await pool.query(sql);
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
