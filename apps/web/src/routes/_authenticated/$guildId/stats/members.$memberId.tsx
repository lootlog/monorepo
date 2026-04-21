import { createFileRoute, notFound } from "@tanstack/react-router";
import { MemberStatsPage } from "@/features/guild/stats/member-stats-page";
import { MemberDetailPageSkeleton } from "@/features/guild/stats/member-detail-page-skeleton";
import {
  buildMemberKillsParams,
  DEFAULT_MEMBER_KILLS_LIMIT,
} from "@/features/guild/stats/utils/build-stats-query-params";
import { getKillsControllerGetMemberKillsQueryOptions } from "@/lib/api/generated/main/kills/kills";
import { getMembersControllerGetGuildMembersQueryOptions } from "@/lib/api/generated/main/members/members";
import {
  isRouteLoaderCancelledError,
  throwNotFoundIfResponseMatches,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  loader: async ({ context, params }) => {
    const memberId = Number.parseInt(params.memberId, 10);

    if (Number.isNaN(memberId)) {
      throw notFound({ throw: true });
    }

    try {
      const [memberKills] = await Promise.all([
        context.queryClient.ensureQueryData(
          getKillsControllerGetMemberKillsQueryOptions(
            {
              guildId: params.guildId,
              memberId: params.memberId,
            },
            buildMemberKillsParams({
              limit: DEFAULT_MEMBER_KILLS_LIMIT,
            }),
          ),
        ),
        context.queryClient.ensureQueryData(
          getMembersControllerGetGuildMembersQueryOptions(
            { guildId: params.guildId },
            {
              includeInactive: true,
            },
          ),
        ),
      ]);

      if (!memberKills.member) {
        throw notFound({ throw: true });
      }

      return null;
    } catch (error) {
      if (isRouteLoaderCancelledError(error)) {
        return null;
      }

      throwNotFoundIfResponseMatches(error);
    }
  },
  component: MemberStatsPage,
  pendingComponent: MemberDetailPageSkeleton,
});
