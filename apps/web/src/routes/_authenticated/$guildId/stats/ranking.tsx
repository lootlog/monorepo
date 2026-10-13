import { createFileRoute } from "@tanstack/react-router";
import { StatsMobileListSkeleton } from "@/features/guild/stats/components/stats-mobile-list-skeleton";
import { StatsRanking } from "@/features/guild/stats/stats-ranking";
import { StatsTablePageSkeleton } from "@/features/guild/stats/stats-table-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/ranking")({
  component: StatsRanking,
  pendingComponent: () => (
    <StatsTablePageSkeleton
      mobileSkeleton={<StatsMobileListSkeleton media="avatar" withTypeCounts />}
    />
  ),
});
