import { createHash } from "node:crypto";
import {
  BASELINE_MIGRATION_CREATED_AT,
  BASELINE_MIGRATION_NAME,
  BASELINE_MIGRATION_SHA256,
  EXPECTED_API_CATALOG,
  EXPECTED_API_CATALOG_SHA256,
  LEGACY_MIGRATION_EVIDENCE_SHA256,
} from "./expected-catalog.js";

export interface SqlTransactionClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    statement: string,
    values?: ReadonlyArray<unknown>,
  ): Promise<{ readonly rows: ReadonlyArray<Row> }>;
}

export type AdoptionResult =
  | { readonly status: "empty" }
  | { readonly status: "adopted"; readonly fingerprint: string }
  | { readonly status: "already-adopted"; readonly fingerprint: string };

type ActualColumn = {
  readonly tableName: string;
  readonly columnName: string;
  readonly formattedType: string;
  readonly isNullable: boolean;
  readonly hasDefault: boolean;
};

type EnumRow = {
  readonly name: string;
  readonly value: string;
};

type NameRow = { readonly name: string };

export class ApiDatabaseAdoptionError extends Error {
  readonly expectedFingerprint = EXPECTED_API_CATALOG_SHA256;

  constructor(
    message: string,
    readonly actualFingerprint?: string,
  ) {
    super(message);
    this.name = "ApiDatabaseAdoptionError";
  }
}

const hashCatalog = (catalog: unknown) =>
  createHash("sha256").update(JSON.stringify(catalog)).digest("hex");

