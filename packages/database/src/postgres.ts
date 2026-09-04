import { PgClient } from "@effect/sql-pg";
import { Context, Duration, Effect, Layer, Redacted } from "effect";
import { Reactivity } from "effect/unstable/reactivity";
import { SqlClient } from "effect/unstable/sql";
import { ConnectionError, SqlError } from "effect/unstable/sql/SqlError";
import pg from "pg";

/** The pool is owned by the layer; framework adapters borrow it without closing it. */
export class PostgresPool extends Context.Service<PostgresPool, pg.Pool>()(
  "@lootlog/database/PostgresPool",
) {}

export const makePostgresLayer = (options: PgClient.PgPoolConfig) =>
  Layer.effectContext(
    Effect.gen(function* () {
      const services = yield* Effect.context<never>();
      const pool = yield* Effect.acquireRelease(
        Effect.sync(() => {
          const pool = new pg.Pool({
            connectionString: options.url
              ? Redacted.value(options.url)
              : undefined,
            user: options.username,
            host: options.host,
            database: options.database,
            password: options.password
              ? Redacted.value(options.password)
              : undefined,
            // pg and Effect resolve different Node TLS type versions; pass TLS options unchanged.
            ssl: options.ssl as pg.PoolConfig["ssl"],
            port: options.port,
            ...(options.stream ? { stream: options.stream } : {}),
            connectionTimeoutMillis: Duration.toMillis(
              Duration.fromInputUnsafe(options.connectTimeout ?? "5 seconds"),
            ),
            idleTimeoutMillis:
              options.idleTimeout === undefined
                ? undefined
                : Duration.toMillis(
                    Duration.fromInputUnsafe(options.idleTimeout),
                  ),
            max: options.maxConnections,
            min: options.minConnections,
            maxLifetimeSeconds:
              options.connectionTTL === undefined
                ? undefined
                : Duration.toSeconds(
                    Duration.fromInputUnsafe(options.connectionTTL),
                  ),
            application_name: options.applicationName ?? "@effect/sql-pg",
            types: options.types,
          });
          pool.on("error", () => {
            Effect.runForkWith(services)(
              Effect.logError("PostgreSQL idle connection failed").pipe(
                Effect.annotateLogs(
                  "application",
                  options.applicationName ?? "@effect/sql-pg",
                ),
              ),
            );
          });
          return pool;
        }),
        (pool) =>
          Effect.promise(() => pool.end()).pipe(Effect.timeoutOption(1000)),
      );
      const client = yield* PgClient.fromPool({
        ...options,
        acquire: Effect.succeed(pool),
      });
      yield* client`SELECT 1`.pipe(
        Effect.timeoutOrElse({
          duration: options.connectTimeout ?? "5 seconds",
          orElse: () =>
            Effect.fail(
              new SqlError({
                reason: new ConnectionError({
                  cause: new Error("Connection timed out"),
                  message: "PostgreSQL connection timed out",
                  operation: "connect",
                }),
              }),
            ),
        }),
      );
      return Context.make(PostgresPool, pool).pipe(
        Context.add(PgClient.PgClient, client),
        Context.add(SqlClient.SqlClient, client),
      );
    }),
  ).pipe(Layer.provide(Reactivity.layer));
