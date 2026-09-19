import { AppConfig } from "#src/config/env";
import type { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "@lootlog/database";
import { Context, Duration, Effect, Layer, Redacted } from "effect";
import pg from "pg";

/** Better Auth's Promise-based Drizzle adapter owns a separate scoped pool. */
export class PostgresPool extends Context.Service<PostgresPool, pg.Pool>()(
  "@lootlog/auth/PostgresPool",
) {}

export const makeAuthPostgresLayer = (
  options: Pick<
    PgClient.PgPoolConfig,
    | "url"
    | "host"
    | "port"
    | "username"
    | "password"
    | "database"
    | "ssl"
    | "applicationName"
    | "maxConnections"
    | "connectTimeout"
    | "idleTimeout"
    | "connectionTTL"
  >,
) => {
  const maximum = options.maxConnections ?? 10;

  if (!Number.isInteger(maximum) || maximum < 2)
    throw new Error("Auth requires at least two PostgreSQL connections");

  const adapterMaximum = Math.floor(maximum / 2);

  return Layer.merge(
    makePostgresLayer({
      ...options,
      maxConnections: maximum - adapterMaximum,
    }),
    Layer.effect(
      PostgresPool,
      Effect.gen(function* () {
        const services = yield* Effect.context<never>();

        return yield* Effect.acquireRelease(
          Effect.sync(() => {
            let password: pg.PoolConfig["password"];

            if (Effect.isEffect(options.password)) {
              const secret = options.password;
              password = () =>
                Effect.runPromiseWith(services)(
                  Effect.map(secret, Redacted.value),
                );
            } else if (options.password !== undefined) {
              password = Redacted.value(options.password);
            }

            const pool = new pg.Pool({
              connectionString: options.url
                ? Redacted.value(options.url)
                : undefined,
              host: options.host,
              port: options.port,
              user: options.username,
              database: options.database,
              password,
              // SAFETY: both drivers pass the same Node TLS options unchanged.
              ssl: options.ssl as pg.PoolConfig["ssl"],
              application_name: options.applicationName,
              max: adapterMaximum,
              connectionTimeoutMillis: Duration.toMillis(
                Duration.fromInputUnsafe(options.connectTimeout ?? "5 seconds"),
              ),
              idleTimeoutMillis:
                options.idleTimeout === undefined
                  ? undefined
                  : Duration.toMillis(
                      Duration.fromInputUnsafe(options.idleTimeout),
                    ),
              maxLifetimeSeconds:
                options.connectionTTL === undefined
                  ? undefined
                  : Duration.toSeconds(
                      Duration.fromInputUnsafe(options.connectionTTL),
                    ),
            });

            pool.on("error", () => {
              Effect.runForkWith(services)(
                Effect.logError(
                  "PostgreSQL auth adapter idle connection failed",
                ),
              );
            });

            return pool;
          }),
          (pool) =>
            Effect.promise(() => pool.end()).pipe(Effect.timeoutOption(1000)),
        );
      }),
    ),
  );
};

export const PgClientLive = Layer.unwrap(
  Effect.map(AppConfig, (config) =>
    makeAuthPostgresLayer({
      host: config.postgresql.host,
      port: config.postgresql.port,
      username: config.postgresql.user,
      password: config.postgresql.password,
      database: config.postgresql.database,
      ssl: config.postgresql.sslCa
        ? { ca: config.postgresql.sslCa }
        : undefined,
      applicationName: config.serviceName,
    }),
  ),
).pipe(Layer.provide(AppConfig.layer));
