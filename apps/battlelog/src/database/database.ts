import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { makePostgresLayer } from "@lootlog/database";
import { Effect, Layer } from "effect";
import { battlelogDatabaseConfig } from "#src/config/env";
import { relations } from "./relations.js";

export const drizzleDatabaseEffect = makeWithDefaults({ relations });

export type DrizzleDatabase = Effect.Success<typeof drizzleDatabaseEffect>;

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* battlelogDatabaseConfig;

    return makePostgresLayer({ ...config, maxConnections: 10 });
  }),
);
