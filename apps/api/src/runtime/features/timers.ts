import { ApiDatabase } from "#src/database/drizzle/database";
import { makeJsonCodec } from "#src/redis/redis.service";
import { makeEventHeroCheckDispatcher } from "#src/events/kills/event-hero-check-outbox";
import { makeOutboxWorker } from "#src/shared/outbox-worker";
import { makeRedisLockManager } from "#src/redis/redlock";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import { ErrorKey } from "#src/timers/error-key";
import { RabbitMessaging, eventMessage } from "@lootlog/messaging";
import { Effect, Layer, Schema } from "effect";
import { makeAutoTimer } from "#src/timers/timer-auto.data-layer";
import { makeDeleteTimer } from "#src/timers/timer-delete.data-layer";
import { makeTimerHistory } from "#src/timers/timer-history.data-layer";
import {
  makeAllTimerList,
  makeGuildHeroTimerList,
  makeGuildTimerList,
} from "#src/timers/timer-list.data-layer";
import { makeManualTimer } from "#src/timers/timer-manual.data-layer";
import { makeResetTimer } from "#src/timers/timer-reset.data-layer";
import { makeRestoreTimer } from "#src/timers/timer-restore.data-layer";
import { makeTimerSearch } from "#src/timers/timer-search.data-layer";
import { CachedTimerProjectionSchema } from "#src/timers/timer-projection";
import { TimersData } from "#src/timers/timers-data";
import { ApiRedis } from "#src/runtime/infrastructure/api-redis";
import { EventHeroKillQueue } from "#src/runtime/queues/event-hero-kill";
import { getTimerListCacheScope } from "#src/shared/cache";
import { makeHeroSightingPublisher } from "#src/runtime/features/hero-sightings";
import { ReadyRoomData } from "#src/messaging/ready-room/ready-room-data";

export const timersData = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* ApiDatabase;
    const redis = yield* ApiRedis;
    const rabbit = yield* RabbitMessaging;
    const readyRooms = yield* ReadyRoomData;
    const eventHeroKillQueue = yield* EventHeroKillQueue;
    const locks = makeRedisLockManager(redis);

    const withLock = <A, E>(key: string, effect: Effect.Effect<A, E>) =>
      locks.withLock(
        key,
        30_000,
        effect,
        () =>
          new ResourceConflictError({ code: ErrorKey.TIMER_RACE_CONDITION }),
      );

    const invalidateList = (guildId: string) =>
      redis.invalidateScopes(getTimerListCacheScope(guildId));

    const eventHeroChecks = yield* makeOutboxWorker(
      "Event hero check",
      makeEventHeroCheckDispatcher(database, ({ jobId, data }) =>
        eventHeroKillQueue.add(jobId, data),
      )(),
    );

    yield* eventHeroChecks.run.pipe(Effect.forkScoped);

    const service = TimersData.makeService({
      ...makeTimerHistory(database),
      createAuto: makeAutoTimer(database, {
        closeKilledNpcGatherings: readyRooms.npcKilled,
        signalEventHeroChecks: eventHeroChecks.signal,
        get: redis.get,
        invalidateList,
        publishHeroSighting: makeHeroSightingPublisher(rabbit),
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)),
        set: redis.set,
        locks,
        withLock,
      }),
      createManual: makeManualTimer(database, {
        invalidateList,
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)),
      }),
      delete: makeDeleteTimer(database, {
        invalidateList,
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)),
      }),
      restore: makeRestoreTimer(database, {
        invalidateList,
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)),
      }),
      reset: makeResetTimer(database, {
        invalidateList,
        publish: (routingKey, payload) =>
          rabbit.publish(eventMessage(routingKey, payload)),
        withLock,
      }),
      getAll: makeAllTimerList(database),
      getGuildTimers: makeGuildTimerList(database, {
        getOrSet: (key, guildId, factory) =>
          redis.getOrSetJson({
            key,
            scopes: [getTimerListCacheScope(guildId)],
            factory,
            ttlSeconds: 2,
            codec: makeJsonCodec(Schema.Array(CachedTimerProjectionSchema)),
          }),
      }),
      getGuildHeroTimers: makeGuildHeroTimerList(database),
      searchNpcs: makeTimerSearch(database),
    });

    return Layer.succeed(TimersData, service);
  }),
);
