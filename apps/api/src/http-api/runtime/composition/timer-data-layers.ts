import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { EVENT_HERO_KILL_QUEUE } from "#src/events/kills/event-hero-kill-queue.constant";
import { makeEventTimerStore } from "#src/events/respawn/event-timer.store";
import {
  makeEventTimersPort,
  type EventTimersPort,
} from "#src/events/respawn/event-timers.port";
import {
  buildEventHeroKillJobId,
  createEventHeroKillJobData,
  EVENT_HERO_KILL_JOB_NAME,
  getEventHeroKillWindowKey,
} from "#src/events/kills/event-hero-kill-job";
import { RedlockService } from "#src/redis/redlock";
import { NOTIFICATIONS_DISPATCH_QUEUE } from "#src/notifications/jobs/dispatch-queue";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { applicationLogger } from "#src/shared/application-logger";
import { ErrorKey } from "#src/timers/error-key";
import { RabbitMessaging } from "@lootlog/messaging";
import { Queue } from "bullmq";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { HttpClient } from "effect/unstable/http";
import { makeReservationCatalogAdapter } from "#src/http-api/handlers/organization-workspace/reservation-catalog.adapter";
import { makeReservationMutationsDataLayer } from "#src/http-api/handlers/organization-workspace/reservation-mutations.data-layer";
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
import { CachedTimerProjectionSchema } from "#src/http-api/handlers/timers/timer-response";
import { TimersData } from "#src/http-api/handlers/timers/timers.handlers";
import { ApiRedis } from "#src/http-api/runtime/infrastructure/api-redis";
import { ApiRuntimeConfig } from "#src/http-api/runtime/infrastructure/api-runtime-config";

import { makeAmqpAdapter } from "#src/http-api/runtime/composition/core-data-layers";
export const reservationMutationsData = Layer.unwrap(
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const config = yield* ApiRuntimeConfig;
    const httpClient = yield* HttpClient.HttpClient;
    const notificationsQueue = yield* Effect.acquireRelease(
      Effect.sync(
        () =>
          new Queue(NOTIFICATIONS_DISPATCH_QUEUE, {
            connection: {
              host: config.redis.host,
              port: config.redis.port,
              username: config.redis.username,
              password: Redacted.value(config.redis.password),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
            prefix: "{bull}",
          }),
      ),
      (queue) => Effect.tryPromise(() => queue.close()),
    );
    const attempt = <A>(operation: () => PromiseLike<A>) =>
      Effect.tryPromise({ try: operation, catch: (error) => error });
    const catalog = makeReservationCatalogAdapter({
      cache: {
        getJson: (key, schema) =>
          attempt(() => redis.getJson(key, makeJsonCodec(schema))),
        setJson: (key, value, ttl) =>
          attempt(() => redis.setJson(key, value, ttl)),
      },
      httpClient,
      url: config.reservationsCardsUrl.toString(),
    });
    return makeReservationMutationsDataLayer({
      catalog,
      enqueueNotification: (notificationJobId, delay) =>
        attempt(() =>
          notificationsQueue.add(
            notificationJobId,
            { notificationJobId },
            {
              jobId: notificationJobId,
              delay,
              removeOnComplete: true,
              removeOnFail: true,
            },
          ),
        ),
      removeNotification: (notificationJobId) =>
        attempt(async () => {
          const job = await notificationsQueue.getJob(notificationJobId);
          await job?.remove();
        }),
      publish: (routingKey, payload) =>
        rabbit.publish({
          exchange: "default",
          routingKey,
          content: new TextEncoder().encode(JSON.stringify(payload)),
        }),
    });
  }),
);

export class EventTimers extends Context.Service<
  EventTimers,
  EventTimersPort
>()("@lootlog/api/http-api/EventTimers") {}

export const eventTimersLive = Layer.effect(
  EventTimers,
  Effect.gen(function* () {
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const database = yield* ApiDatabase;
    return makeEventTimersPort({
      logger: applicationLogger,
      store: makeEventTimerStore(database),
      amqp: makeAmqpAdapter(rabbit),
      redis,
      redlock: new RedlockService(redis),
    });
  }),
);

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
            connection: {
              host: config.redis.host,
              port: config.redis.port,
              username: config.redis.username,
              password: Redacted.value(config.redis.password),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
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
        withLock: (key, effect) =>
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
          ),
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
        withLock: (key, effect) =>
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
          ),
      }),
      getAll: makeAllTimerList(database),
      getGuildTimers: makeGuildTimerList(database, {
        get: (key) =>
          attempt(() =>
            redis.getJson(
              key,
              makeJsonCodec(Schema.Array(CachedTimerProjectionSchema)),
            ),
          ),
        set: (key, value, ttlSeconds) =>
          attempt(() => redis.setJson(key, value, ttlSeconds)),
      }),
      searchNpcs: makeTimerSearch(database),
    });
    return Layer.succeed(TimersData, service);
  }),
);
