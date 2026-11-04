import { expect, test } from "bun:test";
import { Deferred, Effect, Scope } from "effect";
import { Redis } from "effect/persistence";
import { RedisGatewayStore } from "./redis-store.js";

type Subscribe = Parameters<typeof Redis.make>[0]["subscribe"];

const subscribedStore = Effect.fnUntraced(function* (subscribe: Subscribe) {
  const redis = yield* Redis.make({
    send: <A>(command: string) =>
      command === "GET"
        ? // SAFETY: the only GET reads the federation sequence counter,
          // which is absent (null) before the first publication.
          Effect.succeed(null as A)
        : Effect.die("Unexpected Redis command"),
    subscribe,
    connect: Effect.die("Unexpected dedicated Redis connection"),
  });

  const scope = yield* Effect.scope;

  return new RedisGatewayStore(
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
});

const frame = (channel: string, index: number): Redis.RedisMessage => ({
  channel,
  message: JSON.stringify({
    id: String(index),
    sourceInstanceId: "other",
    event: "test",
  }),
});

const waitUntil = (done: () => boolean, failure: string) =>
  Effect.promise(async () => {
    const deadline = Date.now() + 2000;

    while (!done()) {
      if (Date.now() > deadline) throw new Error(failure);
      await Bun.sleep(1);
    }
  });

test("federation backlog yields to timers while preserving order and isolating malformed messages", async () => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        let enqueue: (message: Redis.RedisMessage) => void = () => {
          throw new Error("not subscribed");
        };

        const store = yield* subscribedStore((_channel, onMessage) =>
          Effect.sync(() => {
            enqueue = onMessage;

            return Effect.never;
          }),
        );

        const scope = yield* Effect.scope;
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

            if (received.length !== 1) return;
            timer = setTimeout(() => {
              countAtTimer = received.length;
            }, 0);

            // Make the timer due before the backlog could drain without yielding.
            const due = performance.now() + 2;

            while (performance.now() < due);
          }),
        );

        for (let index = 0; index < 256; index++) {
          enqueue(frame(store.channel, index));
          enqueue({ channel: store.channel, message: "{" });
        }

        yield* waitUntil(
          () => received.length >= 256 && countAtTimer !== undefined,
          "Federation failed to drain",
        );
        expect(received).toEqual(
          Array.from({ length: 256 }, (_, index) => String(index)),
        );
        expect(countAtTimer).toBeLessThan(256);
      }),
    ),
  );
});

test("a dropped subscriber reports the interruption before delivering its whole backlog", async () => {
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        let enqueue: (message: Redis.RedisMessage) => void = () => {
          throw new Error("not subscribed");
        };

        let disconnect: () => void = () => {
          throw new Error("not subscribed");
        };

        const store = yield* subscribedStore((_channel, onMessage) =>
          Effect.gen(function* () {
            const terminal = yield* Deferred.make<void, Redis.RedisError>();
            enqueue = onMessage;
            disconnect = () =>
              Deferred.doneUnsafe(
                terminal,
                new Redis.RedisError({ cause: "connection closed" }),
              );

            return Deferred.await(terminal);
          }),
        );

        const backlog = 4_096;
        let received = 0;
        let receivedAtLoss: number | undefined;

        yield* Effect.promise(() =>
          store.subscribe(
            () => {
              received++;
            },
            (state) => {
              if (state === "interrupted") receivedAtLoss ??= received;
            },
          ),
        );

        for (let index = 0; index < backlog; index++)
          enqueue(frame(store.channel, index));
        disconnect();

        yield* waitUntil(
          () => receivedAtLoss !== undefined,
          "Subscriber loss was not reported",
        );
        expect(receivedAtLoss).toBeLessThan(backlog);
        // Sessions may outlive the interruption, so the backlog still reaches them.
        yield* waitUntil(
          () => received >= backlog,
          "Backlog was not delivered",
        );
      }),
    ),
  );
});
