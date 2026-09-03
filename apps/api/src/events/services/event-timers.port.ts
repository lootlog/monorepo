import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { Clock, Effect, Schema } from "effect";
import { ExecutionError } from "redlock";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { mapTimerResponse } from "#src/http-api/handlers/timers/timer-response";
import type { RedlockService } from "#src/lib/redlock/redlock.service";
import type { AmqpPublisher } from "#src/rabbitmq/amqp-publisher";
import type { RedisService } from "#src/redis/redis.service";
import { ResourceConflictError } from "#src/shared/http/http-errors";
import type { ApplicationLogger } from "#src/shared/logging/application-logger";
import { DEFAULT_RESPAWN_RANDOMNESS } from "#src/timers/constants/respawn";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import type { Timer } from "#src/timers/timers.types";
import { buildTimerKey } from "#src/timers/utils/timer-key";
import type { EventTimerStore } from "./event-timer.store.js";

export interface EventTimerLookupInput {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
}

export interface EventRespawnTimerInput extends EventTimerLookupInput {
  readonly npcIcon: string | null;
  readonly minSpawnTime: Date;
  readonly maxSpawnTime: Date;
  readonly createdById: number;
  readonly isUsingSyntheticId: boolean;
}

export interface EventTimersPort {
  readonly getEventRespawnTimer: (
    input: EventTimerLookupInput,
  ) => Effect.Effect<Timer | null, EventTimersError>;
  readonly openEventRespawnTimer: (
    input: EventRespawnTimerInput,
  ) => Effect.Effect<Timer, EventTimersError>;
  readonly closeEventRespawnTimer: (
    input: EventTimerLookupInput,
  ) => Effect.Effect<Timer | null, EventTimersError>;
  readonly getActiveTimerKeys: (
    lookups: ReadonlyArray<EventTimerLookupInput>,
    now: Date,
  ) => Effect.Effect<Set<string>, EventTimersError>;
  readonly getTimersForEventHeroFilters: (
    guildId: string,
    world: string,
    heroes: ReadonlyArray<{ npcId: number | null; npcName: string }>,
  ) => Effect.Effect<Timer[], EventTimersError>;
}

