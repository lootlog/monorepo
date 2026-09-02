import { Effect, Layer } from "effect";

export interface ApiLifecycleHooks {
  readonly onStart?: Effect.Effect<void>;
  readonly onStop?: Effect.Effect<void>;
}

/**
 * A scoped lifecycle boundary for the future HTTP host. Its release action is
 * guaranteed to run when BunRuntime interrupts the launched layer on SIGTERM.
 */
export const makeApiLifecycleLayer = (
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
