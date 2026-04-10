import { createFileRoute } from "@tanstack/react-router";
import { PlayerVsPlayerFullPage } from "@/features/battle-panel/battle-panel-statistics/player-vs-player-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/battle-panel/battle-panel-route-loader";
import { getBattlePanelPlayerVsPlayerSearch } from "@/features/battle-panel/battle-panel-statistics-search";
import { playerVsPlayerQueryOptions } from "@/hooks/api/battle-log/use-player-vs-player";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({
  loader: async ({ context, location, params }) => {
    const search = getBattlePanelPlayerVsPlayerSearch(location.searchStr);
    const characterId =
      (await ensureBattlePanelCharacterId({
        queryClient: context.queryClient,
        characterId: search.characterId ?? params.myId,
      })) ?? params.myId;

    await context.queryClient.ensureQueryData(
      playerVsPlayerQueryOptions({
        cursor: search.cursor,
        characterId,
        opponentId: params.opponentId,
        period: search.period,
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
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
