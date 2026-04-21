import { createFileRoute, notFound } from "@tanstack/react-router";
import { NpcKillersPage } from "@/features/guild/stats/npc-killers-page";
import { NpcDetailPageSkeleton } from "@/features/guild/stats/npc-detail-page-skeleton";
import { buildNpcKillersParams } from "@/features/guild/stats/utils/build-stats-query-params";
import { getKillsControllerGetNpcKillersQueryOptions } from "@/lib/api/generated/main/kills/kills";
import { getMembersControllerGetGuildMembersQueryOptions } from "@/lib/api/generated/main/members/members";
import {
  isRouteLoaderCancelledError,
  throwNotFoundIfResponseMatches,
} from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  loader: async ({ context, params }) => {
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
            buildNpcKillersParams(),
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

      if (!npcKillers.npc) {
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
  component: NpcKillersPage,
  pendingComponent: NpcDetailPageSkeleton,
});
