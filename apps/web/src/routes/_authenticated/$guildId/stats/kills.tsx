import { createFileRoute } from "@tanstack/react-router";
import { KillStats } from "@/features/stats/kill-stats";

export const Route = createFileRoute("/_authenticated/$guildId/stats/kills")({
  component: KillStats,
});
