import { createFileRoute } from "@tanstack/react-router";
import { HeadToHeadFullPage } from "@/features/user/battle-panel/battle-panel-statistics/head-to-head-full-page";
import { BattlePanelH2hSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelHeadToHeadSearchSchema,
  loadBattlePanelHeadToHeadSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { getBattlesControllerGetHeadToHeadQueryOptions } from "@/lib/api/generated/battlelog/battles/battles";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/h2h",
)({
  validateSearch: battlePanelHeadToHeadSearchSchema,
  loader: async ({ context, location }) => {
    const search = loadBattlePanelHeadToHeadSearch(location.searchStr);
    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
      characterId: normalizeBattlePanelCharacterId(search.characterId),
    });

    await context.queryClient.prefetchQuery(
      getBattlesControllerGetHeadToHeadQueryOptions({
        cursor: search.cursor ?? undefined,
        characterId,
        period: search.period,
        search: search.search ?? undefined,
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
        ph: search.ph ?? undefined,
        matchmaking: search.matchmaking ?? undefined,
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        size: 20,
        includeTotal: true,
      }),
    );

    return null;
  },
  component: HeadToHeadFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
