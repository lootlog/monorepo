import { createFileRoute } from "@tanstack/react-router";
import { StatsNpcsList } from "@/features/stats/stats-npcs-list";

export const Route = createFileRoute("/_authenticated/$guildId/stats/npcs/")({
  component: StatsNpcsList,
});
