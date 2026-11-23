import { Duration, Effect, Random, Schedule } from "effect";

export const jitteredRetryDelay = Schedule.exponential("100 millis").pipe(
  Schedule.modifyDelay(({ duration }) =>
    Random.next.pipe(
      Effect.map((random) =>
        Duration.millis(Math.min(2_000, Duration.toMillis(duration)) * random),
      ),
    ),
  ),
);
