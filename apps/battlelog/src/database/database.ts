import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { makePostgresLayer } from "@lootlog/database";
import { Config, Effect, Layer } from "effect";
import { relations } from "./relations.js";

/** The Effect-native Drizzle service. Queries retain interruption and tracing. */
export const drizzleDatabaseEffect = makeWithDefaults({ relations });

export type DrizzleDatabase = Effect.Success<typeof drizzleDatabaseEffect>;

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const url = yield* Config.Redacted("POSTGRESQL_CONNECTION_URI");

    const applicationName = yield* Config.String("SERVICE_NAME").pipe(
      Config.withDefault("battlelog-service"),
    );

    return makePostgresLayer({
      url,
      applicationName,
      maxConnections: 10,
      // Plans over the battle hypertables cost more than jit_above_cost, and
      // compiling them adds about 85 ms to analytics reads that run in tens of
      // milliseconds without JIT.
      startupParameters: { jit: "off" },
    });
  }),
);
