import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { respawnFromSpawnWindow } from "@lootlog/domain/timers";
import { Clock, Effect, Predicate, Schema } from "effect";
import { ExecutionError, type RedisLockManager } from "#src/redis/redlock";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import {
  mapTimerResponse,
  toTimerEvent,
  timerNpcField,
  parseTimerNpcRouting,
  timerNpcTemplateId,
} from "#src/timers/timer-projection";
import type { EventPublisher } from "@lootlog/messaging";
import type { RedisService } from "#src/redis/redis.service";
import { ResourceConflictError } from "@lootlog/protocol/http/errors";
import { getTimerListCacheScope } from "#src/shared/cache";
import { TIMER_TYPES } from "@lootlog/domain/npc-identity";
import { ErrorKey } from "#src/timers/error-key";
import type { Timer } from "#src/timers/timers.types";
import { buildTimerKey, buildTimerLockKey } from "#src/timers/timer-key";
import type { EventTimerStore } from "#src/events/respawn/event-timer.repository";

interface EventTimerLookupInput {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
}

interface EventRespawnTimerInput extends EventTimerLookupInput {
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
  readonly hasEventRespawnTimers: (
    lookups: ReadonlyArray<EventTimerLookupInput>,
  ) => Effect.Effect<boolean[], EventTimersError>;
  readonly getTimersForEventHeroFilters: (
    guildId: string,
    world: string,
    heroes: ReadonlyArray<{ npcId: number | null; npcName: string }>,
  ) => Effect.Effect<EventHeroTimer[], EventTimersError>;
}

type EventHeroTimer = Pick<
  Timer,
  "npcId" | "timerKey" | "world" | "minSpawnTime" | "maxSpawnTime" | "npc"
>;

