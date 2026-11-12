import { RabbitMessaging, UnprocessableDelivery } from "@lootlog/messaging";
import {
  Deferred,
  Effect,
  Exit,
  Queue,
  Schedule,
  Schema,
  Stream,
} from "effect";

const BATCH_MESSAGE_LIMIT = 50;

const BATCH_WINDOW = "3 seconds";

/**
 * Consumes one queue in ordered batches of up to 50 deliveries or three
 * seconds, so Meilisearch indexes a few large tasks instead of many small ones. Every delivery stays unacknowledged until its batch is applied, a
 * failed batch is retried in order every five seconds, and a batch that fails
 * permanently is applied one delivery at a time so only the one that cannot
 * succeed is rejected. A delivery that does not decode is rejected too; a
 * queue with a dead-letter exchange keeps both for inspection.
 */
export const consumeInBatches = Effect.fn("consumeInBatches")(function* <
  A,
  E,
>(options: {
  readonly queue: string;
  readonly schema: Schema.Codec<ReadonlyArray<A>>;
  readonly apply: (items: ReadonlyArray<A>) => Effect.Effect<void, E>;
  readonly isPermanent: (error: E) => boolean;
}) {
  const rabbit = yield* RabbitMessaging;
  const { queue, schema, apply, isPermanent } = options;

  const rejectPermanent = (outcome: Exit.Exit<void, E>) =>
    Exit.mapError(outcome, (error) =>
      isPermanent(error) ? new UnprocessableDelivery({ cause: error }) : error,
    );

  const pending = yield* Queue.make<{
    readonly items: ReadonlyArray<A>;
    readonly completed: Deferred.Deferred<void, E | UnprocessableDelivery>;
  }>({ capacity: BATCH_MESSAGE_LIMIT });

  const applyUntilSettled = (items: ReadonlyArray<A>) =>
    Effect.suspend(() => apply(items)).pipe(
      Effect.tapError((error) =>
        isPermanent(error)
          ? Effect.void
          : Effect.logWarning("Batch failed; retrying the ordered batch").pipe(
              Effect.annotateLogs({ queue }),
            ),
      ),
      Effect.retry({
        schedule: Schedule.spaced("5 seconds"),
        while: (error) => !isPermanent(error),
      }),
    );

  yield* Stream.fromQueue(pending).pipe(
    Stream.groupedWithin(BATCH_MESSAGE_LIMIT, BATCH_WINDOW),
    Stream.runForEach((batch) =>
      Effect.gen(function* () {
        const outcome = yield* Effect.exit(
          applyUntilSettled(batch.flatMap(({ items }) => items)),
        );

        if (Exit.isSuccess(outcome) || batch.length === 1) {
          for (const { completed } of batch) {
            yield* Deferred.done(completed, rejectPermanent(outcome));
          }

          return;
        }

        // One rejected delivery must not hold back or drop its batch: apply
        // each on its own so only the one that cannot succeed is rejected.
        // Applying is an upsert, so repeating the rest is safe.
        for (const { items, completed } of batch) {
          yield* Deferred.done(
            completed,
            rejectPermanent(yield* Effect.exit(applyUntilSettled(items))),
          );
        }
      }).pipe(
        // The batch loop outlives the consume span; give each batch its own trace.
        Effect.withSpan("consumeInBatches.applyBatch", {
          root: true,
          attributes: {
            "messaging.destination.name": queue,
            "messaging.batch.message_count": batch.length,
          },
        }),
      ),
    ),
    Effect.forkScoped,
  );

  return yield* rabbit.consume(
    {
      queue,
      prefetch: BATCH_MESSAGE_LIMIT,
      failurePolicy: { strategy: "requeue" },
    },
    (delivery) => {
      let items: ReadonlyArray<A>;

      try {
        items = Schema.decodeUnknownSync(Schema.fromJsonString(schema))(
          new TextDecoder().decode(delivery.content),
        );
      } catch (error) {
        return Effect.fail(new UnprocessableDelivery({ cause: error }));
      }

      // Keep each delivery unacknowledged until the whole batch succeeds.
      return Effect.gen(function* () {
        const completed = yield* Deferred.make<
          void,
          E | UnprocessableDelivery
        >();

        yield* Queue.offer(pending, { items, completed });
        yield* Deferred.await(completed);
      });
    },
  );
});
