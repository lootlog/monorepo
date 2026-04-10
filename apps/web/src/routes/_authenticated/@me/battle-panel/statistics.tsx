import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics";
import { BattlePanelStatisticsSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/battle-panel/battle-panel-route-loader";
import { getBattlePanelStatisticsSearch } from "@/features/battle-panel/battle-panel-statistics-search";
import { professionWinRateQueryOptions } from "@/hooks/api/battle-log/use-profession-win-rate";
import { headToHeadQueryOptions } from "@/hooks/api/battle-log/use-head-to-head";
import { battleStreakQueryOptions } from "@/hooks/api/battle-log/use-battle-streak";
import { battleDurationQueryOptions } from "@/hooks/api/battle-log/use-battle-duration";
import { phGrowthQueryOptions } from "@/hooks/api/battle-log/use-ph-growth";
import { ratingGrowthQueryOptions } from "@/hooks/api/battle-log/use-rating-growth";
import { ratingDeltaByOpponentQueryOptions } from "@/hooks/api/battle-log/use-rating-delta-by-opponent";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  loader: async ({ context, location }) => {
    const search = getBattlePanelStatisticsSearch(location.searchStr);
    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
      characterId: search.characterId,
    });
    const baseParams = {
      characterId,
      period: search.period,
      minLevel: search.minLevel,
      maxLevel: search.maxLevel,
      ph: search.ph,
      matchmaking: search.matchmaking,
    };

    await Promise.all([
      context.queryClient.ensureQueryData(
        professionWinRateQueryOptions(baseParams),
      ),
      context.queryClient.ensureQueryData(
        headToHeadQueryOptions({
          ...baseParams,
          size: 5,
        }),
      ),
      context.queryClient.ensureQueryData(battleStreakQueryOptions(baseParams)),
      context.queryClient.ensureQueryData(
        battleDurationQueryOptions(baseParams),
      ),
      context.queryClient.ensureQueryData(phGrowthQueryOptions(baseParams)),
      context.queryClient.ensureQueryData(
        ratingGrowthQueryOptions({
          characterId,
          period: baseParams.period,
          minLevel: baseParams.minLevel,
          maxLevel: baseParams.maxLevel,
        }),
      ),
      context.queryClient.ensureQueryData(
        ratingDeltaByOpponentQueryOptions({
          characterId,
          period: baseParams.period,
          minLevel: baseParams.minLevel,
          maxLevel: baseParams.maxLevel,
        }),
      ),
    ]);

    return null;
  },
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
