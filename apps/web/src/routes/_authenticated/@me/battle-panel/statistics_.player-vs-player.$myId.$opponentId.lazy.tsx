import { createLazyFileRoute } from "@tanstack/react-router";
import { PlayerVsPlayerFullPage } from "@/features/battle-panel/battle-panel-statistics/player-vs-player-full-page";

export const Route = createLazyFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({
  component: PlayerVsPlayerFullPage,
});
