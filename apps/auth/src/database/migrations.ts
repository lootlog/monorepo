import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type pg from "pg";
import type { AuthDatabaseConnection } from "./drizzle.js";

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

type SchemaColumn = {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: "NO" | "YES";
};

export const AUTH_SCHEMA_FINGERPRINT: ReadonlyArray<SchemaColumn> = [
  ["account", "accessToken", "text", "YES"],
  ["account", "accessTokenExpiresAt", "timestamp with time zone", "YES"],
  ["account", "accountId", "text", "NO"],
  ["account", "createdAt", "timestamp with time zone", "NO"],
  ["account", "id", "text", "NO"],
  ["account", "idToken", "text", "YES"],
  ["account", "password", "text", "YES"],
  ["account", "providerId", "text", "NO"],
  ["account", "refreshToken", "text", "YES"],
  ["account", "refreshTokenExpiresAt", "timestamp with time zone", "YES"],
  ["account", "scope", "text", "YES"],
  ["account", "updatedAt", "timestamp with time zone", "NO"],
  ["account", "userId", "text", "NO"],
  ["jwks", "createdAt", "timestamp with time zone", "NO"],
  ["jwks", "expiresAt", "timestamp with time zone", "YES"],
  ["jwks", "id", "text", "NO"],
  ["jwks", "privateKey", "text", "NO"],
  ["jwks", "publicKey", "text", "NO"],
  ["session", "createdAt", "timestamp with time zone", "NO"],
  ["session", "expiresAt", "timestamp with time zone", "NO"],
  ["session", "id", "text", "NO"],
  ["session", "impersonatedBy", "text", "YES"],
  ["session", "ipAddress", "text", "YES"],
  ["session", "token", "text", "NO"],
  ["session", "updatedAt", "timestamp with time zone", "NO"],
  ["session", "userAgent", "text", "YES"],
  ["session", "userId", "text", "NO"],
  ["user", "banExpires", "timestamp with time zone", "YES"],
  ["user", "banReason", "text", "YES"],
  ["user", "banned", "boolean", "YES"],
  ["user", "createdAt", "timestamp with time zone", "NO"],
  ["user", "discordId", "text", "NO"],
  ["user", "email", "text", "NO"],
  ["user", "emailVerified", "boolean", "NO"],
  ["user", "id", "text", "NO"],
  ["user", "image", "text", "YES"],
  ["user", "name", "text", "NO"],
  ["user", "role", "text", "YES"],
  ["user", "updatedAt", "timestamp with time zone", "NO"],
  ["verification", "createdAt", "timestamp with time zone", "NO"],
  ["verification", "expiresAt", "timestamp with time zone", "NO"],
  ["verification", "id", "text", "NO"],
  ["verification", "identifier", "text", "NO"],
  ["verification", "updatedAt", "timestamp with time zone", "NO"],
  ["verification", "value", "text", "NO"],
].map(([tableName, columnName, dataType, isNullable]) => ({
  tableName,
  columnName,
  dataType,
  isNullable,
})) as ReadonlyArray<SchemaColumn>;

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

export async function assertAuthSchemaFingerprint(pool: pg.Pool) {
  const result = await pool.query<{
    tableName: string;
    columnName: string;
    dataType: string;
    isNullable: "NO" | "YES";
  }>(
    `
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name, column_name
    `,
    [authTableNames],
  );

  if (JSON.stringify(result.rows) !== JSON.stringify(AUTH_SCHEMA_FINGERPRINT)) {
    throw new Error(
      "Auth database schema does not match the adopted Drizzle baseline; refusing to mark migrations as applied.",
    );
  }
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

export async function initializeAuthMigrations(pool: pg.Pool) {
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
  await assertAuthSchemaFingerprint(pool);
  await markBaselineMigrationsAsApplied(pool);
}

export async function runAuthMigrations(connection: AuthDatabaseConnection) {
  await initializeAuthMigrations(connection.pool);
  await migrate(connection.db, {
    migrationsFolder,
    migrationsSchema,
    migrationsTable,
  });
}
