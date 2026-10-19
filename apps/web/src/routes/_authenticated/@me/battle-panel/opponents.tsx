import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  HeadToHeadFullPage,
  headToHeadPageCopy,
} from "@/features/user/battle-panel/battle-panel-statistics/head-to-head-full-page";
import { BattlePanelH2hSkeleton } from "@/features/user/battle-panel/battle-panel-statistics/battle-panel-h2h-skeleton";
import { BattlePanelH2hCardSkeleton } from "@/features/user/battle-panel/components/battle-panel-h2h-card-skeleton";
import { ensureBattlePanelCharacterId } from "@/features/user/battle-panel/battle-panel-route-loader";
import {
  battlePanelHeadToHeadSearchSchema,
  loadBattlePanelHeadToHeadSearch,
  normalizeBattlePanelCharacterId,
} from "@/features/user/battle-panel/battle-panel-search";
import { getBattlesControllerGetHeadToHeadQueryOptions } from "@lootlog/client/battlelog";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/opponents",
)({
  validateSearch: battlePanelHeadToHeadSearchSchema,
  loader: ({ abortController, context, location, preload }) =>
    withRouteLoaderCancellation(abortController, async () => {
      if (preload) {
        return null;
      }

      const search = loadBattlePanelHeadToHeadSearch(location.searchStr);

      const characterId = await ensureBattlePanelCharacterId({
        queryClient: context.queryClient,
        characterId: normalizeBattlePanelCharacterId(search.characterId),
      });

      if (characterId && !search.characterId) {
        throw redirect({
          to: "/@me/battle-panel/opponents",
          search: {
            ...search,
            characterId,
          },
        });
      }

      await context.queryClient.prefetchQuery(
        getBattlesControllerGetHeadToHeadQueryOptions({
          cursor: search.cursor ?? undefined,
          characterId,
          period: search.period,
          startDate: search.startDate ?? undefined,
          endDate: search.endDate ?? undefined,
          search: search.search ?? undefined,
          minLevel: search.minLevel,
          maxLevel: search.maxLevel,
          ph: search.ph ?? undefined,
          matchmaking: false,
          sortBy: search.sortBy,
          sortOrder: search.sortOrder,
          size: 20,
          includeTotal: true,
        }),
      );

      return null;
    }),
  component: HeadToHeadFullPage,
  pendingComponent: () => (
    <BattlePanelH2hSkeleton
      variant="head-to-head"
      {...headToHeadPageCopy}
      mobileCard={<BattlePanelH2hCardSkeleton />}
    />
  ),
});
