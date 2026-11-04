import { runLogEffect } from "@lootlog/instrumentation";
import { Context, Effect, FiberSet, Layer } from "effect";

export const yieldToEventLoop = Effect.callback<void>((resume) => {
  const timer = setImmediate(() => resume(Effect.void));

  return Effect.sync(() => clearImmediate(timer));
});

export type BackgroundTaskRunner = (
  label: string,
  task: Effect.Effect<void, unknown>,
) => void;

export const makeBackgroundTaskRunner =
  (run: (effect: Effect.Effect<void>) => void): BackgroundTaskRunner =>
  (label, task) =>
    run(
      task.pipe(
        Effect.catch((error) =>
          Effect.logError("Gateway background task failed", error).pipe(
            Effect.annotateLogs({ task: label }),
          ),
        ),
      ),
    );

export const unmanagedBackgroundTaskRunner: BackgroundTaskRunner = (
  label,
  task,
) => {
  runLogEffect(
    task.pipe(
      Effect.catch((error) =>
        Effect.logError("Gateway background task failed", error).pipe(
          Effect.annotateLogs({ task: label }),
        ),
      ),
    ),
  );
};

/** Runs work outside a request, supervised by the application's scope. */
export class Background extends Context.Service<
  Background,
  {
    readonly run: BackgroundTaskRunner;
    readonly runPromise: <A, E>(effect: Effect.Effect<A, E>) => Promise<A>;
  }
>()("@lootlog/gateway/platform/Background") {
  static readonly layer = Layer.effect(
    Background,
    Effect.gen(function* () {
      const fibers = yield* FiberSet.make<unknown, unknown>();
      const runEffect = yield* FiberSet.runtime(fibers)<never>();
      const runPromise = yield* FiberSet.runtimePromise(fibers)<never>();

      return Background.of({
        run: makeBackgroundTaskRunner(runEffect),
        runPromise,
      });
    }),
  );
}
