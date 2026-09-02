import { PgClient } from "@effect/sql-pg";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Effect, Layer, Redacted } from "effect";
import { ActivityConfig } from "#src/config/activity-config";

export type ActivityDatabaseValue = Effect.Success<
  ReturnType<typeof makeWithDefaults>
>;
export class ActivityDatabase extends Context.Service<
  ActivityDatabase,
  ActivityDatabaseValue
>()("@lootlog/activity/ActivityDatabase") {
  static readonly layer = Layer.effect(ActivityDatabase, makeWithDefaults());
}

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* ActivityConfig;
    return PgClient.layer({
      url: Redacted.make(config.databaseUrl),
      applicationName: config.serviceName,
    });
  }),
).pipe(Layer.provide(ActivityConfig.layer));
