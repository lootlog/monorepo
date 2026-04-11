import { createFileRoute } from "@tanstack/react-router";
import { StatsNpcsList } from "@/features/guild/stats/stats-npcs-list";
import { NpcsIndexPageSkeleton } from "@/features/guild/stats/npcs-index-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/npcs/")({
  component: StatsNpcsList,
  pendingComponent: NpcsIndexPageSkeleton,
});
