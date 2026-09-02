import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { Effect, Schema } from "effect";

interface LootStatsSqlClient {
  readonly unsafe: <Row extends Record<string, unknown>>(
    statement: string,
    parameters: ReadonlyArray<unknown>,
  ) => Effect.Effect<ReadonlyArray<Row>, unknown>;
}

export class LootStatsQueryError extends TaggedErrorClass<LootStatsQueryError>()(
  "LootStatsQueryError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeLootStatsQuery =
  (database: LootStatsSqlClient) =>
  <Rows extends ReadonlyArray<Record<string, unknown>>>(
    operation: string,
    statement: string,
    parameters: ReadonlyArray<unknown>,
  ) =>
    database.unsafe<Rows[number]>(statement, [...parameters]).pipe(
      Effect.mapError((cause) => new LootStatsQueryError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "loot-stats.postgres", retryCount: 0 },
      }),
    );

export type LootStatsQuery = ReturnType<typeof makeLootStatsQuery>;
