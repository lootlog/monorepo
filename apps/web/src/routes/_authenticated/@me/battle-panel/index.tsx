import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelDashboard } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard";
import { BattlePanelDashboardSkeleton } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard-skeleton";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/")({
  component: BattlePanelDashboard,
  pendingComponent: BattlePanelDashboardSkeleton,
});
