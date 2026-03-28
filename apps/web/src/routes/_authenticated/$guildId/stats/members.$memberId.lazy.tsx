import { createLazyFileRoute } from "@tanstack/react-router";
import { MemberStatsPage } from "@/features/stats/member-stats-page";

export const Route = createLazyFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  component: MemberStatsPage,
});
