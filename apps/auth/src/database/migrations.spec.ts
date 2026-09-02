import { describe, expect, it } from "bun:test";
import type pg from "pg";
import {
  AUTH_SCHEMA_FINGERPRINT,
  AUTH_SCHEMA_FINGERPRINT_V1_6,
  initializeAuthMigrations,
} from "./migrations.js";

type RecordedQuery = { readonly sql: string; readonly values?: unknown[] };

const makePool = ({
  fingerprint = AUTH_SCHEMA_FINGERPRINT,
  existingAuthTableCount = 5,
}: {
  readonly fingerprint?: ReadonlyArray<unknown>;
  readonly existingAuthTableCount?: number;
} = {}) => {
  const queries: Array<RecordedQuery> = [];
  const pool = {
    query(sql: string, values?: unknown[]) {
      queries.push({ sql, values });

      if (sql.includes("FROM drizzle.__drizzle_migrations")) {
        return Promise.resolve({ rows: [{ count: "0" }] });
      }

      if (sql.includes("FROM information_schema.tables")) {
        return Promise.resolve({
          rows: [{ count: String(existingAuthTableCount) }],
        });
      }

      if (sql.includes("FROM information_schema.columns")) {
        return Promise.resolve({ rows: fingerprint });
      }

      return Promise.resolve({ rows: [] });
    },
  } as unknown as pg.Pool;

  return { pool, queries };
};

describe("initializeAuthMigrations", () => {
  it("adopts the baseline only after the physical schema fingerprint matches", async () => {
    const { pool, queries } = makePool();

    await initializeAuthMigrations(pool);

    const fingerprintQuery = queries.find(({ sql }) =>
      sql.includes("FROM information_schema.columns"),
    );
    const migrationInserts = queries.filter(({ sql }) =>
      sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
    );

    expect(fingerprintQuery?.values).toEqual([
      ["user", "session", "account", "verification", "jwks"],
    ]);
    expect(migrationInserts).toHaveLength(2);
    expect(migrationInserts[0]?.sql).toContain("(hash, created_at)");
    expect(migrationInserts[0]?.sql).not.toContain("name");
    expect(migrationInserts[0]?.values).toHaveLength(2);
  });

  it("adopts only the baseline before upgrading an untracked 1.6 database", async () => {
    const { pool, queries } = makePool({
      fingerprint: AUTH_SCHEMA_FINGERPRINT_V1_6,
    });

    await initializeAuthMigrations(pool);

    expect(
      queries.filter(({ sql }) =>
        sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
      ),
    ).toHaveLength(1);
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

  it("fails closed instead of adopting an unknown legacy schema", async () => {
    const { pool, queries } = makePool({ fingerprint: [] });

    await expect(initializeAuthMigrations(pool)).rejects.toThrow(
      "does not match the adopted Better Auth 1.6 or 1.7 Drizzle schema",
    );
    expect(
      queries.some(({ sql }) =>
        sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
      ),
    ).toBe(false);
  });
});
