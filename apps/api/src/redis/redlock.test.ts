import { expect, mock, test } from "bun:test";
import { Effect, Option } from "effect";
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

const contendedWait = { retryCount: 3, retryDelay: 1, retryJitter: 0 };

const contendedSingleFlight = (read: Effect.Effect<Option.Option<string>>) => {
  const lockHeldElsewhere = mock().mockResolvedValue(0);

  const flight = new RedlockService({ eval: lockHeldElsewhere })
    .createInstance()
    .singleFlight(
      {
        resource: "cache:lock",
        duration: 1_000,
        wait: contendedWait,
        unavailable: () => "unavailable",
      },
      read,
      Effect.die("a waiting caller must not fill"),
    );

  return { flight, lockHeldElsewhere };
};

test("a contended single flight returns what the lock holder stored instead of filling again", async () => {
  let reads = 0;

  const { flight } = contendedSingleFlight(
    Effect.sync(() => {
      reads += 1;

      return reads < 3 ? Option.none() : Option.some("stored by holder");
    }),
  );

  expect(await Effect.runPromise(flight)).toBe("stored by holder");
});

test("a single flight gives up once its wait budget is spent", async () => {
  const { flight, lockHeldElsewhere } = contendedSingleFlight(
    Effect.succeedNone,
  );

  expect(await Effect.runPromise(Effect.flip(flight))).toBe("unavailable");
  expect(lockHeldElsewhere).toHaveBeenCalledTimes(contendedWait.retryCount + 1);
});
