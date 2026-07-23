import { createFileRoute } from "@tanstack/react-router";
import { PlayerVsPlayerFullPage } from "@/features/user/battle-panel/battle-panel-statistics/player-vs-player-full-page";
import { BattlePanelH2hSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelPlayerVsPlayerSearchSchema,
  loadBattlePanelPlayerVsPlayerSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { getBattlesControllerGetPlayerVsPlayerBattlesQueryOptions } from "@lootlog/api-client/react-query/battlelog/battles";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/player-vs-player/$myId/$opponentId",
)({
  validateSearch: battlePanelPlayerVsPlayerSearchSchema,
  loader: ({ abortController, context, location, params }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const search = loadBattlePanelPlayerVsPlayerSearch(location.searchStr);
      const characterId =
        (await ensureBattlePanelCharacterId({
          queryClient: context.queryClient,
          characterId:
            normalizeBattlePanelCharacterId(search.characterId) ?? params.myId,
        })) ?? params.myId;

      await context.queryClient.ensureQueryData(
        getBattlesControllerGetPlayerVsPlayerBattlesQueryOptions({
          cursor: search.cursor ?? undefined,
          characterId,
          opponentId: params.opponentId,
          period: search.period,
          startDate: search.startDate ?? undefined,
          endDate: search.endDate ?? undefined,
          minLevel: search.minLevel,
          maxLevel: search.maxLevel,
          ph: search.ph ?? undefined,
          matchmaking: search.matchmaking ?? undefined,
          size: 20,
          includeTotal: true,
        }),
      );

      return null;
    }),
  component: PlayerVsPlayerFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