const loadActualCatalog = async (client: SqlTransactionClient) => {
  const tables = await client.query<NameRow>(`
    /* api-adoption:tables */
    SELECT table_name AS name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name <> '_prisma_migrations'
    ORDER BY table_name
  `);

  const tableNames = tables.rows.map(({ name }) => name).sort();
  const columns = await client.query<ActualColumn>(
    `
    /* api-adoption:columns */
    SELECT
      cls.relname AS "tableName",
      attr.attname AS "columnName",
      pg_catalog.format_type(attr.atttypid, attr.atttypmod) AS "formattedType",
      NOT attr.attnotnull AS "isNullable",
      defaults.adbin IS NOT NULL AS "hasDefault"
    FROM pg_catalog.pg_attribute attr
    JOIN pg_catalog.pg_class cls ON cls.oid = attr.attrelid
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = cls.relnamespace
    LEFT JOIN pg_catalog.pg_attrdef defaults
      ON defaults.adrelid = attr.attrelid AND defaults.adnum = attr.attnum
    WHERE namespace.nspname = 'public'
      AND cls.relkind IN ('r', 'p')
      AND attr.attnum > 0
      AND NOT attr.attisdropped
      AND cls.relname = ANY($1::text[])
    ORDER BY cls.relname, attr.attname
  `,
    [EXPECTED_API_CATALOG.tables],
  );

  const enumRows = await client.query<EnumRow>(`
    /* api-adoption:enums */
    SELECT enum_type.typname AS name, enum_value.enumlabel AS value
    FROM pg_catalog.pg_type enum_type
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = enum_type.typnamespace
    JOIN pg_catalog.pg_enum enum_value ON enum_value.enumtypid = enum_type.oid
    WHERE namespace.nspname = 'public'
    ORDER BY enum_type.typname, enum_value.enumsortorder
  `);
  const enumValues = new Map<string, string[]>();
  for (const row of enumRows.rows) {
    const values = enumValues.get(row.name) ?? [];
    values.push(row.value);
    enumValues.set(row.name, values);
  }

  const indexes = await client.query<NameRow>(
    `
    /* api-adoption:indexes */
    SELECT index_class.relname AS name
    FROM pg_catalog.pg_index index_definition
    JOIN pg_catalog.pg_class table_class ON table_class.oid = index_definition.indrelid
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = table_class.relnamespace
    JOIN pg_catalog.pg_class index_class ON index_class.oid = index_definition.indexrelid
    LEFT JOIN pg_catalog.pg_constraint constraint_definition
      ON constraint_definition.conindid = index_definition.indexrelid
    WHERE namespace.nspname = 'public'
      AND table_class.relname = ANY($1::text[])
      AND constraint_definition.oid IS NULL
    ORDER BY index_class.relname
  `,
    [EXPECTED_API_CATALOG.tables],
  );

  const constraints = await client.query<NameRow>(
    `
    /* api-adoption:constraints */
    SELECT constraint_definition.conname AS name
    FROM pg_catalog.pg_constraint constraint_definition
    JOIN pg_catalog.pg_class table_class ON table_class.oid = constraint_definition.conrelid
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = table_class.relnamespace
    WHERE namespace.nspname = 'public'
      AND table_class.relname = ANY($1::text[])
      AND constraint_definition.contype IN ('p', 'f', 'c')
    ORDER BY constraint_definition.conname
  `,
    [EXPECTED_API_CATALOG.tables],
  );

  return {
    tables: tableNames,
    columns: [...columns.rows].sort((left, right) =>
      `${left.tableName}.${left.columnName}`.localeCompare(
        `${right.tableName}.${right.columnName}`,
      ),
    ),
    enums: [...enumValues]
      .map(([name, values]) => ({ name, values }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    indexes: indexes.rows.map(({ name }) => name).sort(),
    constraints: constraints.rows.map(({ name }) => name).sort(),
  };
};

const assertKnownMarker = async (client: SqlTransactionClient) => {
  const marker = await client.query<{
    fingerprint: string;
    migrationEvidenceHash: string;
  }>(`
    /* api-adoption:marker */
    SELECT
      fingerprint,
      migration_evidence_hash AS "migrationEvidenceHash"
    FROM drizzle.__lootlog_adoption
    WHERE component = 'api'
  `);
  const existing = marker.rows[0];
  if (!existing) return false;
  if (
    existing.fingerprint !== EXPECTED_API_CATALOG_SHA256 ||
    existing.migrationEvidenceHash !== LEGACY_MIGRATION_EVIDENCE_SHA256
  ) {
    throw new ApiDatabaseAdoptionError(
      "API database has an unknown Drizzle adoption marker; refusing to continue.",
      existing.fingerprint,
    );
  }
  return true;
};

const assertKnownMigrationJournal = async (client: SqlTransactionClient) => {
  const journal = await client.query<{
    hash: string;
    createdAt: string;
    name: string | null;
  }>(`
    /* api-adoption:migration-journal */
    SELECT hash, created_at::text AS "createdAt", name
    FROM drizzle.__drizzle_migrations
    ORDER BY id
  `);
  if (journal.rows.length === 0) return;
  const baseline = journal.rows[0];
  if (
    journal.rows.length !== 1 ||
    baseline?.hash !== BASELINE_MIGRATION_SHA256 ||
    baseline.name !== BASELINE_MIGRATION_NAME ||
    baseline.createdAt !== String(BASELINE_MIGRATION_CREATED_AT)
  ) {
    throw new ApiDatabaseAdoptionError(
      "API database has an unknown Drizzle migration journal without an adoption marker; refusing to continue.",
    );
  }
};

const recordAdoption = async (client: SqlTransactionClient) => {
  await client.query(
    `
    INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name)
    SELECT $1, $2, $3
    WHERE NOT EXISTS (
      SELECT 1 FROM drizzle.__drizzle_migrations WHERE name = $3
    )
  `,
    [
      BASELINE_MIGRATION_SHA256,
      BASELINE_MIGRATION_CREATED_AT,
      BASELINE_MIGRATION_NAME,
    ],
  );
  await client.query(
    `
    INSERT INTO drizzle.__lootlog_adoption (
      component,
      fingerprint,
      migration_evidence_hash
    ) VALUES ('api', $1, $2)
  `,
    [EXPECTED_API_CATALOG_SHA256, LEGACY_MIGRATION_EVIDENCE_SHA256],
  );
};

/**
 * Adopts a legacy API schema using one dedicated PostgreSQL client.
 *
 * The caller must not pass a pool whose individual `query` calls can use
 * different connections: the advisory lock, fingerprint, and marker write are
 * intentionally one transaction.
 */
export const adoptExistingApiDatabase = async (
  client: SqlTransactionClient,
): Promise<AdoptionResult> => {
  await client.query("BEGIN");
  try {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('lootlog:api:drizzle-adoption'))",
    );
    await client.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint,
        name text,
        applied_at timestamp with time zone DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS drizzle.__lootlog_adoption (
        component text PRIMARY KEY,
        fingerprint text NOT NULL,
        migration_evidence_hash text NOT NULL,
        adopted_at timestamp with time zone NOT NULL DEFAULT now()
      )
    `);

    if (await assertKnownMarker(client)) {
      await client.query("COMMIT");
      return {
        status: "already-adopted",
        fingerprint: EXPECTED_API_CATALOG_SHA256,
      };
    }

    await assertKnownMigrationJournal(client);

    const actualCatalog = await loadActualCatalog(client);
    if (actualCatalog.tables.length === 0) {
      await client.query("COMMIT");
      return { status: "empty" };
    }

    const actualFingerprint = hashCatalog(actualCatalog);
    if (actualFingerprint !== EXPECTED_API_CATALOG_SHA256) {
      throw new ApiDatabaseAdoptionError(
        "API database catalog does not match the accepted legacy schema; refusing Drizzle adoption.",
        actualFingerprint,
      );
    }

    await client.query(
      `ALTER TYPE "Permission" ADD VALUE IF NOT EXISTS 'LOOTLOG_PRESENCE_LOCATION_READ'`,
    );
    await recordAdoption(client);
    await client.query("COMMIT");
    return { status: "adopted", fingerprint: EXPECTED_API_CATALOG_SHA256 };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};
