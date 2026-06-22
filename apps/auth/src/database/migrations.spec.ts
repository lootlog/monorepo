import type pg from "pg";
import { initializeAuthMigrations } from "./migrations";

describe("initializeAuthMigrations", () => {
  it("marks baseline migrations using the standard Drizzle migration columns", async () => {
    const queries: Array<{ sql: string; values?: unknown[] }> = [];
    const pool = {
      query(sql: string, values?: unknown[]) {
        queries.push({ sql, values });

        if (sql.includes("FROM drizzle.__drizzle_migrations")) {
          return Promise.resolve({ rows: [{ count: "0" }] });
        }

        if (sql.includes("FROM information_schema.tables")) {
          return Promise.resolve({ rows: [{ count: "5" }] });
        }

        return Promise.resolve({ rows: [] });
      },
    } as unknown as pg.Pool;

    await initializeAuthMigrations(pool);

    const baselineInsert = queries.find(({ sql }) =>
      sql.includes("INSERT INTO drizzle.__drizzle_migrations"),
    );

    expect(baselineInsert?.sql).toContain("(hash, created_at)");
    expect(baselineInsert?.sql).not.toContain("name");
    expect(baselineInsert?.values).toHaveLength(2);
  });
});
