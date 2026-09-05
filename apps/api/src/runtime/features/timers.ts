import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/kills/event-hero-kill-queue.constant";
import {
  EVENT_HERO_KILL_JOB_NAME,
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  getEventHeroKillWindowKey,
} from "#src/events/kills/event-hero-kill-job";
import { RedlockService } from "#src/redis/redlock";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/error-key";
import { RabbitMessaging } from "@lootlog/messaging";
import { Queue } from "bullmq";
import { Effect, Layer, Schema } from "effect";
import { makeAutoTimer } from "#src/http-api/handlers/timers/timer-auto.data-layer";
import { makeDeleteTimer } from "#src/http-api/handlers/timers/timer-delete.data-layer";
import { makeTimerHistory } from "#src/http-api/handlers/timers/timer-history.data-layer";
import {
  makeAllTimerList,
  makeGuildTimerList,
} from "#src/http-api/handlers/timers/timer-list.data-layer";
import { makeManualTimer } from "#src/http-api/handlers/timers/timer-manual.data-layer";
import { makeResetTimer } from "#src/http-api/handlers/timers/timer-reset.data-layer";
import { makeRestoreTimer } from "#src/http-api/handlers/timers/timer-restore.data-layer";
import { makeTimerSearch } from "#src/http-api/handlers/timers/timer-search.data-layer";
import { CachedTimerProjectionSchema } from "#src/timers/timer-projection";
import { TimersData } from "#src/http-api/handlers/timers/timers.handlers";
import { ApiRedis, redisUrl } from "#src/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/runtime/infrastructure/api-runtime-config";

export const timersData = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const eventHeroKillQueue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(EVENT_HERO_KILL_QUEUE, {
            connection: { url: redisUrl(config.redis) },
            prefix: "{bull}",
          }),
      ),
      (queue) => Effect.tryPromise(() => queue.close()),
    );
    const redlock = new RedlockService(redis).createInstance({
      automaticExtensionThreshold: 5000,
    });
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const withLock = <A, E>(key: string, effect: Effect.Effect<A, E>) =>
      Effect.acquireUseRelease(
        Effect.tryPromise({
          try: () => redlock.acquire([key], 30_000),
          catch: (error) =>
            new ResourceConflictError({
              message: ErrorKey.TIMER_RACE_CONDITION,
              cause: error,
            }),
        }),
        () => effect,
        (lock: Awaited<ReturnType<typeof redlock.acquire>>) =>
          Effect.tryPromise(() => lock.release()).pipe(Effect.ignore),
      );
    const service = TimersData.makeService({
      ...makeTimerHistory(database),
      createAuto: makeAutoTimer(database, {
        enqueueEventHeroCheck: (check) => {
          const windowKey = getEventHeroKillWindowKey(check.timerData);
          const jobId = buildEventHeroKillJobId({
            guildId: check.guildId,
            world: check.world,
            npcId: check.npcId,
            windowKey,
            isManualClose: false,
          });

          return attempt(() =>
            eventHeroKillQueue.add(
              EVENT_HERO_KILL_JOB_NAME,
              createEventHeroKillJobData(check, false),
              {
                jobId,
                attempts: 5,
                backoff: { type: "exponential", delay: 1000 },
                removeOnComplete: true,
                removeOnFail: false,
              },
            ),
          );
        },
        get: (key) => attempt(() => redis.get(key)),
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
        releaseDedup: (script, key, token) =>
          attempt(() => redis.eval(script, [key], [token])).pipe(Effect.ignore),
        set: (key, value, ttlSeconds) =>
          attempt(() => redis.set(key, value, ttlSeconds)),
        setNx: (key, value, ttlSeconds) =>
          attempt(() => redis.setNX(key, value, ttlSeconds)),
        withLock,
      }),
      createManual: makeManualTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
      }),
      delete: makeDeleteTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
      }),
      restore: makeRestoreTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
      }),
      reset: makeResetTimer(database, {
        invalidate: (pattern) => attempt(() => redis.deleteByPattern(pattern)),
        publish: (routingKey, payload) =>
          rabbit.publish({
            exchange: "default",
            routingKey,
            content: new TextEncoder().encode(JSON.stringify(payload)),
          }),
        withLock,
      }),
      getAll: makeAllTimerList(database),
      getGuildTimers: makeGuildTimerList(database, {
        getOrSet: (key, factory) =>
          redis.getOrSetJsonEffect({
            key,
            factory,
            ttlSeconds: 2,
            codec: makeJsonCodec(Schema.Array(CachedTimerProjectionSchema)),
          }),
      }),
      searchNpcs: makeTimerSearch(database),
    });
    return Layer.succeed(TimersData, service);
  }),
);
