import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelBattlesSkeleton } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";
import {
  getBattlesControllerGetDashboardBattlesQueryOptions,
  getBattlesControllerGetUserCharactersQueryOptions,
  getBattlesControllerGetUserWorldsQueryOptions,
} from "@lootlog/client/battlelog";
import {
  battlePanelBattlesSearchSchema,
  loadBattlePanelBattlesSearch,
} from "@/features/user/battle-panel/battle-panel-search";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";
import { ensureRouteQueryData } from "@/lib/router/route-prefetch";
import { buildDashboardBattlesParams } from "@/features/user/battle-panel/battle-panel-request-params";

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
          getBattlesControllerGetDashboardBattlesQueryOptions(
            buildDashboardBattlesParams(search),
          ),
        ),
      ]).catch(() => undefined);

      return null;
    }),
  component: BattlePanelBattlesList,
  pendingComponent: BattlePanelBattlesSkeleton,
});
