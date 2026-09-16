import { expect, test } from "bun:test";
import { Effect, Scope } from "effect";
import { Redis } from "effect/unstable/persistence";
import { RedisGatewayStore } from "./redis-store.js";

test("federation backlog yields to timers while preserving order and isolating malformed messages", async () => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        let enqueue: (message: Redis.RedisMessage) => void = () => {
          throw new Error("not subscribed");
        };

        const redis = yield* Redis.make({
          send: () => Effect.die("Unexpected Redis command"),
          subscribe: (_channel, onMessage) =>
            Effect.sync(() => {
              enqueue = onMessage;

              return Effect.never;
            }),
        });

        const scope = yield* Effect.scope;

        const store = new RedisGatewayStore(
          redis,
          {
            host: "unused",
            port: 6379,
            username: "",
            password: "",
            keyPrefix: "test",
          },
          Effect.runPromise,
          (_label, task) => {
            Effect.runFork(task.pipe(Effect.forkIn(scope)));
          },
        );

        const received: string[] = [];
        let countAtTimer: number | undefined;
        let timer: ReturnType<typeof setTimeout> | undefined;
        yield* Scope.addFinalizer(
          scope,
          Effect.sync(() => clearTimeout(timer)),
        );
        yield* Effect.promise(() =>
          store.subscribe((message) => {
            received.push(message.id);

            if (received.length === 1)
              timer = setTimeout(() => {
                countAtTimer = received.length;
              }, 0);
          }),
        );

        for (let index = 0; index < 256; index++) {
          enqueue({
            channel: store.channel,
            message: JSON.stringify({
              id: String(index),
              sourceInstanceId: "other",
              frame: "test",
            }),
          });
          enqueue({ channel: store.channel, message: "{" });
        }

        yield* Effect.promise(async () => {
          const deadline = Date.now() + 2000;

          while (received.length < 256 || countAtTimer === undefined) {
            if (Date.now() > deadline)
              throw new Error("Federation failed to drain");
            await Bun.sleep(1);
          }
        });
        expect(received).toEqual(
          Array.from({ length: 256 }, (_, index) => String(index)),
        );
        expect(countAtTimer).toBeLessThan(256);
      }),
    ),
  );
});
