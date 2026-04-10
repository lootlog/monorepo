import { createFileRoute } from "@tanstack/react-router";
import { KillStatsPageSkeleton } from "@/features/stats/kill-stats-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/kills")({
  pendingComponent: KillStatsPageSkeleton,
});
