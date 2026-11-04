import { createFileRoute } from "@tanstack/react-router";
import { KillStats } from "@/features/guild/stats/kill-stats";
import { KillStatsPageSkeleton } from "@/features/guild/stats/kill-stats-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/kills")({
  staticData: {
    navigation: ({ t }) => ({ label: t("common.stats.kills"), tab: true }),
  },
  component: KillStats,
  pendingComponent: KillStatsPageSkeleton,
});
