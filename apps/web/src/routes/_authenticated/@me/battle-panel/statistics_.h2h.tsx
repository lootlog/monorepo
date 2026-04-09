import { createFileRoute } from "@tanstack/react-router";
import { HeadToHeadFullPage } from "@/features/battle-panel/battle-panel-statistics/head-to-head-full-page";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/h2h",
)({
  component: HeadToHeadFullPage,
});
