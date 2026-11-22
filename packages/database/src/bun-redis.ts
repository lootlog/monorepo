import { BunRedis } from "@effect/platform-bun";
import { Effect, FiberHandle, Layer, Schedule } from "effect";

type BunRedisOptions = NonNullable<Parameters<typeof BunRedis.layer>[0]>;

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

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        client.onclose = () => {};
      }),
    );
  }),
);

export const reconnectingBunRedisLayer = (options: BunRedisOptions) =>
  reconnectAfterTerminalClose.pipe(Layer.provideMerge(BunRedis.layer(options)));
