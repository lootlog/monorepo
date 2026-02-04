import { createFileRoute } from "@tanstack/react-router";
import { StatsLayout } from "@/components/layout/stats-layout";

export const Route = createFileRoute("/_authenticated/$guildId/stats")({
  component: StatsLayout,
});
