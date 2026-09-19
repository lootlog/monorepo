import { PgClientLive } from "./postgres.js";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, type Effect, Layer } from "effect";

export type AuthDatabaseValue = Effect.Success<
  ReturnType<typeof makeWithDefaults>
>;

export class AuthDatabase extends Context.Service<
  AuthDatabase,
  AuthDatabaseValue
>()("@lootlog/auth/AuthDatabase") {
  static readonly layer = Layer.effect(AuthDatabase, makeWithDefaults());
}

export const AuthDatabaseLive = AuthDatabase.layer.pipe(
  Layer.provideMerge(PgClientLive),
);
