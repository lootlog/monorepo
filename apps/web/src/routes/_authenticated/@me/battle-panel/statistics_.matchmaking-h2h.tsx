import { createFileRoute } from "@tanstack/react-router";
import { MatchmakingH2HFullPage } from "@/features/battle-panel/battle-panel-statistics/components/matchmaking-h2h-full-page";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  component: MatchmakingH2HFullPage,
});
