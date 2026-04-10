import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics";
import { BattlePanelStatisticsSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";
import {
  ensureBattlePanelCharacterId,
  getBattlePanelFilters,
} from "@/features/battle-panel/battle-panel-route-loader";
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
  loader: async ({ context }) => {
    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
    });
    const filters = getBattlePanelFilters(characterId);
    const baseParams = {
      characterId,
      period: filters.period ?? "30d",
      minLevel: filters.minLevel ?? 1,
      maxLevel: filters.maxLevel ?? 500,
      ph: filters.ph,
      matchmaking: filters.matchmaking,
      suppressRouteErrorToast: true,
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
          suppressRouteErrorToast: true,
        }),
      ),
      context.queryClient.ensureQueryData(
        ratingDeltaByOpponentQueryOptions({
          characterId,
          period: baseParams.period,
          minLevel: baseParams.minLevel,
          maxLevel: baseParams.maxLevel,
          suppressRouteErrorToast: true,
        }),
      ),
    ]);

    return null;
  },
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
