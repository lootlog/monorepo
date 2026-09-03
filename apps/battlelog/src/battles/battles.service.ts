import { randomUUID } from "node:crypto";
import {
  PermissionDeniedError,
  ApplicationError,
  ResourceNotFoundError,
  DependencyUnavailableError,
} from "#src/infrastructure/http-error";
import { Logger } from "#src/infrastructure/logger";
import {
  makeJsonCodec,
  type RedisStore,
} from "#src/infrastructure/redis-store";
import { and, eq, lt } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { CreateBattleInput } from "#src/battles/submission/create-battle";
import type { BattleTimelineResponseInput } from "#src/battles/catalog/battle-response";
import type { BattleListQuery } from "#src/battles/catalog/query-battles";
import type { BattleUpdate } from "#src/battles/catalog/update-battle";
import type { PaginationOptions } from "#src/battles/analytics/pagination";
import { BATTLE_WARRIOR_STATS_VERSION } from "#src/battles/statistics/battle-warrior-stats.types";
import {
  buildBattleWarriorStats,
  inflateBattleWarriorsInBattle,
  inflateBattleWarriorsInBattles,
} from "#src/battles/statistics/battle-warrior-stats";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import type { BattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import type { BattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import type { BattlePagination } from "#src/battles/analytics/pagination.service";
import type { DrizzleDatabase } from "#src/database/database";
import { battles, battleWarriors, userCharacters } from "#src/database/schema";
import type { BattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import {
  createBattleSemanticFingerprint,
  normalizeBattleSubmission,
} from "#src/battles/submission/battle-submission";
import {
  BattleProcessor,
  type Warrior,
  type BattleAnalysis,
  type ParsedMove,
  type BattleWarriorSnapshot,
} from "@lootlog/battle-processor";
import {
  decodeRawBattleDataJson,
  type BattleWithRelations,
  type CreateBattleParams,
  type CreateBattleResult,
  type RawBattleData,
} from "#src/battles/battle-service";

export interface BattleDeduplicationTiming {
  readonly cacheTtlSeconds: number;
  readonly lockRefreshIntervalMs: number;
  readonly lockTtlSeconds: number;
  readonly waitIntervalMs: number;
  readonly waitTimeoutMs: number;
}

const defaultBattleDeduplicationTiming: BattleDeduplicationTiming = {
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

const queryEffect = <A, E>(
  query: Effect.Effect<A, E> | PromiseLike<A>,
): Effect.Effect<A, E | unknown> =>
  Effect.isEffect(query)
    ? query
    : Effect.tryPromise({
        try: () => Promise.resolve(query),
        catch: (cause) => cause,
      });

const adapter = <A, E>(
  operation: string,
  run: () => Effect.Effect<A, E> | PromiseLike<A>,
) =>
  Effect.suspend(() => {
    const result = run();
    return Effect.isEffect(result)
      ? result
      : Effect.tryPromise({
          try: () => Promise.resolve(result),
          catch: (cause) => cause,
        });
  }).pipe(
    Effect.withSpan(operation, {
      attributes: { adapter: "battlelog-infrastructure", retryCount: 0 },
    }),
  );

export const makeBattles = (
  drizzle: DrizzleDatabase,
  r2Service: BattleObjectStorage,
  redisService: RedisStore,
  paginationService: BattlePagination,
  battleAnalyticsService: BattleAnalytics,
  battleListFilterService: BattleListFilter,
  battleMetadataService: BattleMetadata,
  deduplicationTiming: BattleDeduplicationTiming = defaultBattleDeduplicationTiming,
) => {
  const logger = new Logger("Battles");
  const battlesModule = {
    createBattle(params: CreateBattleParams) {
      const { data, userId } = params;
      return Effect.gen(function* () {
        const normalizedData = normalizeBattleSubmission(data);
        const semanticFingerprint = createBattleSemanticFingerprint({
          data: normalizedData,
          userId,
        });
        const analysis = battlesModule.analyzeBattle(normalizedData);

        return yield* battlesModule.runBattleCreationSingleFlight(
          semanticFingerprint,
          () =>
            battlesModule.createCanonicalBattle({
              analysis,
              data: normalizedData,
              semanticFingerprint,
              userId,
            }),
          (result) =>
            battlesModule.preserveCanonicalBattleDuration(
              result.battleId,
              analysis.duration,
              userId,
            ),
        );
      }).pipe(
        Effect.mapError((error) => {
          logger.error(`Failed to create battle for user ${userId}:`, error);
          if (error instanceof ApplicationError) return error;
          return new Error(
            `Battle creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }),
      );
    },

    createCanonicalBattle({
      analysis,
      data,
      semanticFingerprint,
      userId,
    }: {
      analysis: BattleAnalysis;
      data: CreateBattleInput;
      semanticFingerprint: string;
      userId: string;
    }) {
      return Effect.gen(function* () {
        const rawBattleData = {
          events: analysis.parsedMoves,
          sourceEvents: data.events,
          accountId: data.accountId,
          characterId: data.characterId,
          world: data.world,
        };
        const existingBattleId =
          yield* battlesModule.getRecentBattleIdBySemanticFingerprint(
            semanticFingerprint,
            userId,
          );
        if (existingBattleId) {
          yield* battlesModule.preserveCanonicalBattleDuration(
            existingBattleId,
            analysis.duration,
            userId,
          );
          yield* battlesModule.storeRawBattleData(
            existingBattleId,
            rawBattleData,
          );
          return { battleId: existingBattleId };
        }

        const battleId = (yield* battlesModule.storeBattleInDatabase(
          data,
          userId,
          analysis,
          semanticFingerprint,
        )).id;

        yield* battlesModule.storeRawBattleData(battleId, rawBattleData);
        yield* battleAnalyticsService.invalidateAnalyticsCache(userId);

        return { battleId };
      });
    },

    runBattleCreationSingleFlight(
      semanticFingerprint: string,
      createBattle: () => Effect.Effect<CreateBattleResult, unknown>,
      reconcileCachedBattle: (
        result: CreateBattleResult,
      ) => Effect.Effect<void, unknown>,
    ) {
      const cacheKey = `battle-submission:${semanticFingerprint}`;
      const lockKey = `${cacheKey}:lock`;
      const attempt = (
        deadline?: number,
      ): Effect.Effect<CreateBattleResult, unknown> =>
        Effect.gen(function* () {
          const currentTime = yield* Clock.currentTimeMillis;
          const activeDeadline =
            deadline ?? currentTime + deduplicationTiming.waitTimeoutMs;
          const cachedResult =
            yield* battlesModule.requireBattleDeduplicationRedis(() =>
              redisService.getJson(cacheKey, CreateBattleResultCodec),
            );
          if (cachedResult) {
            yield* reconcileCachedBattle(cachedResult);
            return cachedResult;
          }
          yield* battlesModule.throwIfBattleDeduplicationTimedOut(
            activeDeadline,
          );

          const lockToken = randomUUID();
          const lockAcquired =
            yield* battlesModule.requireBattleDeduplicationRedis(() =>
              redisService.setNX(
                lockKey,
                lockToken,
                deduplicationTiming.lockTtlSeconds,
              ),
            );

          if (lockAcquired) {
            return yield* battlesModule
              .runWithRenewedBattleDeduplicationLock(
                lockKey,
                lockToken,
                Effect.gen(function* () {
                  const cachedAfterLock =
                    yield* battlesModule.requireBattleDeduplicationRedis(() =>
                      redisService.getJson(cacheKey, CreateBattleResultCodec),
                    );
                  if (cachedAfterLock) {
                    yield* reconcileCachedBattle(cachedAfterLock);
                    return cachedAfterLock;
                  }

                  const result = yield* createBattle();
                  yield* battlesModule.requireBattleDeduplicationRedis(() =>
                    redisService.setJson(
                      cacheKey,
                      result,
                      deduplicationTiming.cacheTtlSeconds,
                    ),
                  );
                  return result;
                }),
              )
              .pipe(
                Effect.ensuring(
                  battlesModule.releaseBattleDeduplicationLock(
                    lockKey,
                    lockToken,
                  ),
                ),
              );
          }

          yield* Effect.sleep(`${deduplicationTiming.waitIntervalMs} millis`);
          return yield* attempt(activeDeadline);
        });
      return attempt();
    },

    runWithRenewedBattleDeduplicationLock<Result>(
      lockKey: string,
      lockToken: string,
      operation: Effect.Effect<Result, unknown>,
    ) {
      const renewal = Effect.forever(
        Effect.sleep(
          `${deduplicationTiming.lockRefreshIntervalMs} millis`,
        ).pipe(
          Effect.andThen(
            battlesModule.requireBattleDeduplicationRedis(() =>
              redisService.eval<number>(
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
    },

    preserveCanonicalBattleDuration(
      battleId: string,
      duration: number,
      userId: string,
    ) {
      if (duration <= 0) return Effect.void;

      return adapter("Battles_preserveDuration", () =>
        drizzle
          .update(battles)
          .set({ duration, updatedAt: new Date() })
          .where(and(eq(battles.id, battleId), lt(battles.duration, duration)))
          .returning({ id: battles.id }),
      ).pipe(
        Effect.flatMap((updated) =>
          updated.length > 0
            ? battleAnalyticsService.invalidateAnalyticsCache(userId)
            : Effect.void,
        ),
      );
    },

    throwIfBattleDeduplicationTimedOut(deadline: number) {
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
    },

    requireBattleDeduplicationRedis<Result>(operation: () => Promise<Result>) {
      return adapter("Battles_deduplicationRedis", operation).pipe(
        Effect.mapError(
          (error) =>
            new DependencyUnavailableError(
              "Battle deduplication is temporarily unavailable",
              { cause: error },
            ),
        ),
      );
    },

    releaseBattleDeduplicationLock(lockKey: string, lockToken: string) {
      return adapter("Battles_releaseDeduplicationLock", () =>
        redisService.eval<number>(
          RELEASE_BATTLE_DEDUPLICATION_LOCK_SCRIPT,
          [lockKey],
          [lockToken],
        ),
      ).pipe(
        Effect.asVoid,
        Effect.catch(() => Effect.void),
      );
    },

    getRecentBattleIdBySemanticFingerprint(
      semanticFingerprint: string,
      userId: string,
    ) {
      return Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          adapter("Battles_findRecentFingerprint", () =>
            drizzle.query.battles.findFirst({
              where: {
                createdAt: {
                  gte: new Date(
                    now - deduplicationTiming.cacheTtlSeconds * 1_000,
                  ),
                },
                semanticFingerprint,
                userId,
              },
              columns: { id: true },
              orderBy: { createdAt: "desc" },
            }),
          ),
        ),
        Effect.map((battle) => battle?.id ?? null),
      );
    },

    getExistingBattleBySubmissionId(submissionId: string | undefined) {
      if (!submissionId) {
        return Effect.succeed(null);
      }

      return adapter("Battles_findSubmission", () =>
        drizzle.query.battles.findFirst({
          where: { submissionId },
          with: { warriors: true },
        }),
      ).pipe(
        Effect.map((battle) =>
          battle ? inflateBattleWarriorsInBattle(battle) : null,
        ),
      );
    },

    getPublicBattles(query: BattleListQuery) {
      return Effect.gen(function* () {
        const filterBuilder =
          yield* battleListFilterService.buildFilterConditions(query);

        const paginationOptions = battlesModule.buildPaginationOptions(query);
        const result = yield* paginationService.paginateBattles(
          (table) => and(eq(table.public, true), filterBuilder(table)),
          paginationOptions,
        );

        return {
          battles: inflateBattleWarriorsInBattles(result.data),
          pagination: result.pagination,
          meta: {
            performance: result.performance,
          },
        };
      }).pipe(
        Effect.mapError((error) => {
          logger.error("Failed to retrieve public battles:", error);
          return new Error(
            `Failed to retrieve public battles: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }),
      );
    },

    getDashboardBattles(query: BattleListQuery, requestingUserId: string) {
      return Effect.gen(function* () {
        const { userId: _userId, ...filteredQuery } = query;
        const filterBuilder =
          yield* battleListFilterService.buildFilterConditions(
            filteredQuery,
            requestingUserId,
          );

        const paginationOptions = battlesModule.buildPaginationOptions(query);
        const result = yield* paginationService.paginateBattles(
          (table) =>
            and(eq(table.userId, requestingUserId), filterBuilder(table)),
          paginationOptions,
        );

        return {
          battles: inflateBattleWarriorsInBattles(result.data),
          pagination: result.pagination,
          meta: {
            performance: result.performance,
          },
        };
      }).pipe(
        Effect.mapError((error) => {
          logger.error("Failed to retrieve dashboard battles:", error);
          return new Error(
            `Failed to retrieve dashboard battles: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }),
      );
    },

    getUserCharacters(userId: string): Effect.Effect<
      {
        characters: Array<{
          id: string;
          name: string;
          world: string;
          icon: string;
        }>;
      },
      unknown
    > {
      return battleMetadataService.getUserCharacters(userId);
    },

    getUserWorlds(
      userId: string,
    ): Effect.Effect<{ worlds: string[] }, unknown> {
      return battleMetadataService.getUserWorlds(userId);
    },

    getBattleRawData(battleId: string, requestingUserId?: string) {
      return Effect.gen(function* () {
        if (requestingUserId) {
          yield* battlesModule.checkBattleAccess(battleId, requestingUserId);
        }

        const rawData = yield* adapter(
          "BattleObjectStorage_getBattleData",
          () => r2Service.getBattleData(battleId, decodeRawBattleDataJson),
        );
        return battlesModule.normalizeRawBattleData(rawData);
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            logger.error(
              `Failed to retrieve raw data for battle ${battleId}:`,
              error,
            );
          }),
        ),
      );
    },

    getBattleTimeline(battleId: string, requestingUserId?: string) {
      return battlesModule
        .getBattleFromDatabase(battleId, requestingUserId)
        .pipe(Effect.flatMap(battlesModule.buildTimelineResponse));
    },

    getPublicBattleTimeline(battleId: string) {
      return battlesModule
        .getPublicBattle(battleId)
        .pipe(Effect.flatMap(battlesModule.buildTimelineResponse));
    },

    getBattleFromDatabase(battleId: string, requestingUserId?: string) {
      return Effect.gen(function* () {
        if (requestingUserId) {
          yield* battlesModule.checkBattleAccess(battleId, requestingUserId);
        }
        const battle = yield* adapter("Battles_getFromDatabase", () =>
          drizzle.query.battles.findFirst({
            where: { id: battleId },
            with: { warriors: true },
          }),
        );

        if (!battle)
          return yield* Effect.fail(
            new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
          );

        yield* battleAnalyticsService.invalidateAnalyticsCache(battle.userId);

        return inflateBattleWarriorsInBattle(battle);
      });
    },

    buildTimelineResponse(battle: BattleWithRelations) {
      return adapter("BattleObjectStorage_getTimelineData", () =>
        r2Service.getBattleData(battle.id, decodeRawBattleDataJson),
      ).pipe(
        Effect.map((rawBattleData) => {
          const processor = new BattleProcessor();

          let analysis: BattleAnalysis;
          if (rawBattleData.rawData.sourceEvents?.length) {
            analysis = processor.processBattle({
              accountId: rawBattleData.rawData.accountId,
              characterId: rawBattleData.rawData.characterId,
              world: rawBattleData.rawData.world,
              events: rawBattleData.rawData.sourceEvents,
            });
          } else {
            analysis = processor.processParsedBattle({
              accountId: rawBattleData.rawData.accountId,
              characterId: rawBattleData.rawData.characterId,
              world: rawBattleData.rawData.world,
              events: rawBattleData.rawData.events,
              warriors: battlesModule.createWarriorSnapshots(battle),
              duration: battle.duration,
              matchmaking:
                battlesModule.createTimelineMatchmakingSnapshot(battle),
            });
          }

          return {
            battleId: battle.id,
            generatedAt: new Date().toISOString(),
            timeline: analysis.battleTimeline,
            warriors: battlesModule.normalizeTimelineWarriors(battle),
          };
        }),
      );
    },

    createTimelineMatchmakingSnapshot(
      battle: BattleWithRelations,
    ): BattleAnalysis["matchmaking"] {
      if (!battle.matchmaking) {
        return undefined;
      }

      return {
        difficultyRank: battle.difficultyRank ?? 0,
        result: battle.result ?? 0,
        ratingDelta: battle.ratingDelta ?? 0,
        opponentLvl: battle.opponentLvl ?? 0,
        opponentOplvl: battle.opponentOplvl ?? 0,
        opponentRating: battle.opponentRating ?? 0,
        rating: battle.rating ?? 0,
        status: battle.status ?? 0,
        pointsGained: battle.pointsGained ?? undefined,
        placementCur: battle.placementCur ?? undefined,
        placementMax: battle.placementMax ?? undefined,
        dailyStageId: battle.dailyStageId ?? undefined,
        dailyPointsCur: battle.dailyPointsCur ?? undefined,
        dailyPointsMax: battle.dailyPointsMax ?? undefined,
        dailyPointsStep: battle.dailyPointsStep ?? undefined,
        dailyRewardsLast: battle.dailyRewardsLast ?? undefined,
        dailyRewardsCur: battle.dailyRewardsCur ?? undefined,
        dailyRewardsMax: battle.dailyRewardsMax ?? undefined,
      };
    },

    createWarriorSnapshots(
      battle: BattleWithRelations,
    ): Record<string, BattleWarriorSnapshot> {
      return battle.warriors.reduce<Record<string, BattleWarriorSnapshot>>(
        (acc, warrior) => {
          const originalId = Number.parseInt(warrior.originalId, 10);
          acc[warrior.originalId] = {
            originalId: Number.isNaN(originalId) ? 0 : originalId,
            name: warrior.name,
            lvl: warrior.lvl,
            prof: warrior.prof,
            icon: warrior.icon,
            team: warrior.team,
          };

          return acc;
        },
        {},
      );
    },

    normalizeTimelineWarriors(
      battle: BattleWithRelations,
    ): BattleTimelineResponseInput["warriors"] {
      return battle.warriors.map((warrior) => ({
        ...warrior,
        spellsUsedMap: warrior.spellsUsedMap as Record<string, number>,
      }));
    },

    updateBattle(battleId: string, updateData: BattleUpdate) {
      return Effect.gen(function* () {
        const updated = yield* adapter("Battles_update", () =>
          drizzle
            .update(battles)
            .set({
              public: updateData.public,
              updatedAt: new Date(),
            })
            .where(eq(battles.id, battleId))
            .returning(),
        );

        if (updated.length === 0)
          return yield* Effect.fail(
            new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
          );

        const battle = yield* adapter("Battles_findUpdated", () =>
          drizzle.query.battles.findFirst({
            where: { id: battleId },
            with: { warriors: true },
          }),
        );

        if (!battle)
          return yield* Effect.fail(
            new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
          );

        return inflateBattleWarriorsInBattle(battle);
      });
    },

    deleteUserBattles(userId: string) {
      return Effect.gen(function* () {
        const userBattles = yield* adapter("Battles_findUserBattles", () =>
          drizzle
            .select({ id: battles.id })
            .from(battles)
            .where(eq(battles.userId, userId)),
        );

        const battleIds = userBattles.map((b) => b.id);

        if (battleIds.length === 0) {
          yield* adapter("Battles_deleteUserCharacters", () =>
            drizzle
              .delete(userCharacters)
              .where(eq(userCharacters.userId, userId)),
          );

          return { deletedCount: 0 };
        }

        yield* adapter("Battles_deleteUserBattles", () =>
          drizzle.delete(battles).where(eq(battles.userId, userId)),
        );

        yield* adapter("Battles_deleteUserCharacters", () =>
          drizzle
            .delete(userCharacters)
            .where(eq(userCharacters.userId, userId)),
        );

        yield* adapter("BattleObjectStorage_deleteBatch", () =>
          r2Service.deleteBattleDataBatch(battleIds),
        ).pipe(
          Effect.catch((error) => {
            logger.warn(
              `Failed to delete R2 data for user ${userId}: ${battleIds.length} battles`,
              error,
            );
            return Effect.void;
          }),
        );

        logger.log(`Deleted ${battleIds.length} battles for user ${userId}`);
        yield* battleAnalyticsService.invalidateAnalyticsCache(userId);

        return { deletedCount: battleIds.length };
      });
    },

    deleteBattle(battleId: string) {
      return Effect.gen(function* () {
        const battle = yield* adapter("Battles_findForDelete", () =>
          drizzle.query.battles.findFirst({
            where: { id: battleId },
            columns: { userId: true },
          }),
        );

        const deleted = yield* adapter("Battles_delete", () =>
          drizzle
            .delete(battles)
            .where(eq(battles.id, battleId))
            .returning({ id: battles.id }),
        );

        if (deleted.length === 0)
          return yield* Effect.fail(
            new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
          );

        if (battle) {
          yield* battleAnalyticsService.invalidateAnalyticsCache(battle.userId);
        }

        yield* adapter("BattleObjectStorage_delete", () =>
          r2Service.deleteBattleData(battleId),
        ).pipe(
          Effect.catch((error) => {
            logger.warn(
              `Failed to delete R2 data for battle ${battleId}`,
              error,
            );
            return Effect.void;
          }),
        );

        return { message: "Battle deleted successfully" };
      });
    },

    getPublicBattle(battleId: string) {
      return adapter("Battles_getPublic", () =>
        drizzle.query.battles.findFirst({
          where: { id: battleId, public: true },
          with: { warriors: true },
        }),
      ).pipe(
        Effect.flatMap((battle) => {
          if (!battle) {
            return Effect.fail(
              new ResourceNotFoundError(
                `Public battle with ID ${battleId} not found`,
              ),
            );
          }

          return Effect.succeed(inflateBattleWarriorsInBattle(battle));
        }),
      );
    },

    getPublicBattleRaw(battleId: string) {
      return Effect.gen(function* () {
        const battle = yield* adapter("Battles_getPublicRaw", () =>
          drizzle.query.battles.findFirst({
            where: { id: battleId, public: true },
            columns: { id: true },
          }),
        );

        if (!battle)
          return yield* Effect.fail(
            new ResourceNotFoundError(
              `Public battle with ID ${battleId} not found`,
            ),
          );

        const rawData = yield* adapter("BattleObjectStorage_getPublicRaw", () =>
          r2Service.getBattleData(battle.id, decodeRawBattleDataJson),
        );

        return battlesModule.normalizeRawBattleData(rawData);
      });
    },

    normalizeRawBattleData(rawBattleData: RawBattleData): RawBattleData {
      if (!rawBattleData.rawData.sourceEvents?.length) {
        return rawBattleData;
      }

      const processor = new BattleProcessor();

      return {
        ...rawBattleData,
        rawData: {
          ...rawBattleData.rawData,
          events: processor.extractAndParseMoves(
            rawBattleData.rawData.sourceEvents,
          ),
        },
      };
    },

    analyzeBattle(dto: CreateBattleInput): BattleAnalysis {
      try {
        const processor = new BattleProcessor();
        const analysis = processor.processBattle(dto);

        return analysis;
      } catch (error) {
        logger.error("Failed to analyze battle data:", error);
        throw new Error(
          `Battle analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },

    buildPaginationOptions(query: BattleListQuery): PaginationOptions {
      return {
        sortOrder: query.sortOrder ?? "desc",
        includeTotal: query.includeTotal ?? false,
        cursor: query.cursor,
        size: query.size,
      };
    },

    checkBattleAccess(battleId: string, requestingUserId: string) {
      return adapter("Battles_checkAccess", () =>
        drizzle.query.battles.findFirst({
          where: { id: battleId },
          columns: { userId: true, public: true },
        }),
      ).pipe(
        Effect.flatMap((battle) => {
          if (!battle) {
            return Effect.fail(
              new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
            );
          }

          if (!battle.public && battle.userId !== requestingUserId) {
            return Effect.fail(
              new PermissionDeniedError("Access denied: Battle is private"),
            );
          }
          return Effect.void;
        }),
      );
    },

    assertBattleOwner(battleId: string, requestingUserId: string) {
      return adapter("Battles_assertOwner", () =>
        drizzle.query.battles.findFirst({
          where: { id: battleId },
          columns: { userId: true },
        }),
      ).pipe(
        Effect.flatMap((battle) => {
          if (!battle) {
            return Effect.fail(
              new ResourceNotFoundError(`Battle with ID ${battleId} not found`),
            );
          }

          if (battle.userId !== requestingUserId) {
            return Effect.fail(
              new PermissionDeniedError("You can only modify your own battles"),
            );
          }
          return Effect.void;
        }),
      );
    },

    storeBattleInDatabase(
      data: CreateBattleInput,
      userId: string,
      analysis: BattleAnalysis,
      semanticFingerprint: string,
    ) {
      const store = Effect.gen(function* () {
        const userWarrior = analysis.warriors.find(
          (w) => w.originalId === data.characterId,
        );
        if (userWarrior) {
          yield* battleMetadataService.upsertUserCharacter({
            userId,
            characterId: data.characterId,
            name: userWarrior.name,
            world: data.world,
            icon: userWarrior.icon,
          });
        }

        const battle = yield* adapter("Battles_storeTransaction", () =>
          drizzle.transaction((tx) =>
            Effect.gen(function* () {
              const [insertedBattle] = yield* queryEffect(
                tx
                  .insert(battles)
                  .values({
                    userId,
                    updatedAt: new Date(yield* Clock.currentTimeMillis),
                    accountId: data.accountId,
                    characterId: data.characterId,
                    semanticFingerprint,
                    ...(data.submissionId && {
                      submissionId: data.submissionId,
                    }),
                    world: data.world,
                    duration: analysis.duration,
                    type: analysis.type,
                    winner: analysis.outcome.winner,
                    loser: analysis.outcome.loser,
                    winningTeam: analysis.outcome.winningTeam!,
                    losingTeam: analysis.outcome.losingTeam!,
                    hasFlee: analysis.outcome.hasFlee,
                    matchmaking: !!analysis.matchmaking,
                    statistics: analysis.statistics,
                    ...(analysis.matchmaking && {
                      difficultyRank: analysis.matchmaking.difficultyRank,
                      result: analysis.matchmaking.result,
                      ratingDelta: analysis.matchmaking.ratingDelta,
                      opponentLvl: analysis.matchmaking.opponentLvl,
                      opponentOplvl: analysis.matchmaking.opponentOplvl,
                      opponentRating: analysis.matchmaking.opponentRating,
                      rating: analysis.matchmaking.rating,
                      status: analysis.matchmaking.status,
                      pointsGained: analysis.matchmaking.pointsGained,
                      placementCur: analysis.matchmaking.placementCur,
                      placementMax: analysis.matchmaking.placementMax,
                      dailyStageId: analysis.matchmaking.dailyStageId,
                      dailyPointsCur: analysis.matchmaking.dailyPointsCur,
                      dailyPointsMax: analysis.matchmaking.dailyPointsMax,
                      dailyPointsStep: analysis.matchmaking.dailyPointsStep,
                      dailyRewardsLast: analysis.matchmaking.dailyRewardsLast,
                      dailyRewardsCur: analysis.matchmaking.dailyRewardsCur,
                      dailyRewardsMax: analysis.matchmaking.dailyRewardsMax,
                    }),
                  })
                  .returning(),
              );

              if (!insertedBattle) {
                return yield* Effect.fail(
                  new Error("Battle insert did not return a row"),
                );
              }

              const warriorValues = analysis.warriors.map(
                (warrior: Warrior) => ({
                  battleId: insertedBattle.id,
                  originalId: warrior.originalId,
                  name: warrior.name,
                  lvl: warrior.lvl,
                  prof: warrior.prof,
                  icon: warrior.icon,
                  team: warrior.team,
                  isDead: warrior.isDead,
                  surrendered: warrior.surrendered,
                  fled: warrior.fled,
                  maxHp: warrior.maxHp,
                  turns: warrior.turns,
                  turnsLost: warrior.turnsLost,
                  steps: warrior.steps,
                  normalAttacks: warrior.normalAttacks,
                  spellsUsed: warrior.spellsUsed,
                  spellsUsedMap: warrior.spellsUsedMap,
                  stats: buildBattleWarriorStats(warrior),
                  statsVersion: BATTLE_WARRIOR_STATS_VERSION,
                  damageDealt: warrior.damageDealt,
                  distanceDamage: warrior.distanceDamage,
                  meleeDamage: warrior.meleeDamage,
                  auxiliaryDamage: warrior.auxiliaryDamage,
                  fireDamage: warrior.fireDamage,
                  frostDamage: warrior.frostDamage,
                  lightningDamage: warrior.lightningDamage,
                  thirdAttDamage: warrior.thirdAttDamage,
                  damageDealtAfterDefensive: warrior.damageDealtAfterDefensive,
                  damageDealtAfterDefensivePercentage:
                    warrior.damageDealtAfterDefensivePercentage,
                  damageTaken: warrior.damageTaken,
                  distanceDamageTaken: warrior.distanceDamageTaken,
                  meleeDamageTaken: warrior.meleeDamageTaken,
                  auxiliaryDamageTaken: warrior.auxiliaryDamageTaken,
                  fireDamageTaken: warrior.fireDamageTaken,
                  frostDamageTaken: warrior.frostDamageTaken,
                  lightningDamageTaken: warrior.lightningDamageTaken,
                  thirdAttDamageTaken: warrior.thirdAttDamageTaken,
                  flatDamageTaken: warrior.flatDamageTaken,
                  rageDamageDealt: warrior.rageDamageDealt,
                  trueDamageDealt: warrior.trueDamageDealt,
                  trueDamageTaken: warrior.trueDamageTaken,
                  stigmaDamageDealt: warrior.stigmaDamageDealt,
                  stigmaDamageTaken: warrior.stigmaDamageTaken,
                  passiveHealing: warrior.passiveHealing,
                  activeHealing: warrior.activeHealing,
                  armorPierces: warrior.armorPierces,
                  criticalHits: warrior.criticalHits,
                  reducedArmor: warrior.reducedArmor,
                  reducedPoisonResistance: warrior.reducedPoisonResistance,
                  magicResistanceDestroyed: warrior.magicResistanceDestroyed,
                  evasions: warrior.evasions,
                  attacksEvaded: warrior.attacksEvaded,
                  counters: warrior.counters,
                  fastArrows: warrior.fastArrows,
                  blocks: warrior.blocks,
                  attacksBlocked: warrior.attacksBlocked,
                  blockedDamage: warrior.blockedDamage,
                  woundDamageTaken: warrior.woundDamageTaken,
                  poisonDamageTaken: warrior.poisonDamageTaken,
                  injureDamageTaken: warrior.injureDamageTaken,
                  injures: warrior.injures,
                  critWoundDamageTaken: warrior.critWoundDamageTaken,
                  firePassiveDamageTaken: warrior.firePassiveDamageTaken,
                  lightningPassiveDamageTaken:
                    warrior.lightningPassiveDamageTaken,
                  destroyedEnergy: warrior.destroyedEnergy,
                  destroyedMana: warrior.destroyedMana,
                  regeneratedEnergy: warrior.regeneratedEnergy,
                  regeneratedMana: warrior.regeneratedMana,
                  reflectedDamage: warrior.reflectedDamage,
                  reflectedDamageTaken: warrior.reflectedDamageTaken,
                  legbonCurse: warrior.legbonCurse,
                  legbonCleanse: warrior.legbonCleanse,
                  legbonLastheal: warrior.legbonLastheal,
                  legbonLasthealValue: warrior.legbonLasthealValue,
                  legbonGlare: warrior.legbonGlare,
                  legbonHolytouch: warrior.legbonHolytouch,
                  legbonHolytouchValue: warrior.legbonHolytouchValue,
                  legbonCritredValue: warrior.legbonCritredValue,
                  legbonVerycrit: warrior.legbonVerycrit,
                  legbonAnguish: warrior.legbonAnguish,
                  legbonFacadeValue: warrior.legbonFacadeValue,
                  legbonPunctureValue: warrior.legbonPunctureValue,
                  legbons: warrior.legbons,
                  legbonAnguishDamageTaken: warrior.legbonAnguishDamageTaken,
                  ph: warrior.ph,
                }),
              );

              const insertedWarriors = yield* queryEffect(
                tx.insert(battleWarriors).values(warriorValues).returning(),
              );

              return { ...insertedBattle, warriors: insertedWarriors };
            }),
          ),
        );

        return inflateBattleWarriorsInBattle(battle);
      });
      return store.pipe(
        Effect.catch((error) =>
          Effect.gen(function* () {
            const existingBattle =
              yield* battlesModule.getExistingBattleBySubmissionId(
                data.submissionId,
              );

            if (existingBattle) {
              return existingBattle;
            }

            logger.error("Failed to store battle in database:", error);
            return yield* Effect.fail(
              new Error(
                `Database storage failed: ${error instanceof Error ? error.message : "Unknown error"}`,
              ),
            );
          }),
        ),
      );
    },

    storeRawBattleData(
      battleId: string,
      data: Omit<CreateBattleInput, "events"> & {
        events: ParsedMove[];
        sourceEvents?: CreateBattleInput["events"];
      },
    ) {
      return Effect.suspend(() => {
        const rawBattleData: RawBattleData = {
          battleId,
          timestamp: new Date().toISOString(),
          rawData: data,
        };

        return adapter("BattleObjectStorage_upload", () =>
          r2Service.uploadBattleData(battleId, rawBattleData),
        );
      }).pipe(
        Effect.mapError((error) => {
          logger.error(
            `Failed to store raw battle data for ${battleId}:`,
            error,
          );
          return new Error(
            `R2 storage failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
        }),
      );
    },

    searchWarriors(
      query: string,
      userId: string,
    ): Effect.Effect<
      {
        warriors: Array<{
          name: string;
          icon: string;
          prof: string;
          lvl: number;
        }>;
      },
      unknown
    > {
      return battleMetadataService.searchWarriors(query, userId);
    },
  };

  return battlesModule;
};

type BattlesModule = ReturnType<typeof makeBattles>;

export type Battles = Pick<
  BattlesModule,
  | "assertBattleOwner"
  | "createBattle"
  | "deleteBattle"
  | "deleteUserBattles"
  | "getBattleFromDatabase"
  | "getBattleRawData"
  | "getBattleTimeline"
  | "getDashboardBattles"
  | "getPublicBattle"
  | "getPublicBattleRaw"
  | "getPublicBattles"
  | "getPublicBattleTimeline"
  | "getUserCharacters"
  | "getUserWorlds"
  | "searchWarriors"
  | "updateBattle"
>;
