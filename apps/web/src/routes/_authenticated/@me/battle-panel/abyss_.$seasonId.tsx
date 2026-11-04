import { createFileRoute, redirect } from "@tanstack/react-router";
import { AbyssSeasonLayout } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-layout";
import { loadAbyssSeasonRoute } from "@/features/user/battle-panel/battle-panel-abyss/abyss-season-route-loader";
import { battlePanelAbyssSeasonSearchSchema } from "@/features/user/battle-panel/battle-panel-search";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/abyss_/$seasonId",
)({
  staticData: {
    navigation: ({ t, parentPath }) => ({
      ancestors: [
        { label: t("layout.breadcrumbs.abyss"), path: `${parentPath}/abyss` },
      ],
      label: t("layout.breadcrumbs.abyssSeason"),
    }),
  },
  validateSearch: battlePanelAbyssSeasonSearchSchema,
  loader: ({ abortController, context, location, params, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const { search, characterId } = await loadAbyssSeasonRoute({
        queryClient: context.queryClient,
        searchStr: location.searchStr,
        seasonId: params.seasonId,
      });

      if (characterId && !search.characterId) {
        throw redirect({
          to: location.pathname,
          search: { ...search, characterId },
        });
      }

      return null;
    }),
  component: AbyssSeasonLayout,
});
