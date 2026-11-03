import { createFileRoute } from "@tanstack/react-router";
import { AbyssSeasonBattles } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-battles";
import { loadAbyssSeasonRoute } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-route-loader";
import { battlePanelAbyssSeasonSearchSchema } from "@/features/user/battle-panel/battle-panel-search";
import { getBattlesControllerGetDashboardBattlesQueryOptions } from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";
import { buildAbyssSeasonBattlesParams } from "@/features/user/battle-panel/battle-panel-request-params";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/abyss_/$seasonId/",
)({
  validateSearch: battlePanelAbyssSeasonSearchSchema,
  loader: ({ abortController, context, location, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const { search, characterId, season } = await loadAbyssSeasonRoute({
        queryClient: context.queryClient,
        searchStr: location.searchStr,
        seasonId: params.seasonId,
      });

      if (characterId && season) {
        void prefetchRouteQuery(
          context.queryClient,
          getBattlesControllerGetDashboardBattlesQueryOptions(
            buildAbyssSeasonBattlesParams(search, characterId, season),
          ),
        ).catch(() => undefined);
      }

      return null;
    }),
  component: AbyssSeasonBattles,
});
