import { createFileRoute, notFound } from "@tanstack/react-router";
import { NpcKillersPage } from "@/features/guild/stats/npc-killers-page";
import { StatsDetailPageSkeleton } from "@/features/guild/stats/stats-detail-page-skeleton";
import { buildNpcKillersParams } from "@/features/guild/stats/utils/build-stats-query-params";
import {
  getKillsControllerGetNpcKillersQueryOptions,
  getMembersControllerGetGuildMemberReferencesQueryOptions,
} from "@lootlog/client/main";

import { readStatsSettings } from "@/features/guild/stats/hooks/use-stats-settings";
import { readGuildWorld } from "@/hooks/context/use-guild-world";
import {
  rethrowNotFoundOrError,
  withRouteLoaderCancellation,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  loader: ({ abortController, context, location, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const npcId = Number.parseInt(params.npcId, 10);

      if (Number.isNaN(npcId)) {
        throw notFound({ throw: true });
      }

      try {
        const [npcKillers] = await Promise.all([
          context.queryClient.ensureQueryData(
            getKillsControllerGetNpcKillersQueryOptions(
              {
                guildId: params.guildId,
                npcId: params.npcId,
              },
              buildNpcKillersParams(
                readStatsSettings(
                  location.searchStr,
                  readGuildWorld(params.guildId, location.searchStr),
                ),
              ),
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

        if (!npcKillers.npc) {
          throw notFound({ throw: true });
        }

        return null;
      } catch (error) {
        rethrowNotFoundOrError(error);
      }
    }),
  component: NpcKillersPage,
  pendingComponent: () => <StatsDetailPageSkeleton rowContent="text" />,
});
