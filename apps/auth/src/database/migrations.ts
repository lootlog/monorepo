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
const preJwksMetadataMigrationCount = 2;
const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);
const finalIndexNames = [
  "account_issuer_accountId_uidx",
  "account_userId_idx",
  "session_userId_idx",
  "user_discordId_key",
  "verification_identifier_idx",
] as const;

type LocalMigration = {
  createdAt: number;
  hash: string;
};

type SchemaColumn = {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: "NO" | "YES";
  columnDefault: string | null;
};

type SchemaIndex = {
  tableName: string;
  indexName: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
};

type SchemaForeignKey = {
  tableName: string;
  columnName: string;
  foreignTableName: string;
  foreignColumnName: string;
  deleteRule: string;
  updateRule: string;
};

export type AuthMigrationViolation = {
  readonly code:
    | "ACCOUNT_IDENTITY_COLLISION"
    | "ACTIVE_DISCORD_ACCOUNT_MISSING"
    | "DUPLICATE_ACTIVE_DISCORD_ID"
    | "MIGRATION_TRACKING_MISMATCH"
    | "ORPHAN_ACCOUNT"
    | "UNEXPECTED_ACCOUNT_IDENTITY"
    | "UNKNOWN_SCHEMA";
  readonly count: number;
};

export type AuthMigrationPlan = {
  readonly status: "blocked" | "ready" | "up-to-date";
  readonly source:
    | "fresh"
    | "better-auth-1.6"
    | "better-auth-1.6-imported"
    | "better-auth-1.7-pre-jwks-metadata"
    | "better-auth-1.7"
    | "unknown";
  readonly pendingMigrations: number;
  readonly userCount: number;
  readonly accountCount: number;
  readonly sessionCount: number;
  readonly issuerBackfillCount: number;
  readonly verificationTimestampBackfillCount: number;
  readonly timestampNormalizationColumns: number;
  readonly missingIndexes: ReadonlyArray<string>;
  readonly integrityViolations: ReadonlyArray<AuthMigrationViolation>;
};

const column = (
  tableName: string,
  columnName: string,
  dataType: string,
  isNullable: "NO" | "YES",
  columnDefault: string | null = null,
): SchemaColumn => ({
  tableName,
  columnName,
  dataType,
  isNullable,
  columnDefault,
});

export const AUTH_SCHEMA_FINGERPRINT_V1_6: ReadonlyArray<SchemaColumn> = [
  column("account", "accessToken", "text", "YES"),
  column("account", "accessTokenExpiresAt", "timestamp with time zone", "YES"),
  column("account", "accountId", "text", "NO"),
  column("account", "createdAt", "timestamp with time zone", "NO", "now()"),
  column("account", "id", "text", "NO"),
  column("account", "idToken", "text", "YES"),
  column("account", "password", "text", "YES"),
  column("account", "providerId", "text", "NO"),
  column("account", "refreshToken", "text", "YES"),
  column("account", "refreshTokenExpiresAt", "timestamp with time zone", "YES"),
  column("account", "scope", "text", "YES"),
  column("account", "updatedAt", "timestamp with time zone", "NO"),
  column("account", "userId", "text", "NO"),
  column("jwks", "createdAt", "timestamp with time zone", "NO"),
  column("jwks", "expiresAt", "timestamp with time zone", "YES"),
  column("jwks", "id", "text", "NO"),
  column("jwks", "privateKey", "text", "NO"),
  column("jwks", "publicKey", "text", "NO"),
  column("session", "createdAt", "timestamp with time zone", "NO", "now()"),
  column("session", "expiresAt", "timestamp with time zone", "NO"),
  column("session", "id", "text", "NO"),
  column("session", "impersonatedBy", "text", "YES"),
  column("session", "ipAddress", "text", "YES"),
  column("session", "token", "text", "NO"),
  column("session", "updatedAt", "timestamp with time zone", "NO"),
  column("session", "userAgent", "text", "YES"),
  column("session", "userId", "text", "NO"),
  column("user", "banExpires", "timestamp with time zone", "YES"),
  column("user", "banReason", "text", "YES"),
  column("user", "banned", "boolean", "YES"),
  column("user", "createdAt", "timestamp with time zone", "NO", "now()"),
  column("user", "discordId", "text", "NO"),
  column("user", "email", "text", "NO"),
  column("user", "emailVerified", "boolean", "NO"),
  column("user", "id", "text", "NO"),
  column("user", "image", "text", "YES"),
  column("user", "name", "text", "NO"),
  column("user", "role", "text", "YES"),
  column("user", "updatedAt", "timestamp with time zone", "NO", "now()"),
  column(
    "verification",
    "createdAt",
    "timestamp with time zone",
    "NO",
    "now()",
  ),
  column("verification", "expiresAt", "timestamp with time zone", "NO"),
  column("verification", "id", "text", "NO"),
  column("verification", "identifier", "text", "NO"),
  column(
    "verification",
    "updatedAt",
    "timestamp with time zone",
    "NO",
    "now()",
  ),
  column("verification", "value", "text", "NO"),
];

