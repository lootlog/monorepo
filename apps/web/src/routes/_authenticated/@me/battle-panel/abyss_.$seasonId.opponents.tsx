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

      // The same params `useHeadToHeadPage` builds for a season.
      if (characterId && season) {
        void prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetHeadToHeadQueryOptions({
            cursor: search.cursor ?? undefined,
            size: 20,
            sortBy: search.sortBy,
            sortOrder: search.sortOrder,
            characterId,
            period: "all",
            startDate: season.startedAt,
            endDate: season.endedAt,
            search: search.search ?? undefined,
            minLevel: search.minLevel,
            maxLevel: search.maxLevel,
            matchmaking: true,
            includeTotal: true,
          }),
        ).catch(() => undefined);
      }

      return null;
    }),
  component: AbyssSeasonOpponents,
});
