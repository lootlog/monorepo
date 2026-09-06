import { createFileRoute } from "@tanstack/react-router";
import { LootStats } from "@/features/guild/stats/loot-stats";
import { LootStatsPageSkeleton } from "@/features/guild/stats/loot-stats-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/loots")({
  component: LootStats,
  pendingComponent: LootStatsPageSkeleton,
});
