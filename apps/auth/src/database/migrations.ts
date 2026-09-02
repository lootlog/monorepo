import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type pg from "pg";
import type { AuthDatabaseConnection } from "./drizzle.js";

const migrationsSchema = "drizzle";
const migrationsTable = "__drizzle_migrations";
const authTableNames = ["user", "session", "account", "verification", "jwks"];
const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

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

export type AuthMigrationPlan = {
  readonly source: "fresh" | "better-auth-1.6" | "better-auth-1.7";
  readonly pendingMigrations: number;
  readonly accountCount: number;
  readonly issuerBackfillCount: number;
};

export const AUTH_SCHEMA_FINGERPRINT_V1_6: ReadonlyArray<SchemaColumn> = [
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

export const AUTH_SCHEMA_FINGERPRINT: ReadonlyArray<SchemaColumn> =
  AUTH_SCHEMA_FINGERPRINT_V1_6.flatMap((column) =>
    column.tableName === "account" && column.columnName === "password"
      ? [
          {
            tableName: "account",
            columnName: "issuer",
            dataType: "text",
            isNullable: "NO" as const,
          },
          column,
        ]
      : [column],
  );

function readLocalMigrations(): LocalMigration[] {
  const migrationDirectories = fs
    .readdirSync(migrationsFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();

  if (migrationDirectories.length === 0) {
    throw new Error(`Missing auth migrations in ${migrationsFolder}`);
  }

  return migrationDirectories.map((directory) => {
    const migrationPath = path.join(
      migrationsFolder,
      directory,
      "migration.sql",
    );
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Missing auth migration at ${migrationPath}`);
    }
    const sqlContent = fs.readFileSync(migrationPath, "utf8");
    const timestamp = directory.slice(0, 14);
    const createdAt = Date.UTC(
      Number(timestamp.slice(0, 4)),
      Number(timestamp.slice(4, 6)) - 1,
      Number(timestamp.slice(6, 8)),
      Number(timestamp.slice(8, 10)),
      Number(timestamp.slice(10, 12)),
      Number(timestamp.slice(12, 14)),
    );

    return {
      createdAt,
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

async function readAuthSchemaFingerprint(pool: pg.Pool) {
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

  return result.rows;
}

function matchesFingerprint(
  actual: ReadonlyArray<SchemaColumn>,
  expected: ReadonlyArray<SchemaColumn>,
) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function assertAuthSchemaFingerprint(pool: pg.Pool) {
  const fingerprint = await readAuthSchemaFingerprint(pool);

  if (!matchesFingerprint(fingerprint, AUTH_SCHEMA_FINGERPRINT)) {
    throw new Error(
      "Auth database schema does not match the Better Auth 1.7 Drizzle schema.",
    );
  }
}

async function markMigrationsAsApplied(
  pool: pg.Pool,
  localMigrations: ReadonlyArray<LocalMigration>,
) {
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

function unknownSchemaError() {
  return new Error(
    "Auth database schema does not match the adopted Better Auth 1.6 or 1.7 Drizzle schema; refusing to mark migrations as applied.",
  );
}

async function readCount(pool: pg.Pool, sql: string) {
  const result = await pool.query<{ count: string }>(sql);
  return Number(result.rows[0]?.count ?? "0");
}

export async function planAuthMigration(
  pool: pg.Pool,
): Promise<AuthMigrationPlan> {
  const existingAuthTableCount = await getExistingAuthTableCount(pool);
  const localMigrationCount = readLocalMigrations().length;

  if (existingAuthTableCount === 0) {
    return {
      source: "fresh",
      pendingMigrations: localMigrationCount,
      accountCount: 0,
      issuerBackfillCount: 0,
    };
  }

  const fingerprint = await readAuthSchemaFingerprint(pool);

  if (matchesFingerprint(fingerprint, AUTH_SCHEMA_FINGERPRINT_V1_6)) {
    const unsupportedProviderCount = await readCount(
      pool,
      `SELECT COUNT(*)::text AS count FROM "account" WHERE "providerId" <> 'discord'`,
    );
    if (unsupportedProviderCount > 0) {
      throw new Error(
        "Better Auth 1.7 migration cannot infer issuer for a non-Discord account.",
      );
    }

    const collisionCount = await readCount(
      pool,
      `
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT "accountId"
          FROM "account"
          GROUP BY "accountId"
          HAVING COUNT(*) > 1
        ) AS collisions
      `,
    );
    if (collisionCount > 0) {
      throw new Error(
        "Better Auth 1.7 migration found an issuer/accountId collision.",
      );
    }

    const accountCount = await readCount(
      pool,
      `SELECT COUNT(*)::text AS count FROM "account"`,
    );
    return {
      source: "better-auth-1.6",
      pendingMigrations: Math.max(localMigrationCount - 1, 0),
      accountCount,
      issuerBackfillCount: accountCount,
    };
  }

  if (matchesFingerprint(fingerprint, AUTH_SCHEMA_FINGERPRINT)) {
    const invalidAccountCount = await readCount(
      pool,
      `
        SELECT COUNT(*)::text AS count
        FROM "account"
        WHERE "providerId" <> 'discord'
          OR "issuer" <> 'local:oauth:discord'
      `,
    );
    if (invalidAccountCount > 0) {
      throw new Error(
        "Better Auth 1.7 migration found an account with an unexpected issuer.",
      );
    }

    const collisionCount = await readCount(
      pool,
      `
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT "issuer", "accountId"
          FROM "account"
          GROUP BY "issuer", "accountId"
          HAVING COUNT(*) > 1
        ) AS collisions
      `,
    );
    if (collisionCount > 0) {
      throw new Error(
        "Better Auth 1.7 migration found an issuer/accountId collision.",
      );
    }

    return {
      source: "better-auth-1.7",
      pendingMigrations: 0,
      accountCount: await readCount(
        pool,
        `SELECT COUNT(*)::text AS count FROM "account"`,
      ),
      issuerBackfillCount: 0,
    };
  }

  throw unknownSchemaError();
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
  const fingerprint = await readAuthSchemaFingerprint(pool);
  const localMigrations = readLocalMigrations();

  if (matchesFingerprint(fingerprint, AUTH_SCHEMA_FINGERPRINT_V1_6)) {
    const baselineMigration = localMigrations[0];
    if (!baselineMigration) {
      throw new Error("Missing Better Auth 1.6 baseline migration.");
    }
    await markMigrationsAsApplied(pool, [baselineMigration]);
    return;
  }

  if (matchesFingerprint(fingerprint, AUTH_SCHEMA_FINGERPRINT)) {
    await markMigrationsAsApplied(pool, localMigrations);
    return;
  }

  throw unknownSchemaError();
}

export async function runAuthMigrations(connection: AuthDatabaseConnection) {
  await initializeAuthMigrations(connection.pool);
  await migrate(connection.db, {
    migrationsFolder,
    migrationsSchema,
    migrationsTable,
  });
  await assertAuthSchemaFingerprint(connection.pool);
}
