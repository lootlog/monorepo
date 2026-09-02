import { describe, expect, it } from "bun:test";
import type pg from "pg";
import {
  AUTH_SCHEMA_FINGERPRINT,
  AUTH_SCHEMA_FINGERPRINT_IMPORTED_V1_6,
  AUTH_SCHEMA_FINGERPRINT_V1_6,
  AUTH_SCHEMA_FOREIGN_KEYS,
  AUTH_SCHEMA_INDEXES,
  AUTH_SCHEMA_INDEXES_IMPORTED_V1_6,
  AUTH_SCHEMA_INDEXES_V1_6,
  initializeAuthMigrations,
  planAuthMigration,
} from "./migrations.js";

type RecordedQuery = { readonly sql: string; readonly values?: unknown[] };

const makePool = ({
  fingerprint = AUTH_SCHEMA_FINGERPRINT,
  indexes = AUTH_SCHEMA_INDEXES,
  foreignKeys = AUTH_SCHEMA_FOREIGN_KEYS,
  existingAuthTableCount = 5,
  trackedHashes,
  counts = {},
}: {
  readonly fingerprint?: ReadonlyArray<unknown>;
  readonly indexes?: ReadonlyArray<unknown>;
  readonly foreignKeys?: ReadonlyArray<unknown>;
  readonly existingAuthTableCount?: number;
  readonly trackedHashes?: ReadonlyArray<string>;
  readonly counts?: Readonly<Record<string, number>>;
} = {}) => {
  const queries: Array<RecordedQuery> = [];
  const pool = {
    query(sql: string, values?: unknown[]) {
      queries.push({ sql, values });

      if (sql.includes("to_regclass")) {
        return Promise.resolve({
          rows: [
            { relation: trackedHashes ? "drizzle.__drizzle_migrations" : null },
          ],
        });
      }

      if (
        sql.includes("SELECT hash") &&
        sql.includes("FROM drizzle.__drizzle_migrations")
      ) {
        return Promise.resolve({
          rows: (trackedHashes ?? []).map((hash) => ({ hash })),
        });
      }

      if (sql.includes("FROM drizzle.__drizzle_migrations")) {
        return Promise.resolve({
          rows: [{ count: String(trackedHashes?.length ?? 0) }],
        });
      }

      if (sql.includes("FROM information_schema.tables")) {
        return Promise.resolve({
          rows: [{ count: String(existingAuthTableCount) }],
        });
      }

      if (sql.includes("FROM information_schema.columns")) {
        return Promise.resolve({ rows: fingerprint });
      }

      if (sql.includes("FROM pg_catalog.pg_index")) {
        return Promise.resolve({ rows: indexes });
      }

      if (sql.includes("FROM pg_catalog.pg_constraint")) {
        return Promise.resolve({ rows: foreignKeys });
      }

      const matchingCount = Object.entries(counts).find(([fragment]) =>
        sql.includes(fragment),
      )?.[1];
      return Promise.resolve({
        rows: sql.includes("COUNT(*)")
          ? [{ count: String(matchingCount ?? 0) }]
          : [],
      });
    },
  } as unknown as pg.Pool;

  return { pool, queries };
};

