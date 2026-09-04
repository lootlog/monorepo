import { makePostgresLayer } from "@lootlog/database";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import { AppConfig } from "#src/config/env";

export type AuthDatabaseValue = Effect.Success<
  ReturnType<typeof makeWithDefaults>
>;

export class AuthDatabase extends Context.Service<
  AuthDatabase,
  AuthDatabaseValue
>()("@lootlog/auth/AuthDatabase") {
  static readonly layer = Layer.effect(AuthDatabase, makeWithDefaults());
}

export const PgClientLive = Layer.unwrap(
  Effect.map(AppConfig, (config) =>
    makePostgresLayer({
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

export const AuthDatabaseLive = AuthDatabase.layer.pipe(
  Layer.provideMerge(PgClientLive),
);
