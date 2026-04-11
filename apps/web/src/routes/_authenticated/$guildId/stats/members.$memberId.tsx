import { createFileRoute, notFound } from "@tanstack/react-router";
import { MemberStatsPage } from "@/features/guild/stats/member-stats-page";
import { MemberDetailPageSkeleton } from "@/features/guild/stats/member-detail-page-skeleton";
import { memberKillsQueryOptions } from "@/features/guild/stats/hooks/use-member-kills";
import { guildMembersQueryOptions } from "@/hooks/api/members/use-guild-members-query-options";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  loader: async ({ context, params }) => {
    const memberId = Number.parseInt(params.memberId, 10);

    if (Number.isNaN(memberId)) {
      throw notFound({ throw: true });
    }

    const [memberKills] = await Promise.all([
      context.queryClient.ensureQueryData(
        memberKillsQueryOptions(params.guildId, memberId, {}),
      ),
      context.queryClient.ensureQueryData(
        guildMembersQueryOptions(params.guildId, {
          includeInactive: true,
        }),
      ),
    ]);

    if (!memberKills.member) {
      throw notFound({ throw: true });
    }

    return null;
  },
  component: MemberStatsPage,
  pendingComponent: MemberDetailPageSkeleton,
});
