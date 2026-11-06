import { Effect, Queue } from "effect";

/** Runs a durable-outbox dispatch on startup, on each signal, and every second as a fallback. */
export const makeOutboxWorker = Effect.fnUntraced(function* (
  name: string,
  dispatch: Effect.Effect<void, unknown>,
) {
  // A signal is only a hint: the database remains the durable source of work.
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
