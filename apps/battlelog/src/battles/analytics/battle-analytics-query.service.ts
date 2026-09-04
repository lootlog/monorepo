import { ResourceNotFoundError } from "#src/infrastructure/http-error";
import {
  and,
  eq,
  exists,
  gt,
  gte,
  inArray,
  isNotNull,
  lte,
  notInArray,
  sql,
  desc,
  type SQL,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { BattleAnalyticsCache } from "#src/battles/analytics/battle-analytics-cache.service";
import type {
  AnalyticsDateRange,
  DateRangeQuery,
} from "#src/battles/analytics/battle-analytics.types";
import type { DrizzleDatabase } from "#src/database/database";
import { battleWarriors, battles } from "#src/database/schema";

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
      userId,
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

  const summarySource = (
    userId: string,
    query: DateRangeQuery & {
      world?: string;
      matchmaking?: boolean;
      ph?: boolean;
      minLevel?: number;
      maxLevel?: number;
    },
    characterIds: string[],
    hasFlee?: boolean,
  ) => {
    // Select one participant, matching the existing first-user/first-opponent semantics.
    const user = drizzle
      .select({ team: battleWarriors.team, ph: battleWarriors.ph })
      .from(battleWarriors)
      .where(
        and(
          eq(battleWarriors.battleId, battles.id),
          inArray(battleWarriors.originalId, characterIds),
        ),
      )
      .limit(1)
      .as("analytics_user");
    const opponent = drizzle
      .select({ prof: battleWarriors.prof, lvl: battleWarriors.lvl })
      .from(battleWarriors)
      .where(
        and(
          eq(battleWarriors.battleId, battles.id),
          notInArray(battleWarriors.originalId, characterIds),
        ),
      )
      .limit(1)
      .as("analytics_opponent");
    const where = and(
      buildAnalyticsWhere(battles, {
        userId,
        ...getDateRangeFilter(query),
        world: query.world,
        matchmaking: query.matchmaking,
        phFilter: query.ph,
        characterIds,
        hasFlee,
      }),
      query.minLevel !== undefined
        ? gte(opponent.lvl, query.minLevel)
        : undefined,
      query.maxLevel !== undefined
        ? lte(opponent.lvl, query.maxLevel)
        : undefined,
    );
    return { user, opponent, where };
  };

  const getBattleSummary = Effect.fnUntraced(function* (
    userId: string,
    query: Parameters<typeof summarySource>[1],
    characterIds: string[],
  ) {
    const { user, opponent, where } = summarySource(
      userId,
      query,
      characterIds,
    );
    const [result] = yield* drizzle
      .select({
        wins: sql<number>`count(*) filter (where not ${battles.hasFlee} and ${user.team} = ${battles.winningTeam})`.mapWith(
          Number,
        ),
        losses:
          sql<number>`count(*) filter (where not ${battles.hasFlee} and ${user.team} <> ${battles.winningTeam} and ${user.team} = ${battles.losingTeam})`.mapWith(
            Number,
          ),
        totalPH: sql<number>`coalesce(sum(${user.ph}), 0)`.mapWith(Number),
      })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .leftJoinLateral(opponent, sql`true`)
      .where(where);
    const wins = result?.wins ?? 0;
    const losses = result?.losses ?? 0;
    const totalBattles = wins + losses;
    return {
      wins,
      losses,
      totalBattles,
      totalPH: result?.totalPH ?? 0,
      winRatio:
        totalBattles > 0 ? Math.round((wins / totalBattles) * 10000) / 100 : 0,
    };
  });

  const getProfessionWinRate = Effect.fnUntraced(function* (
    userId: string,
    query: Parameters<typeof summarySource>[1],
    characterIds: string[],
  ) {
    const { user, opponent, where } = summarySource(
      userId,
      query,
      characterIds,
      false,
    );
    const wins =
      sql<number>`count(*) filter (where ${user.team} = ${battles.winningTeam})`.mapWith(
        Number,
      );
    const losses =
      sql<number>`count(*) filter (where ${user.team} <> ${battles.winningTeam} and ${user.team} = ${battles.losingTeam})`.mapWith(
        Number,
      );
    const rows = yield* drizzle
      .select({ prof: opponent.prof, wins, losses })
      .from(battles)
      .innerJoinLateral(user, sql`true`)
      .innerJoinLateral(opponent, sql`true`)
      .where(where)
      .groupBy(opponent.prof)
      .orderBy(desc(sql`${wins} + ${losses}`));
    return rows.map(({ prof, wins, losses }) => {
      const totalBattles = wins + losses;
      return {
        prof,
        wins,
        losses,
        totalBattles,
        winRate:
          totalBattles > 0
            ? Math.round((wins / totalBattles) * 10000) / 100
            : 0,
      };
    });
  });

  return {
    getBattleSummary,
    getProfessionWinRate,
    buildAnalyticsWhere,
    buildCombatProfileWhere,
    getCharacterIds,
    getDateRangeFilter,
    warriorExists,
  };
};

export type BattleAnalyticsQuery = ReturnType<typeof makeBattleAnalyticsQuery>;
