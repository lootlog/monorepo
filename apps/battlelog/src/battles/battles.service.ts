import { makeBattleDeletion } from "#src/battles/deletion/battle-deletion";
import type { BattleAnalytics } from "#src/battles/analytics/battle-analytics.service";
import { makeBattleCatalog } from "#src/battles/catalog/battle-catalog";
import type { BattleListFilter } from "#src/battles/catalog/battle-list-filter.service";
import type { BattleMetadata } from "#src/battles/catalog/battle-metadata.service";
import type { BattlePagination } from "#src/battles/analytics/pagination.service";
import { makeBattleTimelineRead } from "#src/battles/battle-timeline-read";
import { makeBattleCreation } from "#src/battles/submission/battle-creation";
import {
  defaultBattleDeduplicationTiming,
  makeBattleDeduplication,
  type BattleDeduplicationStore,
  type BattleDeduplicationTiming,
} from "#src/battles/submission/battle-deduplication";

type BattlesDatabase = Parameters<typeof makeBattleDeletion>[0] &
  Parameters<typeof makeBattleCreation>[0] &
  Parameters<typeof makeBattleCatalog>[0] &
  Parameters<typeof makeBattleTimelineRead>[0];

export const makeBattles = (
  drizzle: BattlesDatabase,
  redisService: BattleDeduplicationStore,
  paginationService: BattlePagination,
  battleAnalyticsService: BattleAnalytics,
  battleListFilterService: BattleListFilter,
  battleMetadataService: BattleMetadata,
  deduplicationTiming: BattleDeduplicationTiming = defaultBattleDeduplicationTiming,
) => {
  const deletion = makeBattleDeletion(drizzle, battleAnalyticsService);

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

  const timelineRead = makeBattleTimelineRead(drizzle, redisService, catalog);

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
  };
};

export type Battles = ReturnType<typeof makeBattles>;
