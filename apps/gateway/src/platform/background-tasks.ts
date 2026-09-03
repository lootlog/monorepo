import { Effect } from "effect";

export type BackgroundTaskRunner = (
  label: string,
  task: Effect.Effect<void, unknown>,
) => void;

export const makeBackgroundTaskRunner =
  (run: (effect: Effect.Effect<void>) => void): BackgroundTaskRunner =>
  (label, task) =>
    run(
      task.pipe(
        Effect.catch((cause) =>
          Effect.logError("Gateway background task failed", cause).pipe(
            Effect.annotateLogs({ task: label }),
          ),
        ),
      ),
    );

export const unmanagedBackgroundTaskRunner: BackgroundTaskRunner = (
  label,
  task,
) => {
  Effect.runFork(
    task.pipe(
      Effect.catch((cause) =>
        Effect.logError("Gateway background task failed", cause).pipe(
          Effect.annotateLogs({ task: label }),
        ),
      ),
    ),
  );
};
