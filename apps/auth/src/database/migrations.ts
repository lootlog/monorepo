import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type pg from "pg";
import { db, drizzlePool } from "./drizzle";

const migrationsSchema = "drizzle";
const migrationsTable = "__drizzle_migrations";
const authTableNames = ["user", "session", "account", "verification", "jwks"];
const migrationsFolder = path.resolve(process.cwd(), "drizzle");

type MigrationJournal = {
  entries: Array<{
    when: number;
    tag: string;
  }>;
};

type LocalMigration = {
  createdAt: number;
  hash: string;
};

function getMigrationJournalPath() {
  return path.join(migrationsFolder, "meta", "_journal.json");
}

function readLocalMigrations(): LocalMigration[] {
  const journalPath = getMigrationJournalPath();

  if (!fs.existsSync(journalPath)) {
    throw new Error(`Missing auth migration journal at ${journalPath}`);
  }

  const journal = JSON.parse(
    fs.readFileSync(journalPath, "utf8"),
  ) as MigrationJournal;

  return journal.entries.map(({ when, tag }) => {
    const migrationPath = path.join(migrationsFolder, `${tag}.sql`);
    const sqlContent = fs.readFileSync(migrationPath, "utf8");

    return {
      createdAt: when,
      hash: crypto.createHash("sha256").update(sqlContent).digest("hex"),
    };
  });
}

async function ensureMigrationTracking(pool: pg.Pool) {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${migrationsSchema}`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${migrationsSchema}.${migrationsTable} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function getTrackedMigrationCount(pool: pg.Pool) {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${migrationsSchema}.${migrationsTable}`,
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function getExistingAuthTableCount(pool: pg.Pool) {
  const result = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [authTableNames],
  );

  return Number(result.rows[0]?.count ?? "0");
}

async function repairLegacyJwtSchema(pool: pg.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "jwks" (
      "id" text PRIMARY KEY NOT NULL,
      "publicKey" text NOT NULL,
      "privateKey" text NOT NULL,
      "createdAt" timestamp with time zone NOT NULL,
      "expiresAt" timestamp with time zone
    )
  `);

  await pool.query(`
    ALTER TABLE "jwks"
    ADD COLUMN IF NOT EXISTS "expiresAt" timestamp with time zone
  `);
}

async function markBaselineMigrationsAsApplied(pool: pg.Pool) {
  const localMigrations = readLocalMigrations();

  await Promise.all(
    localMigrations.map((migration) =>
      pool.query(
        `
          INSERT INTO ${migrationsSchema}.${migrationsTable} (hash, created_at)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [migration.hash, migration.createdAt],
      ),
    ),
  );
}

export async function initializeAuthMigrations(pool: pg.Pool = drizzlePool) {
  await ensureMigrationTracking(pool);

  const trackedMigrationCount = await getTrackedMigrationCount(pool);

  if (trackedMigrationCount > 0) {
    return;
  }

  const existingAuthTableCount = await getExistingAuthTableCount(pool);

  if (existingAuthTableCount === 0) {
    return;
  }

  await repairLegacyJwtSchema(pool);
  await markBaselineMigrationsAsApplied(pool);
}

export async function runAuthMigrations(pool: pg.Pool = drizzlePool) {
  await initializeAuthMigrations(pool);
  await migrate(db, {
    migrationsFolder,
    migrationsSchema,
    migrationsTable,
  });
}