export class EventTimersError extends TaggedErrorClass<EventTimersError>()(
  "EventTimersError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

interface EventTimersDependencies {
  readonly logger: ApplicationLogger;
  readonly store: EventTimerStore;
  readonly amqp: AmqpPublisher;
  readonly redis: RedisService;
  readonly redlock: RedlockService;
}

const LOCK_TTL_MS = 30_000;

export const makeEventTimersPort = ({
  logger,
  store,
  amqp,
  redis,
  redlock,
}: EventTimersDependencies): EventTimersPort => {
  const lockManager = redlock.createInstance({
    automaticExtensionThreshold: 5_000,
  });
  const external = <A>(operation: string, run: () => Promise<A>) =>
    Effect.tryPromise({
      try: run,
      catch: (cause) => new EventTimersError({ operation, cause }),
    }).pipe(
      Effect.withSpan(operation, {
        attributes: { adapter: "event-timers", retryCount: 0 },
      }),
    );
  const mapped = <A>(operation: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError((cause) => new EventTimersError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "event-timers", retryCount: 0 },
      }),
    );

  const invalidateCache = (guildId: string) =>
    external("eventTimers.cache.invalidate", () =>
      redis.deleteByPattern(`timer:list:${guildId}:*`),
    ).pipe(
      Effect.tap((count) =>
        count > 0
          ? Effect.sync(() =>
              logger.log({
                level: "debug",
                message: `Invalidated ${count} cache entries for guild ${guildId}`,
              }),
            )
          : Effect.void,
      ),
      Effect.asVoid,
    );

  const publishUpdate = (timer: Timer) => {
    const response = mapTimerResponse(timer);
    return Effect.all(
      [
        mapped(
          "eventTimers.rabbit.update",
          amqp.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.GUILDS_TIMERS_UPDATE,
            response,
          ),
        ),
        mapped(
          "eventTimers.rabbit.notification",
          amqp.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.NOTIFICATIONS_TIMER_UPDATED,
            response,
          ),
        ),
      ],
      { concurrency: "unbounded", discard: true },
    );
  };

  const publishDelete = (timer: Timer) => {
    const npc = timer.npc as {
      lvl?: number;
      prof?: string;
      type?: number | string;
      wt?: number | string;
    };
    const payload = {
      guildId: timer.guildId,
      world: timer.world,
      npcId: timer.npcId,
      timerKey: timer.timerKey,
      routing: { tier: getNpcRoutingTier(npc), npcLevel: npc.lvl },
    };
    return Effect.all(
      [
        mapped(
          "eventTimers.rabbit.delete",
          amqp.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.GUILDS_TIMERS_DELETE,
            payload,
          ),
        ),
        mapped(
          "eventTimers.rabbit.notificationDelete",
          amqp.publish(
            DEFAULT_EXCHANGE_NAME,
            RoutingKey.NOTIFICATIONS_TIMER_DELETED,
            payload,
          ),
        ),
      ],
      { concurrency: "unbounded", discard: true },
    );
  };

  const findAfterLockFailure = (
    guildId: string,
    world: string,
    timerKey: string,
  ) =>
    Effect.gen(function* () {
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const timer = yield* store.findTimer(guildId, world, timerKey);
        if (timer) return timer;
        if (attempt < 9) yield* Effect.sleep("20 millis");
      }
      return null;
    });

  const withLock = <A>(
    operation: string,
    lockKey: string,
    use: () => Effect.Effect<A, unknown>,
  ) => {
    type AcquiredLock = Awaited<ReturnType<typeof lockManager.acquire>>;
    const acquire = external<AcquiredLock>(`${operation}.lock.acquire`, () =>
      lockManager.acquire([lockKey], LOCK_TTL_MS),
    );
    return Effect.acquireUseRelease(acquire, use, (lock) =>
      external(`${operation}.lock.release`, () => lock.release()).pipe(
        Effect.ignore,
      ),
    );
  };

  return {
    getEventRespawnTimer: ({ guildId, world, npcId, npcName }) =>
      mapped(
        "eventTimers.getRespawn",
        store.findTimer(guildId, world, buildTimerKey(npcId, npcName)),
      ),

    openEventRespawnTimer: (input) => {
      const timerKey = buildTimerKey(input.npcId, input.npcName);
      const operation = "eventTimers.openRespawn";
      const lockKey = `timer:lock:${input.guildId}:${input.world}:${timerKey}`;
      const work = withLock(operation, lockKey, () =>
        Effect.gen(function* () {
          const windowOpenedAt = new Date(yield* Clock.currentTimeMillis);
          const npc = {
            id: input.npcId,
            name: input.npcName,
            prof: "",
            location: "",
            wt: "",
            lvl: 0,
            type: "hero",
            icon: input.npcIcon ?? "",
            margonemType: input.isUsingSyntheticId
              ? String(TIMER_TYPES.CUSTOM_MANUAL)
              : "0",
          };
          const timer = yield* store.upsertTimer(
            {
              guildId: input.guildId,
              createdById: input.createdById,
              world: input.world,
              npcId: input.npcId,
              timerKey,
              minSpawnTime: input.minSpawnTime,
              maxSpawnTime: input.maxSpawnTime,
              latestRespBaseSeconds: Math.round(
                (input.maxSpawnTime.getTime() - input.minSpawnTime.getTime()) /
                  2_000,
              ),
              latestRespawnRandomness: DEFAULT_RESPAWN_RANDOMNESS,
              wasReset: false,
              npc,
              windowOpenedAt,
              actorCharacterSnapshotId: null,
              actorCharacterLvl: null,
              deletedAt: null,
            },
            {
              minSpawnTime: input.minSpawnTime,
              maxSpawnTime: input.maxSpawnTime,
              wasReset: false,
              npc,
              windowOpenedAt,
              deletedAt: null,
            },
          );
          yield* invalidateCache(input.guildId);
          yield* publishUpdate(timer);
          return timer;
        }),
      );
      return work.pipe(
        Effect.catch((error) => {
          if (
            error instanceof EventTimersError &&
            error.cause instanceof ExecutionError
          ) {
            return findAfterLockFailure(
              input.guildId,
              input.world,
              timerKey,
            ).pipe(
              Effect.flatMap((timer) =>
                timer
                  ? Effect.succeed(timer)
                  : Effect.fail(
                      new ResourceConflictError({
                        message: ErrorKey.TIMER_RACE_CONDITION,
                      }),
                    ),
              ),
              Effect.mapError(
                (cause) => new EventTimersError({ operation, cause }),
              ),
            );
          }
          return Effect.fail(
            error instanceof EventTimersError
              ? error
              : new EventTimersError({ operation, cause: error }),
          );
        }),
      );
    },

    closeEventRespawnTimer: ({ guildId, world, npcId, npcName }) => {
      const timerKey = buildTimerKey(npcId, npcName);
      const operation = "eventTimers.closeRespawn";
      return withLock(
        operation,
        `timer:lock:${guildId}:${world}:${timerKey}`,
        () =>
          Effect.gen(function* () {
            const timer = yield* store.findTimer(guildId, world, timerKey);
            if (!timer) return null;
            yield* store.deleteTimer(guildId, world, timerKey);
            yield* invalidateCache(guildId);
            yield* publishDelete(timer);
            return timer;
          }),
      ).pipe(
        Effect.mapError(
          (cause) =>
            new EventTimersError({
              operation,
              cause:
                cause instanceof EventTimersError &&
                cause.cause instanceof ExecutionError
                  ? new ResourceConflictError({
                      message: ErrorKey.TIMER_RACE_CONDITION,
                    })
                  : cause,
            }),
        ),
      );
    },

    getActiveTimerKeys: (lookups) =>
      mapped(
        "eventTimers.getActiveKeys",
        store
          .findActiveTimerKeys(
            lookups.map((lookup) => ({
              guildId: lookup.guildId,
              world: lookup.world,
              timerKey: buildTimerKey(lookup.npcId, lookup.npcName),
            })),
          )
          .pipe(
            Effect.map(
              (timers) =>
                new Set(
                  timers.map(
                    (timer) =>
                      `${timer.guildId}:${timer.world}:${timer.timerKey}`,
                  ),
                ),
            ),
          ),
      ),

    getTimersForEventHeroFilters: (guildId, world, heroes) => {
      if (heroes.length === 0) return Effect.succeed([]);
      const timerKeys = heroes
        .filter((hero) => hero.npcId !== null)
        .map((hero) => buildTimerKey(hero.npcId as number, hero.npcName));
      const npcNames = heroes
        .filter((hero) => hero.npcId === null)
        .map((hero) => hero.npcName);
      return mapped(
        "eventTimers.getHeroTimers",
        Effect.all(
          [
            timerKeys.length > 0
              ? store.findEventHeroTimersByKeys(guildId, world, timerKeys)
              : Effect.succeed([]),
            npcNames.length > 0
              ? store.findEventHeroTimersByNames(guildId, world, npcNames)
              : Effect.succeed([]),
          ],
          { concurrency: "unbounded" },
        ).pipe(
          Effect.map(([byKey, byName]) =>
            Array.from(
              new Map(
                [...byKey, ...byName].map((timer) => [timer.timerKey, timer]),
              ).values(),
            ),
          ),
        ),
      );
    },
  };
};
