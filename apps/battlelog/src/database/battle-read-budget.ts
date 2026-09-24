import { sql } from "drizzle-orm";
import { Effect, Semaphore } from "effect";
import type { DrizzleDatabase } from "./database.js";

export const makeBattleReadBudget = (
  database: Pick<DrizzleDatabase, "transaction">,
  options = {
    concurrency: 2,
    statementTimeoutMs: 2_000,
    timeoutMs: 3_000,
  },
) => {
  const semaphore = Semaphore.makeUnsafe(options.concurrency);

  return <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    { consistentSnapshot = false } = {},
  ) =>
    database
      .transaction((transaction) =>
        Effect.gen(function* () {
          if (consistentSnapshot) {
            // Effect-native Drizzle has no transaction isolation option.
            yield* transaction.execute(
              sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`,
            );
          }

          yield* transaction.execute(
            sql`SELECT set_config('statement_timeout', ${`${options.statementTimeoutMs}ms`}, true)`,
          );

          return yield* effect;
        }),
      )
      .pipe(semaphore.withPermit, Effect.timeout(options.timeoutMs));
};

export type BattleReadBudget = ReturnType<typeof makeBattleReadBudget>;
