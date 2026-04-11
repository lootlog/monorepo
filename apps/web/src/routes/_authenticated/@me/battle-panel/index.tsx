import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelDashboard } from "@/features/user/battle-panel/battle-panel-dashboard/battle-panel-dashboard";
import { BattlePanelDashboardSkeleton } from "@/features/user/battle-panel/battle-panel-dashboard/battle-panel-dashboard-skeleton";
import { getBattlePanelStatisticsSearch } from "@/features/user/battle-panel/battle-panel-statistics-search";
import { battleAnalyticsQueryOptions } from "@/hooks/api/battle-log/use-battle-analytics";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/")({
  loader: async ({ context, location }) => {
    const search = getBattlePanelStatisticsSearch(location.searchStr);

    await context.queryClient.ensureQueryData(
      battleAnalyticsQueryOptions({
        characterId: search.characterId,
        period: "180d",
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
      }),
    );

    return null;
  },
  component: BattlePanelDashboard,
  pendingComponent: BattlePanelDashboardSkeleton,
});
