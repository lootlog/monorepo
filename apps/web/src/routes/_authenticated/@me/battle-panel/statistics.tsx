import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics";
import { BattlePanelStatisticsSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";
import { loadBattlePanelStatistics } from "@/features/user/battle-panel/battle-panel-route-loader";
import { battlePanelStatisticsSearchSchema } from "@/features/user/battle-panel/battle-panel-search";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  validateSearch: battlePanelStatisticsSearchSchema,
  loader: loadBattlePanelStatistics,
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
