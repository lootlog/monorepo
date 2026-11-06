import { asc, eq, notInArray, sql } from "drizzle-orm";
import { Clock, Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { eventHeroCheckOutboxTable } from "#src/database/drizzle/event-hero-check-outbox.schema";
import type { EventHeroKillJobData } from "#src/events/kills/check-event-hero-kill-params";

export interface EventHeroCheckJob {
  readonly jobId: string;
  readonly data: EventHeroKillJobData;
}

/**
 * Enqueues committed event hero checks one row at a time. The deterministic
 * job id and the kill processor's window dedup make a repeated enqueue safe,
 * so a failure after enqueueing only costs a duplicate no-op job.
 */
export const makeEventHeroCheckDispatcher = (
  database: typeof ApiDatabase.Service,
  enqueue: (job: EventHeroCheckJob) => Effect.Effect<unknown, unknown>,
) => {
  const dispatchOne = (attempted: number[]) => {
    let selectedId: number | undefined;

    return database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const [row] = yield* transaction
            .select()
            .from(eventHeroCheckOutboxTable)
            .where(
              attempted.length > 0
                ? notInArray(eventHeroCheckOutboxTable.id, attempted)
                : undefined,
            )
            .orderBy(
              sql`${eventHeroCheckOutboxTable.lastAttemptAt} ASC NULLS FIRST`,
              asc(eventHeroCheckOutboxTable.id),
            )
            .limit(1)
            .for("update", { skipLocked: true });

          if (!row) return undefined;
          selectedId = row.id;

          yield* enqueue({ jobId: row.jobId, data: row.payload });
          yield* transaction
            .delete(eventHeroCheckOutboxTable)
            .where(eq(eventHeroCheckOutboxTable.id, row.id));

          return row.id;
        }).pipe(Effect.timeout("10 seconds")),
      )
      .pipe(
        Effect.catch((error) => {
          const checkId = selectedId;

          if (checkId === undefined) return Effect.fail(error);

          return Effect.gen(function* () {
            yield* database
              .update(eventHeroCheckOutboxTable)
              .set({ lastAttemptAt: new Date(yield* Clock.currentTimeMillis) })
              .where(eq(eventHeroCheckOutboxTable.id, checkId));
            yield* Effect.logError(
              "Event hero check remains pending after enqueue failure",
            ).pipe(Effect.annotateLogs({ checkId, error }));

            return checkId;
          });
        }),
      );
  };

  return Effect.fn("EventHeroCheckOutbox.dispatch")(function* () {
    const attempted: number[] = [];

    for (let processed = 0; processed < 100; processed++) {
      const id = yield* dispatchOne(attempted);

      if (id === undefined) break;
      attempted.push(id);
    }
  });
};
