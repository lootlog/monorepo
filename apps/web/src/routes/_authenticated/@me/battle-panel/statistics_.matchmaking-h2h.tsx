import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  pendingComponent: BattlePanelH2hSkeleton,
});
