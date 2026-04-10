import { createFileRoute } from "@tanstack/react-router";
import { MatchmakingH2HFullPage } from "@/features/battle-panel/battle-panel-statistics/matchmaking-h2h-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import {
  ensureBattlePanelCharacterId,
  getBattlePanelFilters,
} from "@/features/battle-panel/battle-panel-route-loader";
import { headToHeadQueryOptions } from "@/hooks/api/battle-log/use-head-to-head";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/matchmaking-h2h",
)({
  loader: async ({ context }) => {
    const characterId = await ensureBattlePanelCharacterId({
      queryClient: context.queryClient,
    });
    const filters = getBattlePanelFilters(characterId);

    await context.queryClient.ensureQueryData(
      headToHeadQueryOptions({
        characterId,
        period: filters.period ?? "30d",
        minLevel: filters.minLevel,
        maxLevel: filters.maxLevel,
        matchmaking: true,
        size: 20,
        includeTotal: true,
        suppressRouteErrorToast: true,
      }),
    );

    return null;
  },
  component: MatchmakingH2HFullPage,
  pendingComponent: BattlePanelH2hSkeleton,
});
