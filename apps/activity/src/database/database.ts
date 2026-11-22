import { makePostgresLayer } from "@lootlog/database";
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer } from "effect";
import type { SqlError } from "effect/sql/SqlError";
import { ActivityConfig } from "#src/config/activity-config";

export type ActivityDatabaseValue = Effect.Success<
  ReturnType<typeof makeWithDefaults>
>;

export type ActivityDatabaseFailure = EffectDrizzleQueryError | SqlError;

export class ActivityDatabase extends Context.Service<
  ActivityDatabase,
  ActivityDatabaseValue
>()("@lootlog/activity/ActivityDatabase") {
  static readonly layer = Layer.effect(ActivityDatabase, makeWithDefaults());
}

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ActivityConfig;

    return makePostgresLayer({
      url: config.databaseUrl,
      applicationName: config.serviceName,
    });
  }),
).pipe(Layer.provide(ActivityConfig.layer));
