import { createFileRoute } from "@tanstack/react-router";
import { MemberDetailPageSkeleton } from "@/features/stats/member-detail-page-skeleton";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  pendingComponent: MemberDetailPageSkeleton,
});
