import { randomUUID } from "node:crypto";
import { DependencyUnavailableError } from "#src/infrastructure/http-error";
import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import {
  makeJsonCodec,
  type RedisStore,
} from "#src/infrastructure/redis-store";
import { Clock, Effect, Schema } from "effect";
import type { CreateBattleResult } from "#src/battles/battle-service";

export interface BattleDeduplicationTiming {
  readonly cacheTtlSeconds: number;
  readonly lockRefreshIntervalMs: number;
  readonly lockTtlSeconds: number;
  readonly waitIntervalMs: number;
  readonly waitTimeoutMs: number;
}

export const defaultBattleDeduplicationTiming: BattleDeduplicationTiming = {
  cacheTtlSeconds: 10,
  lockRefreshIntervalMs: 10_000,
  lockTtlSeconds: 30,
  waitIntervalMs: 50,
  waitTimeoutMs: 30_000,
};

const CreateBattleResultCodec = makeJsonCodec(
  Schema.Struct({ battleId: Schema.String }),
);

const EXTEND_BATTLE_DEDUPLICATION_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("expire", KEYS[1], ARGV[2])
end
return 0
`;

const RELEASE_BATTLE_DEDUPLICATION_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export type BattleDeduplicationStore = Pick<
  RedisStore,
  "getJson" | "setJson" | "setNX" | "evalScript"
>;

/** Lets one of several concurrent submissions of a battle create it; the others reuse its result. */
export const makeBattleDeduplication = (
  redisService: BattleDeduplicationStore,
  deduplicationTiming: BattleDeduplicationTiming,
) => {
  const requireBattleDeduplicationRedis = <Result, E>(
    operation: Effect.Effect<Result, E>,
  ) => {
    return operation.pipe(
      withAdapterSpan("Battles_deduplicationRedis", "battlelog-infrastructure"),
      Effect.mapError(
        (error) =>
          new DependencyUnavailableError(
            "Battle deduplication is temporarily unavailable",
            { cause: error },
          ),
      ),
    );
  };

  const throwIfBattleDeduplicationTimedOut = (deadline: number) => {
    return Clock.currentTimeMillis.pipe(
      Effect.flatMap((now) =>
        now >= deadline
          ? Effect.fail(
              new DependencyUnavailableError(
                "Battle deduplication timed out; retry the request",
              ),
            )
          : Effect.void,
      ),
    );
  };

  const releaseBattleDeduplicationLock = (
    lockKey: string,
    lockToken: string,
  ) => {
    return redisService
      .evalScript<number>(
        RELEASE_BATTLE_DEDUPLICATION_LOCK_SCRIPT,
        [lockKey],
        [lockToken],
      )
      .pipe(
        withAdapterSpan(
          "Battles_releaseDeduplicationLock",
          "battlelog-infrastructure",
        ),
        Effect.asVoid,
        Effect.catch(() => Effect.void),
      );
  };

  const runWithRenewedBattleDeduplicationLock = <Result>(
    lockKey: string,
    lockToken: string,
    operation: Effect.Effect<Result, unknown>,
  ) => {
    const renewal = Effect.forever(
      Effect.sleep(`${deduplicationTiming.lockRefreshIntervalMs} millis`).pipe(
        Effect.andThen(
          requireBattleDeduplicationRedis(
            redisService.evalScript<number>(
              EXTEND_BATTLE_DEDUPLICATION_LOCK_SCRIPT,
              [lockKey],
              [lockToken, deduplicationTiming.lockTtlSeconds],
            ),
          ),
        ),
        Effect.flatMap((extended) => {
          if (extended !== 1) {
            return Effect.fail(
              new DependencyUnavailableError(
                "Battle deduplication lock was lost; retry the request",
              ),
            );
          }

          return Effect.void;
        }),
      ),
    );

    return Effect.raceFirst(Effect.uninterruptible(operation), renewal);
  };

  const runBattleCreationSingleFlight = (
    semanticFingerprint: string,
    createBattle: () => Effect.Effect<CreateBattleResult, unknown>,
    reconcileCachedBattle: (
      result: CreateBattleResult,
    ) => Effect.Effect<void, unknown>,
  ) => {
    const cacheKey = `battle-submission:${semanticFingerprint}`;
    const lockKey = `${cacheKey}:lock`;

    const attempt = (
      deadline?: number,
    ): Effect.Effect<CreateBattleResult, unknown> =>
      Effect.gen(function* () {
        const currentTime = yield* Clock.currentTimeMillis;

        const activeDeadline =
          deadline ?? currentTime + deduplicationTiming.waitTimeoutMs;

        const cachedResult = yield* requireBattleDeduplicationRedis(
          redisService.getJson(cacheKey, CreateBattleResultCodec),
        );

        if (cachedResult) {
          yield* reconcileCachedBattle(cachedResult);

          return cachedResult;
        }

        yield* throwIfBattleDeduplicationTimedOut(activeDeadline);

        const lockToken = randomUUID();

        const lockAcquired = yield* requireBattleDeduplicationRedis(
          redisService.setNX(
            lockKey,
            lockToken,
            deduplicationTiming.lockTtlSeconds,
          ),
        );

        if (lockAcquired) {
          return yield* runWithRenewedBattleDeduplicationLock(
            lockKey,
            lockToken,
            Effect.gen(function* () {
              const cachedAfterLock = yield* requireBattleDeduplicationRedis(
                redisService.getJson(cacheKey, CreateBattleResultCodec),
              );

              if (cachedAfterLock) {
                yield* reconcileCachedBattle(cachedAfterLock);

                return cachedAfterLock;
              }

              const result = yield* createBattle();
              yield* requireBattleDeduplicationRedis(
                redisService.setJson(
                  cacheKey,
                  result,
                  deduplicationTiming.cacheTtlSeconds,
                ),
              );

              return result;
            }),
          ).pipe(
            Effect.ensuring(releaseBattleDeduplicationLock(lockKey, lockToken)),
          );
        }

        yield* Effect.sleep(`${deduplicationTiming.waitIntervalMs} millis`);

        return yield* attempt(activeDeadline);
      });

    return attempt();
  };

  return { runBattleCreationSingleFlight };
};

export type BattleDeduplication = ReturnType<typeof makeBattleDeduplication>;
