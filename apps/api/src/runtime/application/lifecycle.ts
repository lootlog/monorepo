import { Effect, Layer } from "effect";

interface ApiLifecycleHooks {
  readonly onStart?: Effect.Effect<void>;
  readonly onStop?: Effect.Effect<void>;
}

const makeApiLifecycleLayer = (
  hooks: ApiLifecycleHooks = {},
): Layer.Layer<never> =>
  Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.logInfo("API runtime started").pipe(
        Effect.annotateLogs("service", "api"),
        Effect.andThen(hooks.onStart ?? Effect.void),
      ),
      () =>
        Effect.logInfo("API runtime stopping").pipe(
          Effect.annotateLogs("service", "api"),
          Effect.andThen(hooks.onStop ?? Effect.void),
        ),
    ),
  );

export const ApiLifecycleLive = makeApiLifecycleLayer();
