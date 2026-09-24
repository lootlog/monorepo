import { Effect, Queue } from "effect";

export const makeLootPublicationWorker = Effect.fnUntraced(function* (
  dispatch: Effect.Effect<void, unknown>,
) {
  // A signal is only a hint: the database remains the durable source of work.
  const signals = yield* Queue.dropping<void>(1);

  const run = Effect.gen(function* () {
    while (true) {
      yield* dispatch.pipe(
        Effect.catch((error) =>
          Effect.logError("Loot publication dispatch failed", error),
        ),
      );
      yield* Effect.raceFirst(Queue.take(signals), Effect.sleep("1 second"));
    }
  });

  return {
    signal: Queue.offer(signals, undefined).pipe(Effect.asVoid),
    run,
  };
});
