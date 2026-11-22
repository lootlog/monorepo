import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import {
  ApplicationError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ContextLogger } from "@lootlog/instrumentation";
import { type RedisStore } from "#src/infrastructure/redis-store";
import { Effect } from "effect";
import type { BattleCatalog } from "#src/battles/catalog/battle-catalog";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import type { DrizzleDatabase } from "#src/database/database";
import type { Battle } from "#src/database/schema";
import { decodeBattleEvents } from "#src/battles/battle-timeline";
import type { BattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import {
  parseBattleMoves,
  type BattleWarriorSnapshot,
} from "@lootlog/battle-processor/battle-log";
import {
  BattleProcessor,
  type BattleAnalysis,
} from "@lootlog/battle-processor/battle-processor";
import {
  decodeRawBattleDataJson,
  type BattleWithRelations,
  type RawBattleData,
} from "#src/battles/battle-service";

type BattleTimelineReadDatabase = {
  query: {
    battles: Pick<DrizzleDatabase["query"]["battles"], "findFirst">;
    battleLegacyIds: Pick<
      DrizzleDatabase["query"]["battleLegacyIds"],
      "findFirst"
    >;
    battleTimelines: Pick<
      DrizzleDatabase["query"]["battleTimelines"],
      "findFirst"
    >;
  };
};

const BattleTimelineCodec = makeJsonCodec(BattleResponseSchemas.timeline);

const BATTLE_TIMELINE_CACHE_TTL_SECONDS = 300;

const BATTLE_TIMELINE_MAX_CACHE_BYTES = 1024 * 1024;

type RawBattleSource = Pick<
  Battle,
  "id" | "userId" | "accountId" | "characterId" | "world" | "createdAt"
>;

const rawBattleSourceColumns = {
  id: true,
  userId: true,
  accountId: true,
  characterId: true,
  world: true,
  createdAt: true,
} as const;

const normalizeRawBattleData = (
  rawBattleData: RawBattleData,
): RawBattleData => {
  if (!rawBattleData.rawData.sourceEvents?.length) {
    return rawBattleData;
  }

  return {
    ...rawBattleData,
    rawData: {
      ...rawBattleData.rawData,
      events: parseBattleMoves(rawBattleData.rawData.sourceEvents),
    },
  };
};

const createTimelineMatchmakingSnapshot = (
  battle: BattleWithRelations,
): BattleAnalysis["matchmaking"] => {
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
};

const createWarriorSnapshots = (
  battle: BattleWithRelations,
): Record<string, BattleWarriorSnapshot> => {
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
};

/** Reads a battle's submitted events and the timeline derived from them. */
export const makeBattleTimelineRead = (
  drizzle: BattleTimelineReadDatabase,
  r2Service: Pick<BattleObjectStorage, "getBattleData">,
  redisService: Pick<RedisStore, "getJson" | "setJson">,
  catalog: Pick<
    BattleCatalog,
    "checkBattleAccess" | "getBattleFromDatabase" | "getPublicBattle"
  >,
) => {
  const logger = new ContextLogger("Battles");

  /** R2 keeps timelines of battles saved before UUIDv7 IDs under their legacy ID. */
  const getBattleObjectId = (battleId: string) => {
    return drizzle.query.battleLegacyIds
      .findFirst({
        where: { battleId },
        columns: { legacyId: true },
      })
      .pipe(
        withAdapterSpan("Battles_getObjectId", "battlelog-infrastructure"),
        Effect.map((legacy) => legacy?.legacyId ?? battleId),
      );
  };

  /**
   * Battles saved since timelines moved to Postgres keep their submitted
   * events there. Older battles keep theirs in R2 under their object ID.
   */
  const loadRawBattleData = (battle: RawBattleSource) => {
    return drizzle.query.battleTimelines
      .findFirst({
        where: { battleId: battle.id, userId: battle.userId },
        columns: { events: true },
      })
      .pipe(
        withAdapterSpan("Battles_getTimeline", "battlelog-infrastructure"),
        Effect.flatMap((timeline) =>
          timeline
            ? Effect.succeed<RawBattleData>({
                battleId: battle.id,
                timestamp: battle.createdAt.toISOString(),
                rawData: {
                  accountId: battle.accountId,
                  characterId: battle.characterId,
                  world: battle.world,
                  events: [],
                  sourceEvents: decodeBattleEvents(timeline.events),
                },
              })
            : getBattleObjectId(battle.id).pipe(
                Effect.flatMap((objectId) =>
                  r2Service
                    .getBattleData(objectId, decodeRawBattleDataJson)
                    .pipe(
                      withAdapterSpan(
                        "BattleObjectStorage_getBattleData",
                        "battlelog-infrastructure",
                      ),
                    ),
                ),
              ),
        ),
      );
  };

  const buildTimelineResponse = (battle: BattleWithRelations) => {
    return loadRawBattleData(battle).pipe(
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
            warriors: createWarriorSnapshots(battle),
            duration: battle.duration,
            matchmaking: createTimelineMatchmakingSnapshot(battle),
          });
        }

        return {
          battleId: battle.id,
          generatedAt: new Date().toISOString(),
          timeline: analysis.battleTimeline,
          warriors: battle.warriors,
        };
      }),
    );
  };

  const getCachedTimelineResponse = (battle: BattleWithRelations) => {
    return Effect.gen(function* () {
      const cacheKey = `battle-timeline:v1:${battle.userId}:${battle.id}:${battle.updatedAt.getTime()}`;

      const cached = yield* redisService
        .getJson(cacheKey, BattleTimelineCodec)
        .pipe(
          withAdapterSpan(
            "Battles_getCachedTimeline",
            "battlelog-infrastructure",
          ),
          Effect.orElseSucceed(() => null),
        );

      if (cached) return cached;

      const response = yield* buildTimelineResponse(battle);

      if (
        Buffer.byteLength(JSON.stringify(response), "utf8") <=
        BATTLE_TIMELINE_MAX_CACHE_BYTES
      ) {
        yield* redisService
          .setJson(cacheKey, response, BATTLE_TIMELINE_CACHE_TTL_SECONDS)
          .pipe(
            withAdapterSpan(
              "Battles_cacheTimeline",
              "battlelog-infrastructure",
            ),
            Effect.ignore,
          );
      }

      return response;
    });
  };

  const getBattleRawData = (battleId: string, requestingUserId?: string) => {
    return Effect.gen(function* () {
      if (requestingUserId) {
        yield* catalog.checkBattleAccess(battleId, requestingUserId);
      }

      const battle = yield* drizzle.query.battles
        .findFirst({
          where: { id: battleId },
          columns: rawBattleSourceColumns,
        })
        .pipe(
          withAdapterSpan("Battles_getRawSource", "battlelog-infrastructure"),
        );

      if (!battle)
        return yield* new ResourceNotFoundError(
          `Battle with ID ${battleId} not found`,
        );

      return normalizeRawBattleData(yield* loadRawBattleData(battle));
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          if (error instanceof ApplicationError) return;

          logger.error(
            `Failed to retrieve raw data for battle ${battleId}:`,
            error,
          );
        }),
      ),
    );
  };

  const getPublicBattleRaw = (battleId: string) => {
    return Effect.gen(function* () {
      const battle = yield* drizzle.query.battles
        .findFirst({
          where: { id: battleId, public: true },
          columns: rawBattleSourceColumns,
        })
        .pipe(
          withAdapterSpan("Battles_getPublicRaw", "battlelog-infrastructure"),
        );

      if (!battle)
        return yield* new ResourceNotFoundError(
          `Public battle with ID ${battleId} not found`,
        );

      return normalizeRawBattleData(yield* loadRawBattleData(battle));
    });
  };

  const getBattleTimeline = (battleId: string, requestingUserId?: string) => {
    return catalog
      .getBattleFromDatabase(battleId, requestingUserId)
      .pipe(Effect.flatMap(getCachedTimelineResponse));
  };

  const getPublicBattleTimeline = (battleId: string) => {
    return catalog
      .getPublicBattle(battleId)
      .pipe(Effect.flatMap(getCachedTimelineResponse));
  };

  return {
    getBattleRawData,
    getBattleTimeline,
    getPublicBattleRaw,
    getPublicBattleTimeline,
  };
};