describe("Better Auth migration preflight", () => {
  it("recognizes an exact canonical 1.6 schema", async () => {
    const { pool } = makePool({
      fingerprint: AUTH_SCHEMA_FINGERPRINT_V1_6,
      indexes: AUTH_SCHEMA_INDEXES_V1_6,
      counts: {
        'SELECT COUNT(*)::text AS count FROM "user"': 10,
        'SELECT COUNT(*)::text AS count FROM "account"': 12,
        'SELECT COUNT(*)::text AS count FROM "session"': 20,
      },
    });

    expect(await planAuthMigration(pool)).toMatchObject({
      status: "ready",
      source: "better-auth-1.6",
      userCount: 10,
      accountCount: 12,
      sessionCount: 20,
      issuerBackfillCount: 12,
      timestampNormalizationColumns: 0,
      missingIndexes: ["account_issuer_accountId_uidx", "user_discordId_key"],
      integrityViolations: [],
    });
  });

  it("recognizes the exact imported production 1.6 schema", async () => {
    const { pool } = makePool({
      fingerprint: AUTH_SCHEMA_FINGERPRINT_IMPORTED_V1_6,
      indexes: AUTH_SCHEMA_INDEXES_IMPORTED_V1_6,
    });

    expect(await planAuthMigration(pool)).toMatchObject({
      status: "ready",
      source: "better-auth-1.6-imported",
      timestampNormalizationColumns: 14,
      missingIndexes: [
        "account_issuer_accountId_uidx",
        "account_userId_idx",
        "session_userId_idx",
        "user_discordId_key",
        "verification_identifier_idx",
      ],
      integrityViolations: [],
    });
  });

  it("reports integrity violations without exposing row data", async () => {
    const { pool } = makePool({
      fingerprint: AUTH_SCHEMA_FINGERPRINT_V1_6,
      indexes: AUTH_SCHEMA_INDEXES_V1_6,
      counts: {
        'WHERE "providerId" <>': 2,
        "AS collisions": 1,
      },
    });

    expect(await planAuthMigration(pool)).toMatchObject({
      status: "blocked",
      source: "better-auth-1.6",
      integrityViolations: [
        { code: "UNEXPECTED_ACCOUNT_IDENTITY", count: 2 },
        { code: "ACCOUNT_IDENTITY_COLLISION", count: 1 },
      ],
    });
  });

  it("blocks a partial schema before creating migration tracking", async () => {
    const { pool, queries } = makePool({ fingerprint: [] });

    await expect(initializeAuthMigrations(pool)).rejects.toThrow(
      "Auth migration preflight is blocked",
    );
    expect(queries.some(({ sql }) => sql.includes("CREATE SCHEMA"))).toBe(
      false,
    );
    expect(
      queries.some(({ sql }) =>
        sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
      ),
    ).toBe(false);
  });

  it("blocks stale migration tracking on an otherwise fresh database", async () => {
    const { pool, queries } = makePool({
      existingAuthTableCount: 0,
      trackedHashes: ["unknown-migration"],
    });

    expect(await planAuthMigration(pool)).toMatchObject({
      status: "blocked",
      source: "fresh",
      integrityViolations: [{ code: "MIGRATION_TRACKING_MISMATCH", count: 1 }],
    });
    await expect(initializeAuthMigrations(pool)).rejects.toThrow(
      "MIGRATION_TRACKING_MISMATCH=1",
    );
    expect(queries.some(({ sql }) => sql.includes("CREATE SCHEMA"))).toBe(
      false,
    );
  });
});

describe("initializeAuthMigrations", () => {
  it("adopts all migrations only after the complete 1.7 contract matches", async () => {
    const { pool, queries } = makePool();

    await initializeAuthMigrations(pool);

    const migrationInserts = queries.filter(({ sql }) =>
      sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
    );
    expect(migrationInserts).toHaveLength(2);
    expect(migrationInserts[0]?.values).toHaveLength(2);
  });

  it("adopts only the baseline for canonical and imported 1.6 databases", async () => {
    const variants = [
      {
        fingerprint: AUTH_SCHEMA_FINGERPRINT_V1_6,
        indexes: AUTH_SCHEMA_INDEXES_V1_6,
      },
      {
        fingerprint: AUTH_SCHEMA_FINGERPRINT_IMPORTED_V1_6,
        indexes: AUTH_SCHEMA_INDEXES_IMPORTED_V1_6,
      },
    ];

    await Promise.all(
      variants.map(async (variant) => {
        const { pool, queries } = makePool(variant);

        await initializeAuthMigrations(pool);

        expect(
          queries.filter(({ sql }) =>
            sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
          ),
        ).toHaveLength(1);
      }),
    );
  });

  it("leaves a fresh database for Drizzle to create from scratch", async () => {
    const { pool, queries } = makePool({ existingAuthTableCount: 0 });

    await initializeAuthMigrations(pool);

    expect(
      queries.some(({ sql }) =>
        sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
      ),
    ).toBe(false);
  });
});
