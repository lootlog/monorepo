import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelDashboardSkeleton } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard-skeleton";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/stats")({
  pendingComponent: BattlePanelDashboardSkeleton,
});
