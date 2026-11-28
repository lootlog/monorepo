import { makeJsonCodec } from "@lootlog/database/redis-cache-fill";
import {
  ApplicationError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import { withAdapterSpan } from "@lootlog/instrumentation/operation";
import { ContextLogger } from "@lootlog/instrumentation";
import type { RedisStore } from "#src/infrastructure/redis-store";
import { Effect } from "effect";
import type { BattleCatalog } from "#src/battles/catalog/battle-catalog";
import { BattleResponseSchemas } from "#src/battles/catalog/battle-response";
import type { DrizzleDatabase } from "#src/database/database";
import type { Battle } from "#src/database/schema";
import { decodeBattleEvents } from "#src/battles/battle-timeline";
import { parseBattleMoves } from "@lootlog/battle-processor/battle-log";
import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import type {
  BattleWithRelations,
  RawBattleData,
} from "#src/battles/battle-service";

type BattleTimelineReadDatabase = {
  query: {
    battles: Pick<DrizzleDatabase["query"]["battles"], "findFirst">;
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

export const makeBattleTimelineRead = (
  drizzle: BattleTimelineReadDatabase,
  redisService: Pick<RedisStore, "getJson" | "setJson">,
  catalog: Pick<
    BattleCatalog,
    "checkBattleAccess" | "getBattleFromDatabase" | "getPublicBattle"
  >,
) => {
  const logger = new ContextLogger("Battles");

  const loadBattleEvents = (battle: RawBattleSource) =>
    drizzle.query.battleTimelines
      .findFirst({
        where: { battleId: battle.id, userId: battle.userId },
        columns: { events: true },
      })
      .pipe(
        withAdapterSpan("Battles_getTimeline", "battlelog-infrastructure"),
        Effect.flatMap((timeline) =>
          timeline
            ? Effect.succeed(decodeBattleEvents(timeline.events))
            : Effect.fail(
                new ResourceNotFoundError(
                  `Timeline of battle ${battle.id} is no longer available`,
                ),
              ),
        ),
      );

  const loadRawBattleData = (battle: RawBattleSource) =>
    loadBattleEvents(battle).pipe(
      Effect.map((sourceEvents): RawBattleData => {
        const battleground = sourceEvents.find((event) => event.f.battleground)
          ?.f.battleground;

        return {
          battleId: battle.id,
          timestamp: battle.createdAt.toISOString(),
          rawData: {
            accountId: battle.accountId,
            characterId: battle.characterId,
            world: battle.world,
            ...(battleground && { battleground }),
            events: parseBattleMoves(sourceEvents),
            sourceEvents,
          },
        };
      }),
    );

  const buildTimelineResponse = (battle: BattleWithRelations) =>
    loadBattleEvents(battle).pipe(
      Effect.map((events) => ({
        battleId: battle.id,
        generatedAt: new Date().toISOString(),
        timeline: new BattleProcessor().processBattle({
          accountId: battle.accountId,
          characterId: battle.characterId,
          world: battle.world,
          events,
        }).battleTimeline,
        warriors: battle.warriors,
      })),
    );

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

      return yield* loadRawBattleData(battle);
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

      return yield* loadRawBattleData(battle);
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
