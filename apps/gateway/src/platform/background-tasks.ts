import { Effect } from "effect";

export type BackgroundTaskRunner = (
  label: string,
  task: () => Promise<void>,
) => void;

export const makeBackgroundTaskRunner =
  (run: (effect: Effect.Effect<void>) => void): BackgroundTaskRunner =>
  (label, task) =>
    run(
      Effect.tryPromise({
        try: task,
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((cause) =>
          Effect.logError("Gateway background task failed", cause).pipe(
            Effect.annotateLogs({ task: label }),
          ),
        ),
      ),
    );

export const unmanagedBackgroundTaskRunner: BackgroundTaskRunner = (
  _label,
  task,
) => {
  task().catch(() => undefined);
};
