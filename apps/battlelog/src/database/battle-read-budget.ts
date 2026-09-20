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

  return <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    database
      .transaction((transaction) =>
        transaction
          .execute(
            sql`SELECT set_config('statement_timeout', ${`${options.statementTimeoutMs}ms`}, true)`,
          )
          .pipe(Effect.andThen(effect)),
      )
      .pipe(semaphore.withPermit, Effect.timeout(options.timeoutMs));
};

export type BattleReadBudget = ReturnType<typeof makeBattleReadBudget>;
