import { createFileRoute, notFound } from "@tanstack/react-router";
import { MemberStatsPage } from "@/features/guild/stats/member-stats-page";
import { MemberDetailPageSkeleton } from "@/features/guild/stats/member-detail-page-skeleton";
import {
  buildMemberKillsParams,
  DEFAULT_MEMBER_KILLS_LIMIT,
} from "@/features/guild/stats/utils/build-stats-query-params";
import { getKillsControllerGetMemberKillsQueryOptions } from "@lootlog/api-client/react-query/main/kills";
import { getMembersControllerGetGuildMemberReferencesQueryOptions } from "@lootlog/api-client/react-query/main/members";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/members/$memberId",
)({
  loader: ({ abortController, context, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
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
            getMembersControllerGetGuildMemberReferencesQueryOptions(
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
        rethrowNotFoundOrError(error);
      }
    }),
  component: MemberStatsPage,
  pendingComponent: MemberDetailPageSkeleton,
});
