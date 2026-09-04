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

const baselinePath = fileURLToPath(
  new URL(
    "../../drizzle/20260422122033_loving_the_leader/migration.sql",
    import.meta.url,
  ),
);
const betterAuth17Path = fileURLToPath(
  new URL(
    "../../drizzle/20260902062446_aberrant_martin_li/migration.sql",
    import.meta.url,
  ),
);

describe("Better Auth 1.7 PostgreSQL migration", () => {
  let postgres: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgres = await new PostgreSqlContainer("postgres:17-alpine")
      .withDatabase("auth_migrations")
      .withUsername("lootlog")
      .withPassword("lootlog")
      .withStartupTimeout(60_000)
      .start();
  }, 60_000);

  afterAll(async () => {
    await postgres.stop();
  });

  it("creates a fresh 1.7 schema and can run again", async () => {
    const connection = makeConnection(postgres.getConnectionUri());
    try {
      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "ready",
        source: "fresh",
        accountCount: 0,
        issuerBackfillCount: 0,
      });

      await runAuthMigrations(connection);
      await runAuthMigrations(connection);
      await assertAuthSchemaFingerprint(connection.pool);
      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "up-to-date",
        source: "better-auth-1.7",
        pendingMigrations: 0,
      });
    } finally {
      await connection.pool.end();
    }
  });

  it("adds the Better Auth 1.7 JWKS metadata columns to an existing schema", async () => {
    const databaseUri = await createDatabase(postgres, "auth_v17_jwks");
    const connection = makeConnection(databaseUri);
    try {
      await installCanonicalLegacySchema(connection.pool);
      await connection.pool.query(await fs.readFile(betterAuth17Path, "utf8"));

      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "ready",
        source: "better-auth-1.7-pre-jwks-metadata",
        pendingMigrations: 1,
      });

      await runAuthMigrations(connection);

      expect(
        await connection.pool.query(`
          SELECT column_name AS "columnName", is_nullable AS "isNullable"
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'jwks'
            AND column_name IN ('alg', 'crv')
          ORDER BY column_name
        `),
      ).toMatchObject({
        rows: [
          { columnName: "alg", isNullable: "YES" },
          { columnName: "crv", isNullable: "YES" },
        ],
      });
      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "up-to-date",
        source: "better-auth-1.7",
        pendingMigrations: 0,
      });
    } finally {
      await connection.pool.end();
    }
  });

  it("backfills a populated canonical 1.6 schema", async () => {
    const databaseUri = await createDatabase(postgres, "auth_v16");
    const connection = makeConnection(databaseUri);
    try {
      await installCanonicalLegacySchema(connection.pool);
      await insertUser(connection.pool, "user-1", "discord-1");
      await insertAccount(connection.pool, "account-1", "user-1", "discord-1");

      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "ready",
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

  it("upgrades the imported production shape without changing identities or UTC instants", async () => {
    const databaseUri = await createDatabase(postgres, "auth_imported_v16");
    const connection = makeConnection(databaseUri);
    try {
      await installImportedLegacySchema(connection.pool);
      await insertUser(connection.pool, "user-1", "discord-a", {
        createdAt: "2026-01-02 03:04:05",
      });
      await insertAccount(connection.pool, "account-a", "user-1", "discord-a");
      await insertAccount(connection.pool, "account-b", "user-1", "discord-b");
      await insertAccount(connection.pool, "account-c", "user-1", "discord-c");
      await connection.pool.query(`
        INSERT INTO "verification" (
          "id", "identifier", "value", "expiresAt", "createdAt", "updatedAt"
        ) VALUES (
          'verification-1', 'identifier-1', 'value-1',
          '2026-01-03 03:04:05', NULL, NULL
        )
      `);

      const identitiesBefore = await readStableIdentities(connection.pool);
      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "ready",
        source: "better-auth-1.6-imported",
        userCount: 1,
        accountCount: 3,
        verificationTimestampBackfillCount: 1,
        timestampNormalizationColumns: 14,
      });

      await runAuthMigrations(connection);

      expect(await readStableIdentities(connection.pool)).toEqual(
        identitiesBefore,
      );
      expect(
        await connection.pool.query<{ utcCreatedAt: string }>(`
          SELECT to_char(
            "createdAt" AT TIME ZONE 'UTC',
            'YYYY-MM-DD HH24:MI:SS'
          ) AS "utcCreatedAt"
          FROM "user"
          WHERE "id" = 'user-1'
        `),
      ).toMatchObject({ rows: [{ utcCreatedAt: "2026-01-02 03:04:05" }] });
      expect(
        await connection.pool.query<{ count: string }>(`
          SELECT COUNT(*)::text AS count
          FROM "verification"
          WHERE "createdAt" IS NULL OR "updatedAt" IS NULL
        `),
      ).toMatchObject({ rows: [{ count: "0" }] });
      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "up-to-date",
        source: "better-auth-1.7",
        missingIndexes: [],
      });
    } finally {
      await connection.pool.end();
    }
  });

  it("blocks every integrity violation before the first write", async () => {
    const cases = [
      {
        database: "auth_collision",
        code: "ACCOUNT_IDENTITY_COLLISION",
        corrupt: async (pool: pg.Pool) => {
          await insertUser(pool, "user-2", "discord-2");
          await insertAccount(pool, "account-2", "user-2", "discord-1");
        },
      },
      {
        database: "auth_provider",
        code: "UNEXPECTED_ACCOUNT_IDENTITY",
        corrupt: (pool: pg.Pool) =>
          pool.query(`UPDATE "account" SET "providerId" = 'github'`),
      },
      {
        database: "auth_orphan",
        code: "ORPHAN_ACCOUNT",
        corrupt: async (pool: pg.Pool) => {
          await pool.query(`SET session_replication_role = 'replica'`);
          await pool.query(`UPDATE "account" SET "userId" = 'missing-user'`);
          await pool.query(`SET session_replication_role = 'origin'`);
        },
      },
      {
        database: "auth_duplicate_active",
        code: "DUPLICATE_ACTIVE_DISCORD_ID",
        corrupt: async (pool: pg.Pool) => {
          await insertUser(pool, "user-2", "discord-2");
          await insertAccount(pool, "account-2", "user-2", "discord-2");
          await pool.query(
            `UPDATE "user" SET "discordId" = 'discord-1' WHERE "id" = 'user-2'`,
          );
        },
      },
      {
        database: "auth_active_missing",
        code: "ACTIVE_DISCORD_ACCOUNT_MISSING",
        corrupt: (pool: pg.Pool) =>
          pool.query(`UPDATE "user" SET "discordId" = 'discord-missing'`),
      },
    ] as const;

    await Promise.all(
      cases.map(async ({ database, code, corrupt }) => {
        const databaseUri = await createDatabase(postgres, database);
        const connection = makeConnection(databaseUri);
        try {
          await installCanonicalLegacySchema(connection.pool);
          await insertUser(connection.pool, "user-1", "discord-1");
          await insertAccount(
            connection.pool,
            "account-1",
            "user-1",
            "discord-1",
          );
          await corrupt(connection.pool);

          const plan = await planAuthMigration(connection.pool);
          expect(plan.status).toBe("blocked");
          expect(plan.integrityViolations).toContainEqual({ code, count: 1 });
          await expect(runAuthMigrations(connection)).rejects.toThrow(
            "No database changes were applied",
          );
          await expectIssuerAndTrackingToBeAbsent(connection.pool);
        } finally {
          await connection.pool.end();
        }
      }),
    );
  });

  it("blocks an unknown schema before the first write", async () => {
    const databaseUri = await createDatabase(postgres, "auth_unknown");
    const connection = makeConnection(databaseUri);
    try {
      await installCanonicalLegacySchema(connection.pool);
      await connection.pool.query(`DROP INDEX "account_userId_idx"`);

      expect(await planAuthMigration(connection.pool)).toMatchObject({
        status: "blocked",
        source: "unknown",
        integrityViolations: [{ code: "UNKNOWN_SCHEMA", count: 1 }],
      });
      await expect(runAuthMigrations(connection)).rejects.toThrow(
        "No database changes were applied",
      );
      await expectIssuerAndTrackingToBeAbsent(connection.pool);
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

async function installCanonicalLegacySchema(pool: pg.Pool) {
  await pool.query(await fs.readFile(baselinePath, "utf8"));
}

async function installImportedLegacySchema(pool: pg.Pool) {
  await installCanonicalLegacySchema(pool);
  await pool.query(`
    ALTER TABLE "account"
      ALTER COLUMN "accessTokenExpiresAt" TYPE timestamp without time zone,
      ALTER COLUMN "refreshTokenExpiresAt" TYPE timestamp without time zone,
      ALTER COLUMN "createdAt" DROP DEFAULT,
      ALTER COLUMN "createdAt" TYPE timestamp without time zone,
      ALTER COLUMN "updatedAt" TYPE timestamp without time zone;
    ALTER TABLE "jwks"
      ALTER COLUMN "createdAt" TYPE timestamp without time zone;
    ALTER TABLE "session"
      ALTER COLUMN "createdAt" DROP DEFAULT,
      ALTER COLUMN "createdAt" TYPE timestamp without time zone,
      ALTER COLUMN "expiresAt" TYPE timestamp without time zone,
      ALTER COLUMN "updatedAt" TYPE timestamp without time zone;
    ALTER TABLE "user"
      ALTER COLUMN "banExpires" TYPE timestamp without time zone,
      ALTER COLUMN "createdAt" DROP DEFAULT,
      ALTER COLUMN "createdAt" TYPE timestamp without time zone,
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" TYPE timestamp without time zone;
    ALTER TABLE "verification"
      ALTER COLUMN "createdAt" DROP DEFAULT,
      ALTER COLUMN "createdAt" DROP NOT NULL,
      ALTER COLUMN "createdAt" TYPE timestamp without time zone,
      ALTER COLUMN "expiresAt" TYPE timestamp without time zone,
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" DROP NOT NULL,
      ALTER COLUMN "updatedAt" TYPE timestamp without time zone;
    DROP INDEX "account_userId_idx";
    DROP INDEX "session_userId_idx";
    DROP INDEX "verification_identifier_idx";
  `);
}

async function insertUser(
  pool: pg.Pool,
  userId: string,
  discordId: string,
  options: { readonly createdAt?: string } = {},
) {
  await pool.query(
    `
      INSERT INTO "user" (
        "id", "name", "email", "emailVerified", "createdAt", "updatedAt",
        "discordId"
      ) VALUES ($1, $1, $2, true, $3, $3, $4)
    `,
    [
      userId,
      `${userId}@example.invalid`,
      options.createdAt ?? "2026-01-01 00:00:00",
      discordId,
    ],
  );
}

async function insertAccount(
  pool: pg.Pool,
  accountRowId: string,
  userId: string,
  discordId: string,
) {
  await pool.query(
    `
      INSERT INTO "account" (
        "id", "accountId", "providerId", "userId", "createdAt", "updatedAt"
      ) VALUES ($1, $2, 'discord', $3, '2026-01-01 00:00:00', '2026-01-01 00:00:00')
    `,
    [accountRowId, discordId, userId],
  );
}

async function readStableIdentities(pool: pg.Pool) {
  const [users, accounts, sessions] = await Promise.all([
    pool.query(`SELECT "id", "discordId" FROM "user" ORDER BY "id"`),
    pool.query(
      `SELECT "id", "accountId", "providerId", "userId" FROM "account" ORDER BY "id"`,
    ),
    pool.query(`SELECT "id", "userId" FROM "session" ORDER BY "id"`),
  ]);
  return {
    users: users.rows,
    accounts: accounts.rows,
    sessions: sessions.rows,
  };
}

async function expectIssuerAndTrackingToBeAbsent(pool: pg.Pool) {
  const result = await pool.query<{
    issuerColumns: string;
    trackingTables: string;
  }>(`
    SELECT
      (
        SELECT COUNT(*)::text
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'account'
          AND column_name = 'issuer'
      ) AS "issuerColumns",
      (
        SELECT COUNT(*)::text
        FROM information_schema.tables
        WHERE table_schema = 'drizzle'
          AND table_name = '__drizzle_migrations'
      ) AS "trackingTables"
  `);
  expect(result.rows[0]).toEqual({ issuerColumns: "0", trackingTables: "0" });
}
