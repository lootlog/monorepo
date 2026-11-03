import { createFileRoute } from "@tanstack/react-router";
import { AbyssSeasonOpponents } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-opponents";
import { loadAbyssSeasonRoute } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-route-loader";
import {
  battlePanelHeadToHeadSearchSchema,
  loadBattlePanelHeadToHeadSearch,
} from "@/features/user/battle-panel/battle-panel-search";
import { getBattlesControllerGetHeadToHeadQueryOptions } from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";
import { buildHeadToHeadParams } from "@/features/user/battle-panel/battle-panel-request-params";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/abyss_/$seasonId/opponents",
)({
  validateSearch: battlePanelHeadToHeadSearchSchema,
  loader: ({ abortController, context, location, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const { characterId, season } = await loadAbyssSeasonRoute({
        queryClient: context.queryClient,
        searchStr: location.searchStr,
        seasonId: params.seasonId,
      });

      const search = loadBattlePanelHeadToHeadSearch(location.searchStr);

      if (characterId && season) {
        void prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetHeadToHeadQueryOptions(
            buildHeadToHeadParams(search, {
              characterId,
              matchmaking: true,
              showPhFilter: false,
              season: { startDate: season.startedAt, endDate: season.endedAt },
            }),
          ),
        ).catch(() => undefined);
      }

      return null;
    }),
  component: AbyssSeasonOpponents,
});
