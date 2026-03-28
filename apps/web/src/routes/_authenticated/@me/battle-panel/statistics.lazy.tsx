import { createLazyFileRoute } from "@tanstack/react-router";
import { BattlePanelStatistics } from "@/features/battle-panel/battle-panel-statistics/battle-panel-statistics";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/battle-panel/statistics",
)({
  component: BattlePanelStatistics,
});
