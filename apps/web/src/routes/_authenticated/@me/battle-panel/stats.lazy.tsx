import { createLazyFileRoute } from "@tanstack/react-router";
import { BattlePanelDashboard } from "@/features/battle-panel/battle-panel-dashboard/battle-panel-dashboard";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/battle-panel/stats",
)({
  component: BattlePanelDashboard,
});
