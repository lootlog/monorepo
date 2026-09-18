import { createFileRoute } from "@tanstack/react-router";
import { StatsNpcsList } from "@/features/guild/stats/stats-npcs-list";
import { StatsTablePageSkeleton } from "@/features/guild/stats/stats-table-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/npcs/")({
  component: StatsNpcsList,
  pendingComponent: StatsTablePageSkeleton,
});
