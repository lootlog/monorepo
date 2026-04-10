import { createFileRoute } from "@tanstack/react-router";
import { PlayerVsPlayerFullPage } from "@/features/battle-panel/battle-panel-statistics/player-vs-player-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import {
  ensureBattlePanelCharacterId,
  getBattlePanelFilters,
} from "@/features/battle-panel/battle-panel-route-loader";
import { playerVsPlayerQueryOptions } from "@/hooks/api/battle-log/use-player-vs-player";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({
  loader: async ({ context, params }) => {
    const characterId =
      (await ensureBattlePanelCharacterId({
        queryClient: context.queryClient,
      })) ?? params.myId;
    const filters = getBattlePanelFilters(characterId);

    await context.queryClient.ensureQueryData(
      playerVsPlayerQueryOptions({
        characterId,
        opponentId: params.opponentId,
        period: filters.period ?? "30d",
        minLevel: filters.minLevel,
        maxLevel: filters.maxLevel,
        size: 20,
        includeTotal: true,
        suppressRouteErrorToast: true,
      }),
    );

    return null;
  },
  component: PlayerVsPlayerFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
