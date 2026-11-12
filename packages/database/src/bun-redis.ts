import { BunRedis } from "@effect/platform-bun";
import { Effect, FiberHandle, Layer, Schedule } from "effect";

type BunRedisOptions = NonNullable<Parameters<typeof BunRedis.layer>[0]>;

/**
 * Bun's RedisClient stops reconnecting for good when a reconnect attempt
 * reaches `connectionTimeout`: it runs `onclose`, and every later command fails
 * with "Connection has failed" even though retries remain. A Dragonfly restart
 * left battlelog rejecting every battle this way on 2026-11-12 until its pods
 * restarted. Bun runs `onclose` only after it has given up, so reconnect from
 * there until the client is connected again.
 */
const reconnectAfterTerminalClose = Layer.effectDiscard(
  Effect.gen(function* () {
    const { client } = yield* BunRedis.BunRedis;
    const run = yield* FiberHandle.makeRuntime<never>();

    const reconnect = Effect.tryPromise(() => client.connect()).pipe(
      Effect.tapError((error) =>
        Effect.logWarning("Redis reconnect attempt failed", error),
      ),
      Effect.retry(
        Schedule.min([
          Schedule.exponential("250 millis"),
          Schedule.spaced("5 seconds"),
        ]),
      ),
      Effect.andThen(Effect.logInfo("Redis connection restored")),
    );

    client.onclose = (error) => {
      run(
        Effect.logWarning("Redis client gave up reconnecting", error).pipe(
          Effect.andThen(reconnect),
        ),
        { onlyIfMissing: true },
      );
    };

    // Runs before the BunRedis layer closes the client. Bun needs a callable
    // onclose during close().
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        client.onclose = () => {};
      }),
    );
  }),
);

/** `BunRedis.layer` whose shared client reconnects after Bun gives up. */
export const reconnectingBunRedisLayer = (options: BunRedisOptions) =>
  reconnectAfterTerminalClose.pipe(Layer.provideMerge(BunRedis.layer(options)));
