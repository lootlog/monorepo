import { createFileRoute } from "@tanstack/react-router";
import { RankingPageSkeleton } from "@/features/stats/ranking-page-skeleton";

export const Route = createFileRoute("/_authenticated/$guildId/stats/ranking")({
  pendingComponent: RankingPageSkeleton,
});
