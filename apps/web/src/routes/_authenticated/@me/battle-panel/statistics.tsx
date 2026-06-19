import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics";
import { BattlePanelStatisticsSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelStatisticsSearchSchema,
  loadBattlePanelStatisticsSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import {
  getBattlesControllerGetBattleDurationQueryOptions,
  getBattlesControllerGetCurrentStreakQueryOptions,
  getBattlesControllerGetHeadToHeadQueryOptions,
  getBattlesControllerGetPhGrowthQueryOptions,
  getBattlesControllerGetProfessionWinRateQueryOptions,
  getBattlesControllerGetRatingDeltaByOpponentQueryOptions,
  getBattlesControllerGetRatingGrowthQueryOptions,
} from "@/lib/api/generated/battlelog/battles/battles";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  validateSearch: battlePanelStatisticsSearchSchema,
  loader: ({ abortController, context, location }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const search = loadBattlePanelStatisticsSearch(location.searchStr);
      const normalizedCharacterId = normalizeBattlePanelCharacterId(
        search.characterId,
      );

      void (async () => {
        const characterId = await ensureBattlePanelCharacterId({
          queryClient: context.queryClient,
          characterId: normalizedCharacterId,
        });
        const baseParams = {
          characterId,
          period: search.period,
          minLevel: search.minLevel,
          maxLevel: search.maxLevel,
          ph: search.ph ?? undefined,
          matchmaking: search.matchmaking ?? undefined,
        };

        await Promise.all([
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
            getBattlesControllerGetRatingGrowthQueryOptions({
              characterId,
              period: baseParams.period,
              minLevel: baseParams.minLevel,
              maxLevel: baseParams.maxLevel,
            }),
          ),
          prefetchRouteQuery(
            context.queryClient,
            getBattlesControllerGetRatingDeltaByOpponentQueryOptions({
              characterId,
              period: baseParams.period,
              minLevel: baseParams.minLevel,
              maxLevel: baseParams.maxLevel,
            }),
          ),
        ]);
      })().catch(() => undefined);

      return null;
    }),
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
