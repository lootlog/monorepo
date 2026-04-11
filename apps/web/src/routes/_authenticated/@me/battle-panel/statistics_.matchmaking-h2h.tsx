import { createFileRoute } from "@tanstack/react-router";
import { MatchmakingH2HFullPage } from "@/features/user/battle-panel/battle-panel-statistics/matchmaking-h2h-full-page";
import { BattlePanelH2hSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelHeadToHeadSearchSchema,
  loadBattlePanelHeadToHeadSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-statistics-search";
import { headToHeadQueryOptions } from "@/hooks/api/battle-log/use-head-to-head";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  validateSearch: battlePanelHeadToHeadSearchSchema,
  loader: async ({ context, location }) => {
    const search = loadBattlePanelHeadToHeadSearch(location.searchStr);
    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
      characterId: normalizeBattlePanelCharacterId(search.characterId),
    });

    await context.queryClient.ensureQueryData(
      headToHeadQueryOptions({
        cursor: search.cursor ?? undefined,
        characterId,
        period: search.period,
        search: search.search ?? undefined,
        minLevel: search.minLevel,
        maxLevel: search.maxLevel,
        matchmaking: true,
        sortBy: search.sortBy,
        sortOrder: search.sortOrder,
        size: 20,
        includeTotal: true,
      }),
    );

    return null;
  },
  component: MatchmakingH2HFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
