import { Effect } from "effect";

export const adapter = <A, E>(
  operation: string,
  run: () => Effect.Effect<A, E> | PromiseLike<A>,
) =>
  Effect.suspend(() => {
    const result = run();

    return Effect.isEffect(result)
      ? result
      : Effect.tryPromise({
          try: () => Promise.resolve(result),
          catch: (cause) => cause,
        });
  }).pipe(
    Effect.withSpan(operation, {
      attributes: { adapter: "battlelog-infrastructure", retryCount: 0 },
    }),
  );
