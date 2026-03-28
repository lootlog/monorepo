import { createLazyFileRoute } from "@tanstack/react-router";
import { StatsNpcsList } from "@/features/stats/stats-npcs-list";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/stats/npcs/",
)({
  component: StatsNpcsList,
});
