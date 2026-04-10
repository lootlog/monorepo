import { createFileRoute } from "@tanstack/react-router";
import { HeadToHeadFullPage } from "@/features/battle-panel/battle-panel-statistics/head-to-head-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/h2h",
)({
  component: HeadToHeadFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
