import { createFileRoute } from "@tanstack/react-router";
import { StatsRanking } from "@/features/stats/stats-ranking";

export const Route = createFileRoute("/_authenticated/$guildId/stats/ranking")({
  component: StatsRanking,
});
