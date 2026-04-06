import { createFileRoute } from "@tanstack/react-router";
import { MemberStatsPage } from "@/features/stats/member-stats-page";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  component: MemberStatsPage,
});
