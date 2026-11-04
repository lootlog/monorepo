import { createFileRoute } from "@tanstack/react-router";
import { LootStats } from "@/features/guild/stats/loot-stats";
import { LootStatsPageSkeleton } from "@/features/guild/stats/loot-stats-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/loots")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.stats.loots"), tab: true }),
  },
  component: LootStats,
  pendingComponent: LootStatsPageSkeleton,
});
