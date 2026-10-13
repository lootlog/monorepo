import { createFileRoute } from "@tanstack/react-router";
import { StatsMobileListSkeleton } from "@/features/guild/stats/components/stats-mobile-list-skeleton";
import { StatsNpcsList } from "@/features/guild/stats/stats-npcs-list";
import { StatsTablePageSkeleton } from "@/features/guild/stats/stats-table-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/npcs/")({
  component: StatsNpcsList,
  pendingComponent: () => (
    <StatsTablePageSkeleton
      mobileSkeleton={<StatsMobileListSkeleton media="npcTile" />}
    />
  ),
});
