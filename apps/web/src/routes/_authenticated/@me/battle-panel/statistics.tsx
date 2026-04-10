import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics";
import { BattlePanelStatisticsSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  component: BattlePanelStatistics,
  pendingComponent: BattlePanelStatisticsSkeleton,
});
