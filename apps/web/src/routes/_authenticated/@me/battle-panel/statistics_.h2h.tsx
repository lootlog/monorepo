import { createFileRoute } from "@tanstack/react-router";
import { HeadToHeadFullPage } from "@/features/battle-panel/battle-panel-statistics/head-to-head-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/battle-panel/battle-panel-route-loader";
import { getBattlePanelHeadToHeadSearch } from "@/features/battle-panel/battle-panel-statistics-search";
import { headToHeadQueryOptions } from "@/hooks/api/battle-log/use-head-to-head";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/h2h",
)({
  loader: async ({ context, location }) => {
    const search = getBattlePanelHeadToHeadSearch(location.searchStr);
    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
      characterId: search.characterId,
    });

    await context.queryClient.ensureQueryData(
      headToHeadQueryOptions({
        cursor: search.cursor,
        characterId,
        period: search.period,
        search: search.search,
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
        ph: search.ph,
        matchmaking: search.matchmaking,
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        size: 20,
        includeTotal: true,
        suppressRouteErrorToast: true,
      }),
    );

    return null;
  },
  component: HeadToHeadFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
