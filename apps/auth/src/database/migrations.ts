import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Effect } from "effect";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import type { SqlError } from "effect/unstable/sql/SqlError";
import type { AuthDatabaseValue } from "./drizzle.js";

export interface AuthMigrationClient {
  readonly unsafe: <A extends object>(
    sql: string,
    values?: ReadonlyArray<unknown>,
  ) => Effect.Effect<ReadonlyArray<A>, SqlError>;
}

const migrationConfig = {
  migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
  migrationsSchema: "drizzle",
  migrationsTable: "__drizzle_migrations",
};

export type AuthMigrationViolation = {
  readonly code:
    | "ACCOUNT_IDENTITY_COLLISION"
    | "ACTIVE_DISCORD_ACCOUNT_MISSING"
    | "DUPLICATE_ACTIVE_DISCORD_ID"
    | "MIGRATION_TRACKING_MISMATCH"
    | "ORPHAN_ACCOUNT"
    | "UNEXPECTED_ACCOUNT_IDENTITY";
  readonly count: number;
};

export type AuthMigrationPlan = {
  readonly status: "blocked" | "ready" | "up-to-date";
  readonly source: "fresh" | "drizzle";
  readonly pendingMigrations: number;
  readonly integrityViolations: ReadonlyArray<AuthMigrationViolation>;
};

const readCount = Effect.fn("readCount")(function* (
  client: AuthMigrationClient,
  sql: string,
) {
  const result = yield* client.unsafe<{ count: string }>(sql);

  return Number(result[0]?.count ?? "0");
});

const readIntegrityViolations = Effect.fn("readIntegrityViolations")(function* (
  client: AuthMigrationClient,
  hasIssuer: boolean,
) {
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
      sql: `
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT "providerId", "accountId"
          FROM "account"
          GROUP BY "providerId", "accountId"
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

  const counts = yield* Effect.all(
    checks.map((check) =>
      readCount(client, check.sql).pipe(
        Effect.map((count) => ({ code: check.code, count })),
      ),
    ),
  );

  return counts.filter(({ count }) => count > 0);
});

export const planAuthMigration = Effect.fn("planAuthMigration")(function* (
  client: AuthMigrationClient,
): Effect.fn.Return<AuthMigrationPlan, SqlError> {
  const migrations = readMigrationFiles(migrationConfig);

  if (migrations.length === 0) throw new Error("Missing auth migrations");

  const [state] = yield* client.unsafe<{
    hasTables: boolean;
    hasJournal: boolean;
    hasIssuer: boolean;
  }>(`
    SELECT
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public'
        AND table_name IN ('user', 'session', 'account', 'verification', 'jwks', 'apikey')) AS "hasTables",
      to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS "hasJournal",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
        AND table_name = 'account' AND column_name = 'issuer') AS "hasIssuer"
  `);

  if (!state) throw new Error("Unable to inspect auth migration state");

  const tracked = state.hasJournal
    ? yield* client.unsafe<{ hash: string; createdAt: string }>(`
        SELECT hash, created_at::text AS "createdAt"
        FROM drizzle.__drizzle_migrations ORDER BY created_at, id
      `)
    : [];

  const source = state.hasTables ? "drizzle" : "fresh";

  const hasTrackedMigrations = tracked.length > 0;

  const trackingMatches =
    state.hasTables === hasTrackedMigrations &&
    tracked.every(
      (entry, index) =>
        entry.hash === migrations[index]?.hash &&
        // Legacy journals retain milliseconds; migration folder names have second precision.
        Math.floor(Number(entry.createdAt) / 1000) ===
          Math.floor((migrations[index]?.folderMillis ?? Number.NaN) / 1000),
    );

  if (!trackingMatches) {
    return {
      status: "blocked",
      source,
      pendingMigrations: 0,
      integrityViolations: [{ code: "MIGRATION_TRACKING_MISMATCH", count: 1 }],
    };
  }

  const integrityViolations = state.hasTables
    ? yield* readIntegrityViolations(client, state.hasIssuer)
    : [];

  const pendingMigrations = migrations.length - tracked.length;
  let status: AuthMigrationPlan["status"] = "up-to-date";

  if (integrityViolations.length > 0) status = "blocked";
  else if (pendingMigrations > 0) status = "ready";

  return { status, source, pendingMigrations, integrityViolations };
});

export const runAuthMigrations = Effect.fn("runAuthMigrations")(function* (
  database: AuthDatabaseValue,
  client: AuthMigrationClient & Pick<SqlClient, "withTransaction">,
) {
  return yield* client.withTransaction(
    Effect.gen(function* () {
      // Drizzle shares this transaction context; hold the lock through validation and DDL.
      yield* client.unsafe(
        "SELECT pg_advisory_xact_lock(hashtext('lootlog'), hashtext('auth-migrations'))",
      );
      const plan = yield* planAuthMigration(client);

      if (plan.status === "blocked") {
        return yield* Effect.fail(
          new Error(
            `Auth migration preflight is blocked: ${plan.integrityViolations.map(({ code, count }) => `${code}=${count}`).join(", ")}. No database changes were applied.`,
          ),
        );
      }

      yield* migrate(database, migrationConfig);
      const result = yield* planAuthMigration(client);

      if (result.status !== "up-to-date") {
        return yield* Effect.fail(
          new Error("Auth migration verification failed; changes rolled back."),
        );
      }
    }),
  );
});