export class EventTimersError extends TaggedErrorClass<EventTimersError>()(
  "EventTimersError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

interface EventTimersDependencies {
  readonly store: EventTimerStore;
  readonly amqp: EventPublisher;
  readonly redis: Pick<RedisService, "invalidateScopes">;
  readonly locks: RedisLockManager;
}

const LOCK_TTL_MS = 30_000;

export const makeEventTimersPort = ({
  store,
  amqp,
  redis,
  locks,
}: EventTimersDependencies): EventTimersPort => {
  const mapped = <A>(operation: string, effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError((cause) => new EventTimersError({ operation, cause })),
      withAdapterSpan(operation, "event-timers"),
    );

  const invalidateCache = (guildId: string) =>
    mapped(
      "eventTimers.cache.invalidate",
      redis.invalidateScopes(getTimerListCacheScope(guildId)),
    ).pipe(
      Effect.tap(() =>
        Effect.logDebug({
          message: `Invalidated timer list cache for guild ${guildId}`,
        }),
      ),
    );

  const publishUpdate = (timer: Timer) => {
    const response = toTimerEvent(mapTimerResponse(timer));

    return Effect.all(
      [
        mapped(
          "eventTimers.rabbit.update",
          amqp.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response),
        ),
        mapped(
          "eventTimers.rabbit.notification",
          amqp.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED, response),
        ),
      ],
      { concurrency: "unbounded", discard: true },
    );
  };

  const publishDelete = (timer: Timer) => {
    const npc = timer.npc;

    const payload = {
      guildId: timer.guildId,
      world: timer.world,
      npcId: timer.npcId,
      timerKey: timer.timerKey,
      routing: {
        tier: getNpcRoutingTier(parseTimerNpcRouting(npc)),
        npcLevel: timerNpcField(npc, "lvl"),
      },
    };

    return Effect.all(
      [
        mapped(
          "eventTimers.rabbit.delete",
          amqp.publish(RabbitRoutingKey.GUILDS_TIMERS_DELETE, payload),
        ),
        mapped(
          "eventTimers.rabbit.notificationDelete",
          amqp.publish(RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED, payload),
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
  ) =>
    locks.withLock(
      lockKey,
      LOCK_TTL_MS,
      Effect.suspend(use),
      () =>
        new EventTimersError({
          operation: `${operation}.lock.acquire`,
          cause: new ExecutionError("Unable to acquire Redis lock"),
        }),
    );

  const resolveTimerKeys = (lookups: ReadonlyArray<EventTimerLookupInput>) =>
    mapped(
      "eventTimers.resolveKeys",
      store.findHeroTimerKeys(lookups).pipe(
        Effect.map((rows) => {
          const keysByNpc = new Map(
            rows.map((row) => [
              `${row.guildId}:${row.world}:${row.npcId}`,
              row.timerKey,
            ]),
          );

          return lookups.map((lookup) => ({
            guildId: lookup.guildId,
            world: lookup.world,
            timerKey:
              keysByNpc.get(
                `${lookup.guildId}:${lookup.world}:${lookup.npcId}`,
              ) ?? buildTimerKey(lookup.npcId, lookup.npcName),
          }));
        }),
      ),
    );

  const resolveTimerKey = (lookup: EventTimerLookupInput) =>
    resolveTimerKeys([lookup]).pipe(
      Effect.map(
        ([resolved]) =>
          resolved?.timerKey ?? buildTimerKey(lookup.npcId, lookup.npcName),
      ),
    );

  return {
    getEventRespawnTimer: (lookup) =>
      resolveTimerKey(lookup).pipe(
        Effect.flatMap((timerKey) =>
          mapped(
            "eventTimers.getRespawn",
            store.findTimer(lookup.guildId, lookup.world, timerKey),
          ),
        ),
      ),

    openEventRespawnTimer: (input) =>
      resolveTimerKey(input).pipe(
        Effect.flatMap((timerKey) => openRespawnTimer(input, timerKey)),
      ),

    closeEventRespawnTimer: (lookup) =>
      resolveTimerKey(lookup).pipe(
        Effect.flatMap((timerKey) => closeRespawnTimer(lookup, timerKey)),
      ),

    hasEventRespawnTimers: (lookups) =>
      resolveTimerKeys(lookups).pipe(
        Effect.flatMap((resolved) =>
          mapped(
            "eventTimers.getActiveKeys",
            store.findActiveTimerKeys(resolved),
          ).pipe(
            Effect.map((timers) => {
              const existing = new Set(
                timers.map(
                  (timer) =>
                    `${timer.guildId}:${timer.world}:${timer.timerKey}`,
                ),
              );

              return resolved.map((lookup) =>
                existing.has(
                  `${lookup.guildId}:${lookup.world}:${lookup.timerKey}`,
                ),
              );
            }),
          ),
        ),
      ),

    getTimersForEventHeroFilters: (guildId, world, heroes) => {
      if (heroes.length === 0) return Effect.succeed([]);

      const heroesWithNpcId = heroes.flatMap((hero) =>
        hero.npcId === null
          ? []
          : [{ guildId, world, npcId: hero.npcId, npcName: hero.npcName }],
      );

      const npcNames = heroes
        .filter((hero) => hero.npcId === null)
        .map((hero) => hero.npcName);

      return Effect.all(
        [
          heroesWithNpcId.length > 0
            ? resolveTimerKeys(heroesWithNpcId).pipe(
                Effect.flatMap((resolved) =>
                  mapped(
                    "eventTimers.getHeroTimers",
                    store.findEventHeroTimersByKeys(
                      guildId,
                      world,
                      resolved.map(({ timerKey }) => timerKey),
                    ),
                  ),
                ),
              )
            : Effect.succeed([]),
          npcNames.length > 0
            ? mapped(
                "eventTimers.getHeroTimers",
                store.findEventHeroTimersByNames(guildId, world, npcNames),
              )
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
      );
    },
  };

  function openRespawnTimer(input: EventRespawnTimerInput, timerKey: string) {
    const operation = "eventTimers.openRespawn";
    const lockKey = buildTimerLockKey(input.guildId, input.world, timerKey);

    const work = withLock(operation, lockKey, () =>
      Effect.gen(function* () {
        const windowOpenedAt = new Date(yield* Clock.currentTimeMillis);

        const existing = yield* store.findTimer(
          input.guildId,
          input.world,
          timerKey,
        );

        const npc = {
          id: input.npcId,
          templateId: timerNpcTemplateId(existing?.npc),
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

        const respawn = respawnFromSpawnWindow(
          (input.minSpawnTime.getTime() - windowOpenedAt.getTime()) / 1000,
          (input.maxSpawnTime.getTime() - windowOpenedAt.getTime()) / 1000,
        );

        const timer = yield* store.upsertTimer(
          {
            guildId: input.guildId,
            createdById: input.createdById,
            world: input.world,
            npcId: input.npcId,
            timerKey,
            minSpawnTime: input.minSpawnTime,
            maxSpawnTime: input.maxSpawnTime,
            latestRespBaseSeconds: respawn.respBaseSeconds,
            latestRespawnRandomness: respawn.respawnRandomness,
            wasReset: false,
            npc,
            windowOpenedAt,
            actorCharacterSnapshotId: null,
            actorCharacterLvl: null,
            deletedAt: null,
          },
          {
            createdById: input.createdById,
            minSpawnTime: input.minSpawnTime,
            maxSpawnTime: input.maxSpawnTime,
            wasReset: false,
            npc,
            windowOpenedAt,
            actorCharacterSnapshotId: null,
            actorCharacterLvl: null,
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
            Effect.filterOrFail(
              Predicate.isNotNullish,
              () =>
                new ResourceConflictError({
                  code: ErrorKey.TIMER_RACE_CONDITION,
                }),
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
  }

  function closeRespawnTimer(
    { guildId, world }: EventTimerLookupInput,
    timerKey: string,
  ) {
    const operation = "eventTimers.closeRespawn";

    return withLock(
      operation,
      buildTimerLockKey(guildId, world, timerKey),
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
                    code: ErrorKey.TIMER_RACE_CONDITION,
                  })
                : cause,
          }),
      ),
    );
  }
};
