import { createLazyFileRoute } from "@tanstack/react-router";
import { StatsRanking } from "@/features/stats/stats-ranking";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/stats/ranking",
)({
  component: StatsRanking,
});
