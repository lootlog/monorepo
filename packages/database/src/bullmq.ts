import { RedisClient } from "bun";
import {
  createBunRedisClient,
  type Job,
  Queue,
  RedisConnection,
  Worker,
  type WorkerOptions,
} from "bullmq";
import { Effect, Redacted } from "effect";

const prefix = "{bull}";

const useBunRedis = () => {
  RedisConnection.clientFactory = (options) => {
    if (!options.url) throw new Error("BullMQ requires a Redis URL");

    return createBunRedisClient(new RedisClient(options.url));
  };
};

export const acquireBullQueue = <Data>(
  name: string,
  redisUrl: Redacted.Redacted<string>,
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      useBunRedis();

      return new Queue<Data>(name, {
        connection: { url: Redacted.value(redisUrl) },
        prefix,
      });
    }),
    (queue) => Effect.tryPromise(() => queue.close()).pipe(Effect.orDie),
  );

export const acquireBullWorker = <Data, Result>(
  name: string,
  redisUrl: Redacted.Redacted<string>,
  process: (job: Job<Data>, token?: string) => Promise<Result>,
  options?: Omit<WorkerOptions, "connection" | "prefix">,
) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      useBunRedis();

      return new Worker<Data, Result>(name, process, {
        ...options,
        connection: { url: Redacted.value(redisUrl) },
        prefix,
      });
    }),
    (worker) => Effect.tryPromise(() => worker.close()).pipe(Effect.orDie),
  );
