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
} from "@/lib/api/generated/battlelog/battles/battles";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

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

      await Promise.all([
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetProfessionWinRateQueryOptions(baseParams),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetHeadToHeadQueryOptions({
            ...baseParams,
            size: 5,
          }),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetCurrentStreakQueryOptions(baseParams),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetBattleDurationQueryOptions(baseParams),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetPhGrowthQueryOptions(baseParams),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetCombatProfileQueryOptions(baseParams),
        ),
      ]);

      return null;
    }),
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