const legacyTimestampColumns = new Set([
  "account.accessTokenExpiresAt",
  "account.createdAt",
  "account.refreshTokenExpiresAt",
  "account.updatedAt",
  "jwks.createdAt",
  "session.createdAt",
  "session.expiresAt",
  "session.updatedAt",
  "user.banExpires",
  "user.createdAt",
  "user.updatedAt",
  "verification.createdAt",
  "verification.expiresAt",
  "verification.updatedAt",
]);

export const AUTH_SCHEMA_FINGERPRINT_IMPORTED_V1_6: ReadonlyArray<SchemaColumn> =
  AUTH_SCHEMA_FINGERPRINT_V1_6.map((schemaColumn) => {
    const identity = `${schemaColumn.tableName}.${schemaColumn.columnName}`;
    return {
      ...schemaColumn,
      dataType: legacyTimestampColumns.has(identity)
        ? "timestamp without time zone"
        : schemaColumn.dataType,
      isNullable:
        identity === "verification.createdAt" ||
        identity === "verification.updatedAt"
          ? "YES"
          : schemaColumn.isNullable,
      columnDefault: null,
    };
  });

export const AUTH_SCHEMA_FINGERPRINT_V1_7_PRE_JWKS_METADATA: ReadonlyArray<SchemaColumn> =
  AUTH_SCHEMA_FINGERPRINT_V1_6.flatMap((schemaColumn) =>
    schemaColumn.tableName === "account" &&
    schemaColumn.columnName === "password"
      ? [column("account", "issuer", "text", "NO"), schemaColumn]
      : [schemaColumn],
  );

export const AUTH_SCHEMA_FINGERPRINT: ReadonlyArray<SchemaColumn> =
  AUTH_SCHEMA_FINGERPRINT_V1_7_PRE_JWKS_METADATA.flatMap((schemaColumn) =>
    schemaColumn.tableName === "jwks" && schemaColumn.columnName === "createdAt"
      ? [
          column("jwks", "alg", "text", "YES"),
          schemaColumn,
          column("jwks", "crv", "text", "YES"),
        ]
      : [schemaColumn],
  );

