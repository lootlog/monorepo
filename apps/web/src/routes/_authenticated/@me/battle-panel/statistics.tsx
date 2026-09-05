import { createFileRoute, redirect } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics";
import { BattlePanelStatisticsSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelStatisticsSearchSchema,
  loadBattlePanelStatisticsSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import {
  getBattlesControllerGetBattleDurationQueryOptions,
  getBattlesControllerGetCombatProfileQueryOptions,
  getBattlesControllerGetCurrentStreakQueryOptions,
  getBattlesControllerGetHeadToHeadQueryOptions,
  getBattlesControllerGetPhGrowthQueryOptions,
  getBattlesControllerGetProfessionWinRateQueryOptions,
} from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  validateSearch: battlePanelStatisticsSearchSchema,
  loader: ({ abortController, context, location, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const search = loadBattlePanelStatisticsSearch(location.searchStr);
      const normalizedCharacterId = normalizeBattlePanelCharacterId(
        search.characterId,
      );

      const characterId = await ensureBattlePanelCharacterId({
        queryClient: context.queryClient,
        characterId: normalizedCharacterId,
      });

      if (!characterId) {
        return null;
      }

      if (!search.characterId) {
        throw redirect({
          to: "/@me/battle-panel/statistics",
          search: {
            ...search,
            characterId,
          },
        });
      }

      const baseParams = {
        characterId,
        period: search.period,
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
        startDate: search.startDate ?? undefined,
        endDate: search.endDate ?? undefined,
        ph: search.ph ?? undefined,
        matchmaking: false,
      };

      void Promise.all([
        prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetProfessionWinRateQueryOptions(baseParams),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetHeadToHeadQueryOptions({
            ...baseParams,
            size: 5,
          }),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetCurrentStreakQueryOptions(baseParams),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetBattleDurationQueryOptions(baseParams),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetPhGrowthQueryOptions(baseParams),
        ),
        prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetCombatProfileQueryOptions(baseParams),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
