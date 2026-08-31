import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "@prisma/orm-postgres/runtime";
import { Pool } from "pg";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { afterEach, describe, expect, it } from "vitest";
import type { Contract } from "../src/prisma/contract.js";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

const dirname = path.dirname(fileURLToPath(import.meta.url));
const activityRoot = path.resolve(dirname, "..");
const legacyMigrationsRoot = path.join(dirname, "fixtures/prisma7/migrations");
const finalLegacyMigration = "20260623090000_add_member_activity_sessions";
const containers: StartedTestContainer[] = [];

afterEach(async () => {
  await Promise.all(containers.splice(0).map((container) => container.stop()));
});

describe("Prisma Activity database cutover", () => {
  it("signs and verifies the TimescaleDB schema created by Prisma 7 migrations", async () => {
    const connectionUri = await startTimescale();
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

  it("creates a fresh hypertable with retention and a usable runtime contract", async () => {
    const connectionUri = await startTimescale();
    runPrisma(connectionUri, ["db", "migrate", "--advance-ref", "db"]);

    const pool = new Pool({ connectionString: connectionUri });
    const database = postgres<Contract>({ contractJson, pg: pool });

    try {
      const hypertable = await pool.query<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM timescaledb_information.hypertables
          WHERE hypertable_schema = 'public' AND hypertable_name = 'Activity'
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

      await pool.query(`
        INSERT INTO "MemberActivityStats"
          ("guildId", "discordId", "source", "lastSeenAt", "visitCount", "activeSessionCount", "updatedAt")
        VALUES ('cutover-guild', 'cutover-user', 'GAME', NOW(), 3, 1, NOW())
      `);
      const stats = await database.orm.public.MemberActivityStats.where({
        guildId: "cutover-guild",
        discordId: "cutover-user",
        source: "GAME",
      }).first();

      expect(stats?.visitCount).toBe(3);
    } finally {
      await database.close();
      await pool.end();
    }
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
  return `postgresql://lootlog:lootlog@${container.getHost()}:${container.getMappedPort(5432)}/activity`;
}

function runPrisma(connectionUri: string, args: string[]) {
  execFileSync("pnpm", ["exec", "prisma", ...args], {
    cwd: activityRoot,
    env: { ...process.env, POSTGRESQL_CONNECTION_URI: connectionUri },
    stdio: "pipe",
  });
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
    // eslint-disable-next-line no-await-in-loop -- legacy migrations must be replayed in order
    await pool.query(sql);
    // eslint-disable-next-line no-await-in-loop -- record each migration only after its SQL succeeds
    await pool.query(
      `INSERT INTO "_prisma_migrations"
        ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
       VALUES ($1, $2, NOW(), $3, 1)`,
      [
        randomUUID(),
        createHash("sha256").update(sql).digest("hex"),
        directory.name,
      ],
    );
  }
}

function migrationDirectories(): Dirent[] {
  return readdirSync(legacyMigrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function legacyMigrationCount(pool: Pool) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS "count" FROM "_prisma_migrations"`,
  );
  return Number(result.rows[0]?.count ?? 0);
}
