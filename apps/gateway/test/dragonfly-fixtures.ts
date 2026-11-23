import { afterAll, beforeAll } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { Effect, Fiber, ManagedRuntime } from "effect";
import { Redis } from "effect/persistence";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { RedisGatewayStore } from "#src/platform/redis-store";

export const useDragonfly = () => {
  let dragonfly: StartedTestContainer | undefined;

  beforeAll(async () => {
    dragonfly = await new GenericContainer(
      "docker.dragonflydb.io/dragonflydb/dragonfly:v2.1.0",
    )
      .withCommand(["--logtostderr", "--proactor_threads=2"])
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forListeningPorts())
      .withStartupTimeout(60_000)
      .start();
  }, 60_000);

  afterAll(async () => {
    await dragonfly?.stop();
  });

  return async (keyPrefix: string) => {
    if (!dragonfly) throw new Error("Dragonfly has not started");

    const runtime = ManagedRuntime.make(
      BunRedis.layer({
        url: `redis://${dragonfly.getHost()}:${dragonfly.getMappedPort(6379)}`,
      }),
    );

    const background: Array<Fiber.Fiber<void, unknown>> = [];

    const store = new RedisGatewayStore(
      await runtime.runPromise(Redis.Redis),
      { keyPrefix },
      (effect) => runtime.runPromise(effect),
      (_label, effect) => {
        background.push(runtime.runFork(effect));
      },
    );

    return {
      store,
      [Symbol.asyncDispose]: async () => {
        await Effect.runPromise(Fiber.interruptAll(background));
        await runtime.dispose();
      },
    };
  };
};
