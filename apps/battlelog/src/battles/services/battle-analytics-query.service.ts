import { ResourceNotFoundError } from "#src/platform/http-error";
import {
  and,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  lte,
  type SQL,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { BattleAnalyticsCache } from "#src/battles/services/battle-analytics-cache.service";
import type {
  AnalyticsDateRange,
  DateRangeQuery,
} from "#src/battles/services/battle-analytics.types";
import type { DrizzleDatabase } from "#src/shared/modules/drizzle/drizzle.service";
import {
  battleWarriors,
  type battles,
} from "#src/shared/modules/drizzle/schema";

const DAY_MS = 24 * 60 * 60 * 1000;
const decodeCharacterIdsJson = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.mutable(Schema.Array(Schema.String))),
);

export const makeBattleAnalyticsQuery = (
  drizzle: DrizzleDatabase,
  cache: BattleAnalyticsCache,
) => {
  const warriorExists = (
    battlesRef: typeof battles,
    ...conditions: (SQL | undefined)[]
  ) =>
    exists(
      drizzle
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );

  const getCharacterIdsUncached = (
    userId: string,
    query: { characterId?: string; world?: string },
  ) =>
    Effect.gen(function* () {
      if (query.characterId) {
        const userCharacter = yield* drizzle.query.userCharacters.findFirst({
          where: {
            userId,
            characterId: query.characterId,
            ...(query.world && { world: query.world }),
          },
        });

        if (!userCharacter)
          return yield* Effect.fail(
            new ResourceNotFoundError(
              `Character ${query.characterId} not found for user`,
            ),
          );

        return [query.characterId];
      }

      const userChars = yield* drizzle.query.userCharacters.findMany({
        where: {
          userId,
          ...(query.world && { world: query.world }),
        },
        columns: { characterId: true },
      });

      return userChars.map((character) => character.characterId);
    }).pipe(
      Effect.withSpan("BattleAnalyticsQuery_getCharacterIds", {
        attributes: { adapter: "drizzle", retryCount: 0 },
      }),
    );

  const getDateFilter = (period?: string): Date | undefined => {
    if (!period || period === "all") {
      return undefined;
    }

    const periodDays: Record<string, number> = {
      "24h": 1,
      "3d": 3,
      "7d": 7,
      "14d": 14,
      "30d": 30,
      "90d": 90,
      "180d": 180,
    };

    const days = periodDays[period];
    return days === undefined
      ? undefined
      : new Date(Date.now() - days * DAY_MS);
  };

  const getCharacterIds = (
    userId: string,
    query: { characterId?: string; world?: string },
  ) =>
    cache.getOrSetJson(
      cache.buildQueryCacheKey("battle-characters", "ids", userId, query),
      () => getCharacterIdsUncached(userId, query),
      decodeCharacterIdsJson,
    );

  const getDateRangeFilter = (query: DateRangeQuery): AnalyticsDateRange => {
    if (query.startDate || query.endDate) {
      return {
        ...(query.startDate ? { startDate: new Date(query.startDate) } : {}),
        ...(query.endDate ? { endDate: new Date(query.endDate) } : {}),
      };
    }

    return {
      startDate: getDateFilter(query.period),
    };
  };

  const buildAnalyticsWhere = (
    battlesRef: typeof battles,
    params: {
      userId: string;
      world?: string;
      startDate?: Date;
      endDate?: Date;
      matchmaking?: boolean;
      characterIds: string[];
      phFilter?: boolean;
      hasFlee?: boolean;
      ratingNotNull?: boolean;
      ratingDeltaNotNull?: boolean;
    },
  ): SQL | undefined => {
    const conditions: (SQL | undefined)[] = [
      eq(battlesRef.userId, params.userId),
      eq(battlesRef.type, "1v1"),
      ...(params.world ? [eq(battlesRef.world, params.world)] : []),
      ...(params.startDate
        ? [gte(battlesRef.createdAt, params.startDate)]
        : []),
      ...(params.endDate ? [lte(battlesRef.createdAt, params.endDate)] : []),
      ...(params.matchmaking !== undefined
        ? [eq(battlesRef.matchmaking, params.matchmaking)]
        : []),
      ...(params.hasFlee !== undefined
        ? [eq(battlesRef.hasFlee, params.hasFlee)]
        : []),
      ...(params.ratingNotNull ? [isNotNull(battlesRef.rating)] : []),
      ...(params.ratingDeltaNotNull ? [isNotNull(battlesRef.ratingDelta)] : []),
    ];

    const warriorConditions: (SQL | undefined)[] = [
      inArray(battleWarriors.originalId, params.characterIds),
      ...(params.phFilter ? [gt(battleWarriors.ph, 0)] : []),
    ];

    conditions.push(warriorExists(battlesRef, ...warriorConditions));

    return and(...conditions);
  };

  const buildCombatProfileWhere = (
    battlesRef: typeof battles,
    params: {
      userId: string;
      world?: string;
      startDate?: Date;
      endDate?: Date;
      matchmaking?: boolean;
      characterIds: string[];
      phFilter?: boolean;
    },
  ): SQL | undefined => {
    const conditions: (SQL | undefined)[] = [
      eq(battlesRef.userId, params.userId),
      ...(params.world ? [eq(battlesRef.world, params.world)] : []),
      ...(params.startDate
        ? [gte(battlesRef.createdAt, params.startDate)]
        : []),
      ...(params.endDate ? [lte(battlesRef.createdAt, params.endDate)] : []),
      ...(params.matchmaking !== undefined
        ? [eq(battlesRef.matchmaking, params.matchmaking)]
        : []),
    ];

    const warriorConditions: (SQL | undefined)[] = [
      inArray(battleWarriors.originalId, params.characterIds),
      ...(params.phFilter ? [gt(battleWarriors.ph, 0)] : []),
    ];

    conditions.push(warriorExists(battlesRef, ...warriorConditions));

    return and(...conditions);
  };

  return {
    buildAnalyticsWhere,
    buildCombatProfileWhere,
    getCharacterIds,
    getDateRangeFilter,
    warriorExists,
  };
};

export type BattleAnalyticsQuery = ReturnType<typeof makeBattleAnalyticsQuery>;
