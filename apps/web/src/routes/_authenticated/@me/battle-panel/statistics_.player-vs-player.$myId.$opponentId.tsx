import { createFileRoute } from "@tanstack/react-router";
import { PlayerVsPlayerFullPage } from "@/features/battle-panel/battle-panel-statistics/player-vs-player-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({
  component: PlayerVsPlayerFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
