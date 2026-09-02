/**
 * Marks the baseline migration as applied without executing the SQL.
 * Use this on databases that already have the tables (e.g. created by Prisma).
 *
 * Usage: npx tsx scripts/migrate-init.ts
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Config, Effect, Redacted } from "effect";
import pg from "pg";

const databaseUrl = Redacted.value(
  await Effect.runPromise(Config.redacted("POSTGRESQL_CONNECTION_URI")),
);

const migrationsFolder = path.resolve(import.meta.dirname, "../drizzle");
const migrationsSchema = "drizzle";
const migrationsTable = "__drizzle_migrations";

function formatToMillis(dateStr: string): number {
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  const hours = parseInt(dateStr.slice(8, 10));
  const minutes = parseInt(dateStr.slice(10, 12));
  const seconds = parseInt(dateStr.slice(12, 14));
  return new Date(year, month, day, hours, minutes, seconds).getTime();
}

async function main() {
  const pool = new pg.Pool({ connectionString: databaseUrl });

  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${migrationsSchema}`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${migrationsSchema}.${migrationsTable} (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint,
        name text,
        applied_at timestamp with time zone DEFAULT now()
      )
    `);

    const existing = await pool.query(
      `SELECT id, hash, name FROM ${migrationsSchema}.${migrationsTable}`,
    );

    if (existing.rows.length > 0) {
      console.log("Migrations already tracked in database:");
      for (const row of existing.rows) {
        console.log(`  - ${row.name} (${row.hash.slice(0, 8)}...)`);
      }
      console.log("\nNothing to do.");
      return;
    }

    const subdirs = fs
      .readdirSync(migrationsFolder)
      .filter((d) =>
        fs.existsSync(path.join(migrationsFolder, d, "migration.sql")),
      )
      .sort();

    for (const subdir of subdirs) {
      const sqlContent = fs.readFileSync(
        path.join(migrationsFolder, subdir, "migration.sql"),
        "utf-8",
      );
      const hash = crypto.createHash("sha256").update(sqlContent).digest("hex");
      const dateStr = subdir.slice(0, 14);
      const millis = formatToMillis(dateStr);

      await pool.query(
        `INSERT INTO ${migrationsSchema}.${migrationsTable} (hash, created_at, name) VALUES ($1, $2, $3)`,
        [hash, millis, subdir],
      );

      console.log(`Marked as applied: ${subdir}`);
    }

    console.log(
      "\nDone. Future 'drizzle-kit migrate' will skip these migrations.",
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
