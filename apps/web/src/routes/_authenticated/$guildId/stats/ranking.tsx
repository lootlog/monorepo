import { createFileRoute } from "@tanstack/react-router";
import { StatsRanking } from "@/features/guild/stats/stats-ranking";
import { RankingPageSkeleton } from "@/features/guild/stats/ranking-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/ranking")({
  component: StatsRanking,
  pendingComponent: RankingPageSkeleton,
});
