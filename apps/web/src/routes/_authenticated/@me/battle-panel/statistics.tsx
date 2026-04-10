import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelStatisticsSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  pendingComponent: BattlePanelStatisticsSkeleton,
});
