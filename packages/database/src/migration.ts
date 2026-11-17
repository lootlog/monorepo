import { PgClient } from "@effect/sql-pg";
import { Duration, Effect, Redacted } from "effect";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

/** Migrations require PostgreSQL's simple-query protocol for complete SQL scripts. */
export const migrationClient = Effect.gen(function* () {
  const { config } = yield* PgClient.PgClient;

  const password = Effect.isEffect(config.password)
    ? yield* config.password
    : config.password;

  const client = yield* Effect.acquireRelease(
    Effect.sync(
      () =>
        new Client({
          connectionString: config.url && Redacted.value(config.url),
          host: config.path ?? config.host,
          port: config.port,
          database: config.database,
          user: config.username,
          password: password && Redacted.value(password),
          ssl: config.ssl,
          application_name: config.applicationName,
          options: config.startupOptions,
          connectionTimeoutMillis: Duration.toMillis(
            config.connectTimeout ?? "5 seconds",
          ),
        }),
    ),
    (client) => Effect.promise(() => client.end()),
  );

  yield* Effect.tryPromise(() => client.connect());

  return client;
});

/**
 * Applies a service's Drizzle migrations while holding its PostgreSQL
 * advisory lock, so concurrent deploys apply each migration once.
 */
export const runDrizzleMigrations = Effect.fn("runDrizzleMigrations")(
  function* (options: {
    readonly migrationsFolder: string;
    /** Hashed into the advisory lock id; keep it stable across releases. */
    readonly lockKey: string;
  }) {
    const client = yield* migrationClient;

    // The session lock lasts until the scoped connection closes, after the
    // migrations and their journal writes.
    yield* Effect.tryPromise(() =>
      client.query("SELECT pg_advisory_lock(hashtext($1))", [options.lockKey]),
    );
    yield* Effect.tryPromise(() =>
      migrate(drizzle({ client }), {
        migrationsFolder: options.migrationsFolder,
      }),
    );
  },
  Effect.scoped,
);