export const AUTH_SCHEMA_INDEXES_V1_6: ReadonlyArray<SchemaIndex> = [
  {
    tableName: "account",
    indexName: "account_pkey",
    columns: ["id"],
    isUnique: true,
    isPrimary: true,
  },
  {
    tableName: "account",
    indexName: "account_userId_idx",
    columns: ["userId"],
    isUnique: false,
    isPrimary: false,
  },
  {
    tableName: "jwks",
    indexName: "jwks_pkey",
    columns: ["id"],
    isUnique: true,
    isPrimary: true,
  },
  {
    tableName: "session",
    indexName: "session_pkey",
    columns: ["id"],
    isUnique: true,
    isPrimary: true,
  },
  {
    tableName: "session",
    indexName: "session_token_key",
    columns: ["token"],
    isUnique: true,
    isPrimary: false,
  },
  {
    tableName: "session",
    indexName: "session_userId_idx",
    columns: ["userId"],
    isUnique: false,
    isPrimary: false,
  },
  {
    tableName: "user",
    indexName: "user_email_key",
    columns: ["email"],
    isUnique: true,
    isPrimary: false,
  },
  {
    tableName: "user",
    indexName: "user_pkey",
    columns: ["id"],
    isUnique: true,
    isPrimary: true,
  },
  {
    tableName: "verification",
    indexName: "verification_identifier_idx",
    columns: ["identifier"],
    isUnique: false,
    isPrimary: false,
  },
  {
    tableName: "verification",
    indexName: "verification_pkey",
    columns: ["id"],
    isUnique: true,
    isPrimary: true,
  },
];

export const AUTH_SCHEMA_INDEXES_IMPORTED_V1_6 =
  AUTH_SCHEMA_INDEXES_V1_6.filter(
    ({ indexName }) =>
      indexName !== "account_userId_idx" &&
      indexName !== "session_userId_idx" &&
      indexName !== "verification_identifier_idx",
  );

export const AUTH_SCHEMA_INDEXES: ReadonlyArray<SchemaIndex> = [
  ...AUTH_SCHEMA_INDEXES_V1_6,
  {
    tableName: "account",
    indexName: "account_issuer_accountId_uidx",
    columns: ["issuer", "accountId"],
    isUnique: true,
    isPrimary: false,
  },
  {
    tableName: "user",
    indexName: "user_discordId_key",
    columns: ["discordId"],
    isUnique: true,
    isPrimary: false,
  },
].sort(compareSchemaObjects);

export const AUTH_SCHEMA_FOREIGN_KEYS: ReadonlyArray<SchemaForeignKey> = [
  {
    tableName: "account",
    columnName: "userId",
    foreignTableName: "user",
    foreignColumnName: "id",
    deleteRule: "NO ACTION",
    updateRule: "NO ACTION",
  },
  {
    tableName: "session",
    columnName: "userId",
    foreignTableName: "user",
    foreignColumnName: "id",
    deleteRule: "NO ACTION",
    updateRule: "NO ACTION",
  },
];

function compareSchemaObjects(
  first: { tableName: string; indexName?: string; columnName?: string },
  second: { tableName: string; indexName?: string; columnName?: string },
) {
  return (
    first.tableName.localeCompare(second.tableName) ||
    (first.indexName ?? first.columnName ?? "").localeCompare(
      second.indexName ?? second.columnName ?? "",
    )
  );
}

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

async function readTrackedMigrations(pool: pg.Pool) {
  const relation = await pool.query<{ relation: string | null }>(
    `SELECT to_regclass($1)::text AS relation`,
    [`${migrationsSchema}.${migrationsTable}`],
  );

  if (!relation.rows[0]?.relation) {
    return [];
  }

  const result = await pool.query<{ hash: string }>(`
    SELECT hash
    FROM ${migrationsSchema}.${migrationsTable}
    ORDER BY created_at, id
  `);
  return result.rows.map(({ hash }) => hash);
}

