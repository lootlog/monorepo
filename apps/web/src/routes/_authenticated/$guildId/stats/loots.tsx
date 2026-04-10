import { createFileRoute } from "@tanstack/react-router";
import { LootStatsPageSkeleton } from "@/features/stats/loot-stats-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/loots")({
  pendingComponent: LootStatsPageSkeleton,
});
