import { createFileRoute } from "@tanstack/react-router";
import { AbyssSeasonAnalytics } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-analytics";
import { getAbyssSeasonAnalyticsParams } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-params";
import { loadAbyssSeasonRoute } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-route-loader";
import { prefetchBattleAnalytics } from "@/features/user/battle-panel/battle-panel-route-loader";
import { battlePanelAbyssSeasonSearchSchema } from "@/features/user/battle-panel/battle-panel-search";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/abyss_/$seasonId/analytics",
)({
  validateSearch: battlePanelAbyssSeasonSearchSchema,
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

      if (characterId && season) {
        void prefetchBattleAnalytics(
          context.queryClient,
          getAbyssSeasonAnalyticsParams({
            characterId,
            startDate: season.startedAt,
            endDate: season.endedAt,
          }),
        );
      }

      return null;
    }),
  component: AbyssSeasonAnalytics,
});