function hasCompatibleMigrationTracking(
  source: AuthMigrationPlan["source"],
  trackedHashes: ReadonlyArray<string>,
  localMigrations: ReadonlyArray<LocalMigration>,
) {
  if (trackedHashes.length === 0) {
    return true;
  }

  if (source === "better-auth-1.6" || source === "better-auth-1.6-imported") {
    return (
      trackedHashes.length === 1 &&
      trackedHashes[0] === localMigrations[0]?.hash
    );
  }

  if (source === "better-auth-1.7-pre-jwks-metadata") {
    return matchesSchemaPart(
      trackedHashes,
      localMigrations
        .slice(0, preJwksMetadataMigrationCount)
        .map(({ hash }) => hash),
    );
  }

  if (source === "better-auth-1.7") {
    return matchesSchemaPart(
      trackedHashes,
      localMigrations.map(({ hash }) => hash),
    );
  }

  return false;
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

async function readAuthSchemaFingerprint(pool: pg.Pool) {
  const result = await pool.query<SchemaColumn>(
    `
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType",
        is_nullable AS "isNullable",
        column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
      ORDER BY table_name, column_name
    `,
    [authTableNames],
  );

  return result.rows;
}

async function readAuthIndexes(pool: pg.Pool) {
  const result = await pool.query<SchemaIndex>(
    `
      SELECT
        table_relation.relname AS "tableName",
        index_relation.relname AS "indexName",
        array_agg(attribute.attname ORDER BY indexed_column.ordinality)::text[] AS "columns",
        index_metadata.indisunique AS "isUnique",
        index_metadata.indisprimary AS "isPrimary"
      FROM pg_catalog.pg_index AS index_metadata
      JOIN pg_catalog.pg_class AS table_relation
        ON table_relation.oid = index_metadata.indrelid
      JOIN pg_catalog.pg_namespace AS table_namespace
        ON table_namespace.oid = table_relation.relnamespace
      JOIN pg_catalog.pg_class AS index_relation
        ON index_relation.oid = index_metadata.indexrelid
      JOIN LATERAL unnest(index_metadata.indkey)
        WITH ORDINALITY AS indexed_column(attribute_number, ordinality)
        ON true
      JOIN pg_catalog.pg_attribute AS attribute
        ON attribute.attrelid = table_relation.oid
        AND attribute.attnum = indexed_column.attribute_number
      WHERE table_namespace.nspname = 'public'
        AND table_relation.relname = ANY($1::text[])
      GROUP BY
        table_relation.relname,
        index_relation.relname,
        index_metadata.indisunique,
        index_metadata.indisprimary
      ORDER BY table_relation.relname, index_relation.relname
    `,
    [authTableNames],
  );

  return result.rows;
}

async function readAuthForeignKeys(pool: pg.Pool) {
  const result = await pool.query<SchemaForeignKey>(
    `
      SELECT
        constraint_table.relname AS "tableName",
        constraint_column.attname AS "columnName",
        referenced_table.relname AS "foreignTableName",
        referenced_column.attname AS "foreignColumnName",
        CASE foreign_key.confdeltype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS "deleteRule",
        CASE foreign_key.confupdtype
          WHEN 'a' THEN 'NO ACTION'
          WHEN 'r' THEN 'RESTRICT'
          WHEN 'c' THEN 'CASCADE'
          WHEN 'n' THEN 'SET NULL'
          WHEN 'd' THEN 'SET DEFAULT'
        END AS "updateRule"
      FROM pg_catalog.pg_constraint AS foreign_key
      JOIN pg_catalog.pg_class AS constraint_table
        ON constraint_table.oid = foreign_key.conrelid
      JOIN pg_catalog.pg_namespace AS constraint_namespace
        ON constraint_namespace.oid = constraint_table.relnamespace
      JOIN pg_catalog.pg_class AS referenced_table
        ON referenced_table.oid = foreign_key.confrelid
      JOIN LATERAL unnest(foreign_key.conkey, foreign_key.confkey)
        AS key_columns(constraint_attribute_number, referenced_attribute_number)
        ON true
      JOIN pg_catalog.pg_attribute AS constraint_column
        ON constraint_column.attrelid = constraint_table.oid
        AND constraint_column.attnum = key_columns.constraint_attribute_number
      JOIN pg_catalog.pg_attribute AS referenced_column
        ON referenced_column.attrelid = referenced_table.oid
        AND referenced_column.attnum = key_columns.referenced_attribute_number
      WHERE foreign_key.contype = 'f'
        AND constraint_namespace.nspname = 'public'
        AND constraint_table.relname = ANY($1::text[])
      ORDER BY constraint_table.relname, constraint_column.attname
    `,
    [authTableNames],
  );

  return result.rows;
}

function matchesSchemaPart<T>(
  actual: ReadonlyArray<T>,
  expected: ReadonlyArray<T>,
) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function matchesSchemaVariant(
  actual: {
    columns: ReadonlyArray<SchemaColumn>;
    indexes: ReadonlyArray<SchemaIndex>;
    foreignKeys: ReadonlyArray<SchemaForeignKey>;
  },
  expected: {
    columns: ReadonlyArray<SchemaColumn>;
    indexes: ReadonlyArray<SchemaIndex>;
  },
) {
  return (
    matchesSchemaPart(actual.columns, expected.columns) &&
    matchesSchemaPart(actual.indexes, expected.indexes) &&
    matchesSchemaPart(actual.foreignKeys, AUTH_SCHEMA_FOREIGN_KEYS)
  );
}

async function readCount(pool: pg.Pool, sql: string) {
  const result = await pool.query<{ count: string }>(sql);
  return Number(result.rows[0]?.count ?? "0");
}

async function readIntegrityViolations(pool: pg.Pool, hasIssuer: boolean) {
  const checks: ReadonlyArray<{
    code: AuthMigrationViolation["code"];
    sql: string;
  }> = [
    {
      code: "UNEXPECTED_ACCOUNT_IDENTITY",
      sql: hasIssuer
        ? `
            SELECT COUNT(*)::text AS count
            FROM "account"
            WHERE "providerId" <> 'discord'
              OR "issuer" <> 'local:oauth:discord'
          `
        : `
            SELECT COUNT(*)::text AS count
            FROM "account"
            WHERE "providerId" <> 'discord'
          `,
    },
    {
      code: "ORPHAN_ACCOUNT",
      sql: `
        SELECT COUNT(*)::text AS count
        FROM "account" AS account
        LEFT JOIN "user" AS auth_user ON auth_user."id" = account."userId"
        WHERE auth_user."id" IS NULL
      `,
    },
    {
      code: "ACCOUNT_IDENTITY_COLLISION",
      sql: hasIssuer
        ? `
            SELECT COUNT(*)::text AS count
            FROM (
              SELECT "issuer", "accountId"
              FROM "account"
              GROUP BY "issuer", "accountId"
              HAVING COUNT(*) > 1
            ) AS collisions
          `
        : `
            SELECT COUNT(*)::text AS count
            FROM (
              SELECT "accountId"
              FROM "account"
              GROUP BY "accountId"
              HAVING COUNT(*) > 1
            ) AS collisions
          `,
    },
    {
      code: "DUPLICATE_ACTIVE_DISCORD_ID",
      sql: `
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT "discordId"
          FROM "user"
          GROUP BY "discordId"
          HAVING COUNT(*) > 1
        ) AS duplicates
      `,
    },
    {
      code: "ACTIVE_DISCORD_ACCOUNT_MISSING",
      sql: `
        SELECT COUNT(*)::text AS count
        FROM "user" AS auth_user
        WHERE NOT EXISTS (
          SELECT 1
          FROM "account" AS account
          WHERE account."userId" = auth_user."id"
            AND account."providerId" = 'discord'
            AND account."accountId" = auth_user."discordId"
        )
      `,
    },
  ];

  const counts = await Promise.all(
    checks.map(async (check) => ({
      code: check.code,
      count: await readCount(pool, check.sql),
    })),
  );

  return counts.filter(({ count }) => count > 0);
}

function blockedPlanError(plan: AuthMigrationPlan) {
  const violationCodes = plan.integrityViolations
    .map(({ code, count }) => `${code}=${count}`)
    .join(", ");
  return new Error(
    `Auth migration preflight is blocked for source ${plan.source}: ${violationCodes || "UNKNOWN_SCHEMA=1"}. No database changes were applied.`,
  );
}

function getPlanStatus(
  source: AuthMigrationPlan["source"],
  integrityViolations: ReadonlyArray<AuthMigrationViolation>,
): AuthMigrationPlan["status"] {
  if (integrityViolations.length > 0) {
    return "blocked";
  }

  if (source === "better-auth-1.7") {
    return "up-to-date";
  }

  return "ready";
}

export async function planAuthMigration(
  pool: pg.Pool,
): Promise<AuthMigrationPlan> {
  const existingAuthTableCount = await getExistingAuthTableCount(pool);
  const localMigrations = readLocalMigrations();
  const localMigrationCount = localMigrations.length;
  const trackedHashes = await readTrackedMigrations(pool);

  if (existingAuthTableCount === 0) {
    const migrationTrackingMatches = hasCompatibleMigrationTracking(
      "fresh",
      trackedHashes,
      localMigrations,
    );
    return {
      status: migrationTrackingMatches ? "ready" : "blocked",
      source: "fresh",
      pendingMigrations: localMigrationCount,
      userCount: 0,
      accountCount: 0,
      sessionCount: 0,
      issuerBackfillCount: 0,
      verificationTimestampBackfillCount: 0,
      timestampNormalizationColumns: 0,
      missingIndexes: [],
      integrityViolations: migrationTrackingMatches
        ? []
        : [{ code: "MIGRATION_TRACKING_MISMATCH", count: 1 }],
    };
  }

  if (existingAuthTableCount !== authTableNames.length) {
    return {
      status: "blocked",
      source: "unknown",
      pendingMigrations: 0,
      userCount: 0,
      accountCount: 0,
      sessionCount: 0,
      issuerBackfillCount: 0,
      verificationTimestampBackfillCount: 0,
      timestampNormalizationColumns: 0,
      missingIndexes: [],
      integrityViolations: [{ code: "UNKNOWN_SCHEMA", count: 1 }],
    };
  }

  const [columns, indexes, foreignKeys] = await Promise.all([
    readAuthSchemaFingerprint(pool),
    readAuthIndexes(pool),
    readAuthForeignKeys(pool),
  ]);
  const schema = { columns, indexes, foreignKeys };

  let source: AuthMigrationPlan["source"];
  let expectedIndexes: ReadonlyArray<SchemaIndex>;

  if (
    matchesSchemaVariant(schema, {
      columns: AUTH_SCHEMA_FINGERPRINT_V1_6,
      indexes: AUTH_SCHEMA_INDEXES_V1_6,
    })
  ) {
    source = "better-auth-1.6";
    expectedIndexes = AUTH_SCHEMA_INDEXES_V1_6;
  } else if (
    matchesSchemaVariant(schema, {
      columns: AUTH_SCHEMA_FINGERPRINT_IMPORTED_V1_6,
      indexes: AUTH_SCHEMA_INDEXES_IMPORTED_V1_6,
    })
  ) {
    source = "better-auth-1.6-imported";
    expectedIndexes = AUTH_SCHEMA_INDEXES_IMPORTED_V1_6;
  } else if (
    matchesSchemaVariant(schema, {
      columns: AUTH_SCHEMA_FINGERPRINT_V1_7_PRE_JWKS_METADATA,
      indexes: AUTH_SCHEMA_INDEXES,
    })
  ) {
    source = "better-auth-1.7-pre-jwks-metadata";
    expectedIndexes = AUTH_SCHEMA_INDEXES;
  } else if (
    matchesSchemaVariant(schema, {
      columns: AUTH_SCHEMA_FINGERPRINT,
      indexes: AUTH_SCHEMA_INDEXES,
    })
  ) {
    source = "better-auth-1.7";
    expectedIndexes = AUTH_SCHEMA_INDEXES;
  } else {
    return {
      status: "blocked",
      source: "unknown",
      pendingMigrations: 0,
      userCount: 0,
      accountCount: 0,
      sessionCount: 0,
      issuerBackfillCount: 0,
      verificationTimestampBackfillCount: 0,
      timestampNormalizationColumns: 0,
      missingIndexes: [],
      integrityViolations: [{ code: "UNKNOWN_SCHEMA", count: 1 }],
    };
  }

  const hasIssuer =
    source === "better-auth-1.7" ||
    source === "better-auth-1.7-pre-jwks-metadata";
  const [userCount, accountCount, sessionCount, dataViolations] =
    await Promise.all([
      readCount(pool, `SELECT COUNT(*)::text AS count FROM "user"`),
      readCount(pool, `SELECT COUNT(*)::text AS count FROM "account"`),
      readCount(pool, `SELECT COUNT(*)::text AS count FROM "session"`),
      readIntegrityViolations(pool, hasIssuer),
    ]);
  const integrityViolations = hasCompatibleMigrationTracking(
    source,
    trackedHashes,
    localMigrations,
  )
    ? dataViolations
    : [
        ...dataViolations,
        { code: "MIGRATION_TRACKING_MISMATCH", count: 1 } as const,
      ];
  const existingIndexNames = new Set(
    expectedIndexes.map(({ indexName }) => indexName),
  );
  const missingIndexes = finalIndexNames.filter(
    (indexName) => !existingIndexNames.has(indexName),
  );
  const isImported = source === "better-auth-1.6-imported";

  return {
    status: getPlanStatus(source, integrityViolations),
    source,
    pendingMigrations:
      source === "better-auth-1.7"
        ? 0
        : Math.max(
            localMigrationCount -
              (source === "better-auth-1.7-pre-jwks-metadata"
                ? preJwksMetadataMigrationCount
                : 1),
            0,
          ),
    userCount,
    accountCount,
    sessionCount,
    issuerBackfillCount: hasIssuer ? 0 : accountCount,
    verificationTimestampBackfillCount: isImported
      ? await readCount(
          pool,
          `
            SELECT COUNT(*)::text AS count
            FROM "verification"
            WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
          `,
        )
      : 0,
    timestampNormalizationColumns: isImported ? legacyTimestampColumns.size : 0,
    missingIndexes,
    integrityViolations,
  };
}

export async function assertAuthSchemaFingerprint(pool: pg.Pool) {
  const plan = await planAuthMigration(pool);

  if (plan.status !== "up-to-date" || plan.source !== "better-auth-1.7") {
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

export async function initializeAuthMigrations(
  pool: pg.Pool,
  preflightPlan?: AuthMigrationPlan,
) {
  const plan = preflightPlan ?? (await planAuthMigration(pool));

  if (plan.status === "blocked") {
    throw blockedPlanError(plan);
  }

  await ensureMigrationTracking(pool);
  const trackedMigrationCount = await getTrackedMigrationCount(pool);

  if (trackedMigrationCount > 0 || plan.source === "fresh") {
    return;
  }

  const localMigrations = readLocalMigrations();
  if (
    plan.source === "better-auth-1.6" ||
    plan.source === "better-auth-1.6-imported"
  ) {
    const baselineMigration = localMigrations[0];
    if (!baselineMigration) {
      throw new Error("Missing Better Auth 1.6 baseline migration.");
    }
    await markMigrationsAsApplied(pool, [baselineMigration]);
    return;
  }

  if (plan.source === "better-auth-1.7-pre-jwks-metadata") {
    await markMigrationsAsApplied(
      pool,
      localMigrations.slice(0, preJwksMetadataMigrationCount),
    );
    return;
  }

  if (plan.source === "better-auth-1.7") {
    await markMigrationsAsApplied(pool, localMigrations);
  }
}

export async function runAuthMigrations(connection: AuthDatabaseConnection) {
  const preflightPlan = await planAuthMigration(connection.pool);
  if (preflightPlan.status === "blocked") {
    throw blockedPlanError(preflightPlan);
  }

  await initializeAuthMigrations(connection.pool, preflightPlan);
  await migrate(connection.db, {
    migrationsFolder,
    migrationsSchema,
    migrationsTable,
  });
  await assertAuthSchemaFingerprint(connection.pool);
}
