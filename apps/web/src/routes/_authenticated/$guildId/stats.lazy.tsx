import { createLazyFileRoute } from "@tanstack/react-router";
import { StatsLayout } from "@/components/layout/stats-layout";

export const Route = createLazyFileRoute("/_authenticated/$guildId/stats")({
  component: StatsLayout,
});
