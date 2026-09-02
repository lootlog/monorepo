import { sql, type SQL } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";

const bindQuery = (
  statement: string,
  parameters: ReadonlyArray<unknown>,
): SQL => {
  const chunks = statement.split(/(\$\d+)/u).map((chunk) => {
    const placeholder = /^\$(\d+)$/u.exec(chunk);
    if (!placeholder) return sql.raw(chunk);
    return sql`${parameters[Number(placeholder[1]) - 1]}`;
  });
  return sql.join(chunks);
};

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class LootStatsQueryError extends Schema.TaggedError<LootStatsQueryError>()(
  "LootStatsQueryError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeLootStatsQuery =
  (database: typeof ApiDatabase.Service) =>
  <Rows extends ReadonlyArray<Record<string, unknown>>>(
    operation: string,
    statement: string,
    parameters: ReadonlyArray<unknown>,
  ) =>
    database.execute<Rows[number]>(bindQuery(statement, parameters)).pipe(
      Effect.map((rows) => rows as unknown as Rows),
      Effect.mapError((cause) => new LootStatsQueryError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "loot-stats.drizzle", retryCount: 0 },
      }),
    );

export type LootStatsQuery = ReturnType<typeof makeLootStatsQuery>;
