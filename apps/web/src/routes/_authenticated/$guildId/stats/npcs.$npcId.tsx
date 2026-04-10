import { createFileRoute, notFound } from "@tanstack/react-router";
import { NpcKillersPage } from "@/features/stats/npc-killers-page";
import { NpcDetailPageSkeleton } from "@/features/stats/npc-detail-page-skeleton";
import { npcKillersQueryOptions } from "@/features/stats/hooks/use-npc-killers";
import { guildMembersQueryOptions } from "@/hooks/api/members/use-guild-members-query-options";

export const Route = createFileRoute(
  "/_authenticated/$guildId/stats/npcs/$npcId",
)({
  loader: async ({ context, params }) => {
    const npcId = Number.parseInt(params.npcId, 10);

    if (Number.isNaN(npcId)) {
      throw notFound({ throw: true });
    }

    const [npcKillers] = await Promise.all([
      context.queryClient.ensureQueryData(
        npcKillersQueryOptions(
          params.guildId,
          npcId,
          {},
          {
            suppressRouteErrorToast: true,
          },
        ),
      ),
      context.queryClient.ensureQueryData(
        guildMembersQueryOptions(params.guildId, {
          includeInactive: true,
          suppressRouteErrorToast: true,
        }),
      ),
    ]);

    if (!npcKillers.npc) {
      throw notFound({ throw: true });
    }

    return null;
  },
  component: NpcKillersPage,
  pendingComponent: NpcDetailPageSkeleton,
});
