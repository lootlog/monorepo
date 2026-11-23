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

let dragonfly: StartedTestContainer | undefined;

export const dragonflyUrl = () => {
  if (!dragonfly) throw new Error("Dragonfly has not started");

  return `redis://${dragonfly.getHost()}:${dragonfly.getMappedPort(6379)}`;
};

export const openDragonflyStore = async (keyPrefix: string) => {
  const runtime = ManagedRuntime.make(BunRedis.layer({ url: dragonflyUrl() }));
  const background: Array<Fiber.Fiber<void, unknown>> = [];
  const redis = await runtime.runPromise(Redis.Redis);

  const store = new RedisGatewayStore(
    redis,
    { keyPrefix },
    (effect) => runtime.runPromise(effect),
    (_label, effect) => {
      background.push(runtime.runFork(effect));
    },
  );

  return {
    store,
    redis,
    runtime,
    [Symbol.asyncDispose]: async () => {
      await Effect.runPromise(Fiber.interruptAll(background));
      await runtime.dispose();
    },
  };
};

export const useDragonfly = () => {
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
    dragonfly = undefined;
  });

  return openDragonflyStore;
};
