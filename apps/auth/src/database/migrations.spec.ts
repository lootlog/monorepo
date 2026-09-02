import { describe, expect, it } from "bun:test";
import type pg from "pg";
import {
  AUTH_SCHEMA_FINGERPRINT,
  initializeAuthMigrations,
} from "./migrations.js";

type RecordedQuery = { readonly sql: string; readonly values?: unknown[] };

const makePool = ({
  fingerprint = AUTH_SCHEMA_FINGERPRINT,
}: {
  readonly fingerprint?: ReadonlyArray<unknown>;
} = {}) => {
  const queries: Array<RecordedQuery> = [];
  const pool = {
    query(sql: string, values?: unknown[]) {
      queries.push({ sql, values });

      if (sql.includes("FROM drizzle.__drizzle_migrations")) {
        return Promise.resolve({ rows: [{ count: "0" }] });
      }

      if (sql.includes("FROM information_schema.tables")) {
        return Promise.resolve({ rows: [{ count: "5" }] });
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
    const baselineInsert = queries.find(({ sql }) =>
      sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
    );

    expect(fingerprintQuery?.values).toEqual([
      ["user", "session", "account", "verification", "jwks"],
    ]);
    expect(baselineInsert?.sql).toContain("(hash, created_at)");
    expect(baselineInsert?.sql).not.toContain("name");
    expect(baselineInsert?.values).toHaveLength(2);
  });

  it("fails closed instead of adopting an unknown legacy schema", async () => {
    const { pool, queries } = makePool({ fingerprint: [] });

    await expect(initializeAuthMigrations(pool)).rejects.toThrow(
      "does not match the adopted Drizzle baseline",
    );
    expect(
      queries.some(({ sql }) =>
        sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
      ),
    ).toBe(false);
  });
});
