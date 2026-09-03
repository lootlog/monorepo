import { describe, expect, test } from "bun:test";
import { Effect, Ref } from "effect";
import { TestClock } from "effect/testing";
import { forkCronTask } from "#src/http-api/runtime/background/cron";

describe("scheduled jobs", () => {
  test("waits for the first cron occurrence before running", async () => {
    const executions = await Effect.gen(function* () {
      const count = yield* Ref.make(0);
      yield* TestClock.setTime(new Date("2024-01-01T00:00:00Z").getTime());
      yield* forkCronTask(
        Ref.update(count, (value) => value + 1),
        "* * * * *",
      );
      yield* Effect.yieldNow;
      const beforeFirstTick = yield* Ref.get(count);
      yield* TestClock.adjust("1 minute");
      yield* Effect.yieldNow;
      const afterFirstTick = yield* Ref.get(count);
      return { beforeFirstTick, afterFirstTick };
    }).pipe(
      Effect.scoped,
      Effect.provide(TestClock.layer()),
      Effect.runPromise,
    );

    expect(executions).toEqual({ beforeFirstTick: 0, afterFirstTick: 1 });
  });
});
