import { drizzle } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer } from "effect";
import pg from "pg";
import { AppConfig, reveal, type AuthConfig } from "#src/config/env";
import { betterAuthSchema } from "./drizzle.schema.js";

export const createAuthDatabase = (config: AuthConfig) => {
  const pool = new pg.Pool({
    host: config.postgresql.host,
    port: config.postgresql.port,
    user: config.postgresql.user,
    password: reveal(config.postgresql.password),
    database: config.postgresql.database,
    ssl: config.postgresql.sslCa ? { ca: config.postgresql.sslCa } : undefined,
  });

  return {
    pool,
    db: drizzle({ client: pool }),
  };
};

export type AuthDatabaseConnection = ReturnType<typeof createAuthDatabase>;

export class AuthDatabase extends Context.Service<
  AuthDatabase,
  AuthDatabaseConnection
>()("@lootlog/auth/AuthDatabase") {
  static readonly layer = Layer.effect(
    AuthDatabase,
    Effect.gen(function* () {
      const config = yield* AppConfig;

      return yield* Effect.acquireRelease(
        Effect.sync(() => AuthDatabase.of(createAuthDatabase(config))),
        ({ pool }) => Effect.tryPromise(() => pool.end()),
      );
    }),
  ).pipe(Layer.provide(AppConfig.layer));
}

export { betterAuthSchema };
