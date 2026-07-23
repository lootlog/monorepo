import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelBattlesSkeleton } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";
import {
  getBattlesControllerGetDashboardBattlesQueryOptions,
  getBattlesControllerGetUserCharactersQueryOptions,
  getBattlesControllerGetUserWorldsQueryOptions,
} from "@lootlog/api-client/react-query/battlelog/battles";
import {
  battlePanelBattlesSearchSchema,
  loadBattlePanelBattlesSearch,
} from "@/features/user/battle-panel/battle-panel-search";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";

export const Route = createFileRoute("/_authenticated/@me/battle-panel/")({
  validateSearch: battlePanelBattlesSearchSchema,
  loader: ({ abortController, context, location }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const search = loadBattlePanelBattlesSearch(location.searchStr);

      await Promise.all([
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetUserCharactersQueryOptions(),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetUserWorldsQueryOptions(),
        ),
        ensureRouteQueryData(
          context.queryClient,
          getBattlesControllerGetDashboardBattlesQueryOptions({
            cursor: search.cursor ?? undefined,
            size: 20,
            includeTotal: true,
            world: search.world ?? undefined,
            type: search.type ?? undefined,
            search: search.search ?? undefined,
            result: search.result ?? undefined,
            ph: search.ph ?? undefined,
            characterId: search.characterId ?? undefined,
            startDate: search.startDate ?? undefined,
            endDate: search.endDate ?? undefined,
            minLevel: search.minLevel,
            maxLevel: search.maxLevel,
          }),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: BattlePanelBattlesList,
  pendingComponent: BattlePanelBattlesSkeleton,
});
