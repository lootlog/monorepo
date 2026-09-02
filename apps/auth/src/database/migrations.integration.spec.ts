import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  assertAuthSchemaFingerprint,
  planAuthMigration,
  runAuthMigrations,
} from "./migrations.js";

const describeWithPostgres = process.env.LOOTLOG_AUTH_TEST_POSTGRES
  ? describe
  : describe.skip;
const baselinePath = fileURLToPath(
  new URL(
    "../../drizzle/20260422122033_loving_the_leader/migration.sql",
    import.meta.url,
  ),
);

describeWithPostgres("Better Auth 1.7 PostgreSQL migration", () => {
  let postgres: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("auth_migrations")
      .withUsername("lootlog")
      .withPassword("lootlog")
      .start();
  }, 60_000);

  afterAll(async () => {
    await postgres.stop();
  });

  it("creates a fresh 1.7 schema and can run again", async () => {
    const connection = makeConnection(postgres.getConnectionUri());
    try {
      expect(await planAuthMigration(connection.pool)).toMatchObject({
        source: "fresh",
        accountCount: 0,
        issuerBackfillCount: 0,
      });

      await runAuthMigrations(connection);
      await runAuthMigrations(connection);
      await assertAuthSchemaFingerprint(connection.pool);
    } finally {
      await connection.pool.end();
    }
  });

  it("backfills a populated untracked 1.6 schema", async () => {
    const databaseUri = await createDatabase(postgres, "auth_v16");
    const connection = makeConnection(databaseUri);
    try {
      await installLegacySchema(connection.pool);
      await insertDiscordAccount(connection.pool, "user-1", "account-1");

      expect(await planAuthMigration(connection.pool)).toMatchObject({
        source: "better-auth-1.6",
        accountCount: 1,
        issuerBackfillCount: 1,
      });

      await runAuthMigrations(connection);
      expect(
        await connection.pool.query(
          `SELECT "issuer" FROM "account" WHERE "id" = 'account-1'`,
        ),
      ).toMatchObject({ rows: [{ issuer: "local:oauth:discord" }] });
      await assertAuthSchemaFingerprint(connection.pool);
    } finally {
      await connection.pool.end();
    }
  });

  it("rejects ambiguous 1.6 identities before the schema is changed", async () => {
    const databaseUri = await createDatabase(postgres, "auth_collision");
    const connection = makeConnection(databaseUri);
    try {
      await installLegacySchema(connection.pool);
      await insertDiscordAccount(connection.pool, "user-a", "account-a");
      await insertDiscordAccount(connection.pool, "user-b", "account-b");
      await connection.pool.query(
        `UPDATE "account" SET "accountId" = 'duplicate-discord-id'`,
      );

      await expect(planAuthMigration(connection.pool)).rejects.toThrow(
        "issuer/accountId collision",
      );

      const issuerColumn = await connection.pool.query<{ count: string }>(`
        SELECT COUNT(*)::text AS count
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'account'
          AND column_name = 'issuer'
      `);
      expect(issuerColumn.rows[0]?.count).toBe("0");
    } finally {
      await connection.pool.end();
    }
  });
});

function makeConnection(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  return { pool, db: drizzle({ client: pool }) };
}

async function createDatabase(
  postgres: StartedPostgreSqlContainer,
  database: string,
) {
  const admin = new pg.Client({
    connectionString: postgres.getConnectionUri(),
  });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${database}`);
  } finally {
    await admin.end();
  }
  return new URL(`/${database}`, postgres.getConnectionUri()).toString();
}

async function installLegacySchema(pool: pg.Pool) {
  await pool.query(await fs.readFile(baselinePath, "utf8"));
}

async function insertDiscordAccount(
  pool: pg.Pool,
  userId: string,
  accountRowId: string,
) {
  await pool.query(
    `
      INSERT INTO "user" (
        "id", "name", "email", "emailVerified", "updatedAt", "discordId"
      ) VALUES ($1, $1, $2, true, now(), $3)
    `,
    [userId, `${userId}@example.invalid`, `${userId}-discord`],
  );
  await pool.query(
    `
      INSERT INTO "account" (
        "id", "accountId", "providerId", "userId", "updatedAt"
      ) VALUES ($1, $2, 'discord', $3, now())
    `,
    [accountRowId, `${userId}-discord`, userId],
  );
}
