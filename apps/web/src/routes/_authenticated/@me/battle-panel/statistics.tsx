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
        context.queryClient.ensureQueryData(
          getBattlesControllerGetProfessionWinRateQueryOptions(baseParams),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetHeadToHeadQueryOptions({
            ...baseParams,
            size: 5,
          }),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetCurrentStreakQueryOptions(baseParams),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetBattleDurationQueryOptions(baseParams),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetPhGrowthQueryOptions(baseParams),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetRatingGrowthQueryOptions({
            characterId,
            period: baseParams.period,
            minLevel: baseParams.minLevel,
            maxLevel: baseParams.maxLevel,
          }),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetRatingDeltaByOpponentQueryOptions({
            characterId,
            period: baseParams.period,
            minLevel: baseParams.minLevel,
            maxLevel: baseParams.maxLevel,
          }),
        ),
      ]);

      return null;
    }),
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
