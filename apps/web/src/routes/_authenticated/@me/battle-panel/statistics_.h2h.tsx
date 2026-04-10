import { createFileRoute } from "@tanstack/react-router";
import { HeadToHeadFullPage } from "@/features/battle-panel/battle-panel-statistics/head-to-head-full-page";
import { BattlePanelH2hSkeleton } from "@/features/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import {
  ensureBattlePanelCharacterId,
  getBattlePanelFilters,
} from "@/features/battle-panel/battle-panel-route-loader";
import { headToHeadQueryOptions } from "@/hooks/api/battle-log/use-head-to-head";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/statistics_/h2h",
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
        ph: filters.ph,
        matchmaking: filters.matchmaking,
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
