import { Injectable, NotFoundException } from "@nestjs/common";
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
import { BattleAnalyticsCacheService } from "src/battles/services/battle-analytics-cache.service";
import type {
  AnalyticsDateRange,
  DateRangeQuery,
} from "src/battles/services/battle-analytics.types";
import { DrizzleService } from "src/shared/modules/drizzle/drizzle.service";
import {
  battleWarriors,
  type battles,
} from "src/shared/modules/drizzle/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BattleAnalyticsQueryService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly cacheService: BattleAnalyticsCacheService,
  ) {}

  warriorExists(
    battlesRef: typeof battles,
    ...conditions: (SQL | undefined)[]
  ) {
    return exists(
      this.drizzle.db
        .select({ one: eq(battleWarriors.id, battleWarriors.id) })
        .from(battleWarriors)
        .where(and(eq(battleWarriors.battleId, battlesRef.id), ...conditions)),
    );
  }

  getCharacterIds(
    userId: string,
    query: { characterId?: string; world?: string },
  ): Promise<string[]> {
    return this.cacheService.getOrSetJson(
      this.cacheService.buildQueryCacheKey(
        "battle-characters",
        "ids",
        userId,
        query,
      ),
      () => this.getCharacterIdsUncached(userId, query),
    );
  }

  getDateRangeFilter(query: DateRangeQuery): AnalyticsDateRange {
    if (query.startDate || query.endDate) {
      return {
        ...(query.startDate ? { startDate: new Date(query.startDate) } : {}),
        ...(query.endDate ? { endDate: new Date(query.endDate) } : {}),
      };
    }

    return {
      startDate: this.getDateFilter(query.period),
    };
  }

  buildAnalyticsWhere(
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
  ): SQL | undefined {
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

    conditions.push(this.warriorExists(battlesRef, ...warriorConditions));

    return and(...conditions);
  }

  buildCombatProfileWhere(
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
  ): SQL | undefined {
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

    conditions.push(this.warriorExists(battlesRef, ...warriorConditions));

    return and(...conditions);
  }

  private async getCharacterIdsUncached(
    userId: string,
    query: { characterId?: string; world?: string },
  ): Promise<string[]> {
    if (query.characterId) {
      const userCharacter =
        await this.drizzle.db.query.userCharacters.findFirst({
          where: {
            userId,
            characterId: query.characterId,
            ...(query.world && { world: query.world }),
          },
        });

      if (!userCharacter) {
        throw new NotFoundException(
          `Character ${query.characterId} not found for user`,
        );
      }

      return [query.characterId];
    }

    const userChars = await this.drizzle.db.query.userCharacters.findMany({
      where: {
        userId,
        ...(query.world && { world: query.world }),
      },
      columns: { characterId: true },
    });

    return userChars.map((character) => character.characterId);
  }

  private getDateFilter(period?: string): Date | undefined {
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
  }
}
