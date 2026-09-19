import { PgClient } from "@effect/sql-pg";
import { Duration, Effect, Redacted } from "effect";
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
