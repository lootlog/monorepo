import { createLazyFileRoute } from "@tanstack/react-router";
import { KillStats } from "@/features/stats/kill-stats";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/stats/kills",
)({
  component: KillStats,
});
