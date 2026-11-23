import { asc, eq, notInArray, sql, type InferSelectModel } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { Clock, Effect, Queue, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";

export const makeOutboxWorker = Effect.fnUntraced(function* (
  name: string,
  dispatch: Effect.Effect<void, unknown>,
) {
  const signals = yield* Queue.dropping<void>(1);

  const run = Effect.gen(function* () {
    while (true) {
      yield* dispatch.pipe(
        Effect.catch((error) =>
          Effect.logError(`${name} dispatch failed`, error),
        ),
      );
      yield* Queue.take(signals).pipe(
        Effect.timeoutOrElse({
          duration: "1 second",
          orElse: () => Effect.void,
        }),
      );
    }
  });

  return {
    signal: Queue.offer(signals, undefined).pipe(Effect.asVoid),
    run,
  };
});

type OutboxTransaction = Parameters<
  Parameters<(typeof ApiDatabase.Service)["transaction"]>[0]
>[0];

type OutboxTable = PgTable & {
  readonly id: PgColumn;
  readonly lastAttemptAt: PgColumn;
};

const decodeOutboxRowId = Schema.decodeUnknownEffect(
  Schema.Struct({ id: Schema.Int }),
);

export const makeOutboxDispatcher = <Table extends OutboxTable, E>(
  name: string,
  database: typeof ApiDatabase.Service,
  table: Table,
  deliver: (
    row: InferSelectModel<Table>,
    transaction: OutboxTransaction,
  ) => Effect.Effect<void, E>,
) => {
  const outbox: OutboxTable = table;

  const dispatchOne = (attempted: number[]) => {
    let selectedId: number | undefined;

    return database
      .transaction((transaction) =>
        Effect.gen(function* () {
          const [row] = yield* transaction
            .select()
            .from(table)
            .where(
              attempted.length > 0
                ? notInArray(table.id, attempted)
                : undefined,
            )
            .orderBy(sql`${table.lastAttemptAt} ASC NULLS FIRST`, asc(table.id))
            .limit(1)
            .for("update", { skipLocked: true });

          if (!row) return undefined;
          const { id } = yield* decodeOutboxRowId(row);
          selectedId = id;

          yield* deliver(row, transaction);
          yield* transaction.delete(table).where(eq(table.id, id));

          return id;
        }).pipe(Effect.timeout("10 seconds")),
      )
      .pipe(
        Effect.catch((error) => {
          const rowId = selectedId;

          if (rowId === undefined) return Effect.fail(error);

          return Effect.gen(function* () {
            yield* database
              .update(outbox)
              .set({ lastAttemptAt: new Date(yield* Clock.currentTimeMillis) })
              .where(eq(table.id, rowId));
            yield* Effect.logError(
              "Outbox row remains pending after delivery failure",
            ).pipe(Effect.annotateLogs({ outbox: name, rowId, error }));

            return rowId;
          });
        }),
      );
  };

  return Effect.fn(`${name}.dispatch`)(function* () {
    const attempted: number[] = [];

    for (let processed = 0; processed < 100; processed++) {
      const id = yield* dispatchOne(attempted);

      if (id === undefined) break;
      attempted.push(id);
    }
  });
};
