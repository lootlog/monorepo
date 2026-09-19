import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { PgClient } from "@effect/sql-pg";
import { makeAuthPostgresLayer, PostgresPool } from "./postgres.js";
import { AuthDatabase } from "./drizzle.js";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import pg from "pg";
import { planAuthMigration, runAuthMigrations } from "./migrations.js";

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

  it("serializes concurrent pod migrations without duplicate tracking or partial DDL", async () => {
    const databaseUri = await createDatabase(postgres, "concurrent_migrations");

    const connections = await Promise.all(
      Array.from({ length: 3 }, () => makeConnection(databaseUri)),
    );

    try {
      await Promise.all(
        connections.map(({ db, client }) =>
          Effect.runPromise(runAuthMigrations(db, client)),
        ),
      );
      const connection = connections[0];

      if (!connection) throw new Error("Missing test connection");
      expect(
        await Effect.runPromise(planAuthMigration(connection.client)),
      ).toMatchObject({ status: "up-to-date", pendingMigrations: 0 });

      const result = await connection.pool.query(
        "SELECT count(*)::int AS count, count(DISTINCT hash)::int AS unique_count FROM drizzle.__drizzle_migrations",
      );

      expect(result.rows).toEqual([{ count: 5, unique_count: 5 }]);

      const table = await connection.pool.query(
        "SELECT to_regclass('public.apikey') AS name",
      );

      expect(table.rows).toEqual([{ name: "apikey" }]);
    } finally {
      await Promise.all(connections.map(({ close }) => close()));
    }
  });

  it("upgrades the deployed required-issuer schema before new account writes", async () => {
    const connection = await makeConnection(
      await createDatabase(postgres, "required_issuer_upgrade"),
    );

    try {
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      await insertUser(connection.pool, "existing-user", "existing-discord");
      await insertAccount(
        connection.pool,
        "existing-account",
        "existing-user",
        "existing-discord",
      );
      await connection.pool.query(`
        UPDATE "account" SET "issuer" = 'local:oauth:discord';
        DROP INDEX "account_providerId_accountId_uidx";
        ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
        CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON "account" ("issuer", "accountId");
        DELETE FROM drizzle.__drizzle_migrations WHERE id = (SELECT max(id) FROM drizzle.__drizzle_migrations);
      `);
      expect(
        await Effect.runPromise(planAuthMigration(connection.client)),
      ).toMatchObject({ status: "ready", pendingMigrations: 1 });
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      expect(
        await Effect.runPromise(planAuthMigration(connection.client)),
      ).toMatchObject({ status: "up-to-date", pendingMigrations: 0 });
      await insertUser(connection.pool, "new-user", "new-discord");
      await insertAccount(
        connection.pool,
        "new-account",
        "new-user",
        "new-discord",
      );
      expect(
        (
          await connection.pool.query(
            'SELECT "id", "issuer" FROM "account" ORDER BY "id"',
          )
        ).rows,
      ).toEqual([
        { id: "existing-account", issuer: "local:oauth:discord" },
        { id: "new-account", issuer: null },
      ]);
    } finally {
      await connection.close();
    }
  });

  it("creates a fresh 1.7 schema and can run again", async () => {
    const connection = await makeConnection(postgres.getConnectionUri());

    try {
      expect(
        await Effect.runPromise(planAuthMigration(connection.client)),
      ).toMatchObject({
        status: "ready",
        source: "fresh",
      });

      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      expect(
        await Effect.runPromise(planAuthMigration(connection.client)),
      ).toMatchObject({
        status: "up-to-date",
        source: "drizzle",
        pendingMigrations: 0,
      });
    } finally {
      await connection.close();
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
        const connection = await makeConnection(databaseUri);

        try {
          await Effect.runPromise(
            runAuthMigrations(connection.db, connection.client),
          );
          await connection.pool.query(`
            DROP INDEX "account_providerId_accountId_uidx";
            DROP INDEX "user_discordId_key";
          `);
          await insertUser(connection.pool, "user-1", "discord-1");
          await insertAccount(
            connection.pool,
            "account-1",
            "user-1",
            "discord-1",
          );
          await corrupt(connection.pool);

          const plan = await Effect.runPromise(
            planAuthMigration(connection.client),
          );

          expect(plan.status).toBe("blocked");
          expect(plan.integrityViolations).toContainEqual({ code, count: 1 });
          await expect(
            Effect.runPromise(
              runAuthMigrations(connection.db, connection.client),
            ),
          ).rejects.toThrow("No database changes were applied");
          expect(
            (
              await connection.pool.query(
                "SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations",
              )
            ).rows,
          ).toEqual([{ count: 5 }]);
        } finally {
          await connection.close();
        }
      }),
    );
  });

  it("upgrades a legacy Drizzle journal with subsecond timestamps without readopting it", async () => {
    const connection = await makeConnection(
      await createDatabase(postgres, "legacy_journal"),
    );

    try {
      const baseline = await Bun.file(
        new URL(
          "../../drizzle/20260422122033_loving_the_leader/migration.sql",
          import.meta.url,
        ),
      ).text();

      const hash = new Bun.CryptoHasher("sha256")
        .update(baseline)
        .digest("hex");

      await connection.pool.query(baseline);
      await connection.pool.query(`
        CREATE SCHEMA drizzle;
        CREATE TABLE drizzle.__drizzle_migrations (
          id SERIAL PRIMARY KEY,
          hash text NOT NULL,
          created_at bigint
        );
      `);
      await connection.pool.query(
        "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
        [hash, 1776860433396],
      );
      await insertUser(connection.pool, "legacy-user", "legacy-discord");
      await insertAccount(
        connection.pool,
        "legacy-account",
        "legacy-user",
        "legacy-discord",
      );
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      expect(
        (
          await connection.pool.query(
            "SELECT created_at::text FROM drizzle.__drizzle_migrations WHERE hash = $1",
            [hash],
          )
        ).rows,
      ).toEqual([{ created_at: "1776860433396" }]);
      expect(
        (
          await connection.pool.query(
            'SELECT "id", "accountId", "issuer" FROM "account"',
          )
        ).rows,
      ).toEqual([
        {
          id: "legacy-account",
          accountId: "legacy-discord",
          issuer: "local:oauth:discord",
        },
      ]);
      expect(
        await Effect.runPromise(planAuthMigration(connection.client)),
      ).toMatchObject({ status: "up-to-date", pendingMigrations: 0 });
    } finally {
      await connection.close();
    }
  });

  it("refuses an existing database without its migration journal", async () => {
    const connection = await makeConnection(
      await createDatabase(postgres, "untracked"),
    );

    try {
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      await connection.pool.query("DROP SCHEMA drizzle CASCADE");
      await expect(
        Effect.runPromise(runAuthMigrations(connection.db, connection.client)),
      ).rejects.toThrow("MIGRATION_TRACKING_MISMATCH");
      expect(
        (
          await connection.pool.query(
            "SELECT to_regclass('drizzle.__drizzle_migrations') AS journal",
          )
        ).rows,
      ).toEqual([{ journal: null }]);
    } finally {
      await connection.close();
    }
  });

  it("rejects a changed migration journal before applying pending SQL", async () => {
    const connection = await makeConnection(
      await createDatabase(postgres, "changed_journal"),
    );

    try {
      await Effect.runPromise(
        runAuthMigrations(connection.db, connection.client),
      );
      await connection.pool.query(
        "UPDATE drizzle.__drizzle_migrations SET hash = 'unknown' WHERE id = 1",
      );
      await expect(
        Effect.runPromise(runAuthMigrations(connection.db, connection.client)),
      ).rejects.toThrow("MIGRATION_TRACKING_MISMATCH");
      expect(
        (
          await connection.pool.query(
            "SELECT hash FROM drizzle.__drizzle_migrations WHERE id = 1",
          )
        ).rows,
      ).toEqual([{ hash: "unknown" }]);
    } finally {
      await connection.close();
    }
  });
});

async function makeConnection(connectionString: string) {
  const runtime = ManagedRuntime.make(
    AuthDatabase.layer.pipe(
      Layer.provideMerge(
        makeAuthPostgresLayer({
          url: Redacted.make(connectionString),
          applicationName: "auth-migrations-test",
        }),
      ),
    ),
  );

  const pool = await runtime.runPromise(PostgresPool);
  const client = await runtime.runPromise(PgClient.PgClient);
  const db = await runtime.runPromise(AuthDatabase);

  return { pool, client, db, close: () => runtime.dispose() };
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
