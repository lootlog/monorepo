import { Effect, Schedule } from "effect";

export const forkCronTask = (task: Effect.Effect<void>, expression: string) => {
  let initialTick = true;

  return Effect.suspend(() => {
    if (initialTick) {
      initialTick = false;

      return Effect.void;
    }

    return task;
  }).pipe(Effect.repeat(Schedule.cron(expression)), Effect.forkScoped);
};
