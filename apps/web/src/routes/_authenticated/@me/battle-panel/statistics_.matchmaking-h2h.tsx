import { createFileRoute } from "@tanstack/react-router";
import { MatchmakingH2HFullPage } from "@/features/battle-panel/battle-panel-statistics/matchmaking-h2h-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  component: MatchmakingH2HFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
