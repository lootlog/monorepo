import { createFileRoute } from "@tanstack/react-router";
import { MemberStatsPage } from "@/features/stats/member-stats-page";
import { MemberDetailPageSkeleton } from "@/features/stats/member-detail-page-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  component: MemberStatsPage,
  pendingComponent: MemberDetailPageSkeleton,
});
