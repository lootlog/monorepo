import { makeBattleDeletion } from "#src/battles/deletion/battle-deletion";
import type { Effect } from "effect";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { makeBattleCatalog } from "#src/battles/catalog/battle-catalog";
import type { BattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import type { BattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import type { BattlePagination } from "#src/battles/analytics/pagination.service";
import { makeBattleTimelineRead } from "#src/battles/battle-timeline-read";
import type { DrizzleDatabase } from "#src/database/database";
import type { BattleObjectStorage } from "#src/infrastructure/battle-object-storage";
import { makeBattleCreation } from "#src/battles/submission/battle-creation";
import {
  defaultBattleDeduplicationTiming,
  makeBattleDeduplication,
  type BattleDeduplicationStore,
  type BattleDeduplicationTiming,
} from "#src/battles/submission/battle-deduplication";

type BattlesDatabase = Parameters<typeof makeBattleDeletion>[0] & {
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

export const makeBattles = (
  drizzle: BattlesDatabase,
  r2Service: BattleObjectStorage,
  redisService: BattleDeduplicationStore,
  paginationService: BattlePagination,
  battleAnalyticsService: BattleAnalytics,
  battleListFilterService: BattleListFilter,
  battleMetadataService: BattleMetadata,
  deduplicationTiming: BattleDeduplicationTiming = defaultBattleDeduplicationTiming,
) => {
  const deletion = makeBattleDeletion(
    drizzle,
    r2Service,
    battleAnalyticsService,
  );

  const creation = makeBattleCreation(
    drizzle,
    battleAnalyticsService,
    battleMetadataService,
    makeBattleDeduplication(redisService, deduplicationTiming),
    deduplicationTiming,
  );

  const catalog = makeBattleCatalog(
    drizzle,
    paginationService,
    battleListFilterService,
  );

  const timelineRead = makeBattleTimelineRead(
    drizzle,
    r2Service,
    redisService,
    catalog,
  );

  return {
    createBattle: creation.createBattle,

    getDashboardBattles: catalog.getDashboardBattles,
    getBattleFromDatabase: catalog.getBattleFromDatabase,
    getPublicBattle: catalog.getPublicBattle,
    updateBattle: catalog.updateBattle,
    resolveBattleId: catalog.resolveBattleId,
    assertBattleOwner: catalog.assertBattleOwner,

    getBattleRawData: timelineRead.getBattleRawData,
    getBattleTimeline: timelineRead.getBattleTimeline,
    getPublicBattleRaw: timelineRead.getPublicBattleRaw,
    getPublicBattleTimeline: timelineRead.getPublicBattleTimeline,

    deleteUserBattles: deletion.deleteUserBattles,
    deleteBattle: deletion.deleteBattle,
    drainObjectDeletions: deletion.drain,

    getUserCharacters(userId: string) {
      return battleMetadataService.getUserCharacters(userId);
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
};

export type Battles = ReturnType<typeof makeBattles>;
