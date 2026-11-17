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

// Every Lootlog queue lives under one Redis Cluster hash slot.
const prefix = "{bull}";

// BullMQ reads its client factory from a process-global; set it before every
// connection instead of relying on an import side effect.
const useBunRedis = () => {
  RedisConnection.clientFactory = (options) => {
    if (!options.url) throw new Error("BullMQ requires a Redis URL");

    return createBunRedisClient(new RedisClient(options.url));
  };
};

/** A BullMQ queue on Bun's Redis client, closed with its scope. */
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

/** A BullMQ worker on Bun's Redis client, closed with its scope. */
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
