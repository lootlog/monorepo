import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { makePostgresLayer } from "@lootlog/database";
import { Config, Effect, Layer } from "effect";
import { relations } from "./relations.js";

/** The Effect-native Drizzle service. Queries retain interruption and tracing. */
export const makeDrizzleDatabase = makeWithDefaults({ relations });

export type DrizzleDatabase = Effect.Success<typeof makeDrizzleDatabase>;

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* Config.redacted("POSTGRESQL_CONNECTION_URI");
    const applicationName = yield* Config.string("SERVICE_NAME").pipe(
      Config.withDefault("battlelog-service"),
    );
    return makePostgresLayer({ url, applicationName });
  }),
);
