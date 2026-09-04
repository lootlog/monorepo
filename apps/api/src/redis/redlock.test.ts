import { expect, mock, test } from "bun:test";
import { Effect } from "effect";
import { RedlockService } from "./redlock.js";

test("losing lock ownership interrupts protected work and releases once", async () => {
  const evalRedis = mock().mockResolvedValueOnce(1).mockResolvedValue(0);
  const lock = new RedlockService({ eval: evalRedis }).createInstance({
    automaticExtensionThreshold: 19,
  });
  let interrupted = false;
  const failure = await Effect.runPromise(
    lock
      .using(
        ["presence:test"],
        20,
        Effect.never.pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              interrupted = true;
            }),
          ),
        ),
      )
      .pipe(Effect.flip),
  );
  expect(failure.message).toBe("Redis lock ownership was lost");
  expect(interrupted).toBe(true);
  expect(evalRedis).toHaveBeenCalledTimes(3);
});
