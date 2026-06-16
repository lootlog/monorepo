import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelBattlesSkeleton } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";
import {
  getBattlesControllerGetDashboardBattlesQueryOptions,
  getBattlesControllerGetUserCharactersQueryOptions,
} from "@/lib/api/generated/battlelog/battles/battles";
import { loadBattlePanelBattlesSearch } from "@/features/user/battle-panel/battle-panel-battles-list/battle-query-parsers";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles",
)({
  loader: ({ abortController, context, location }) =>
    withRouteLoaderCancellation(abortController, async () => {
      const search = loadBattlePanelBattlesSearch(location.searchStr);

      await Promise.all([
        context.queryClient.ensureQueryData(
          getBattlesControllerGetUserCharactersQueryOptions(),
        ),
        context.queryClient.ensureQueryData(
          getBattlesControllerGetDashboardBattlesQueryOptions({
            cursor: search.cursor ?? undefined,
            size: 20,
            includeTotal: true,
            world: search.world ?? undefined,
            type: search.type ?? undefined,
            search: search.search ?? undefined,
            result: search.result ?? undefined,
            ph: search.ph ?? undefined,
            matchmaking: search.matchmaking ?? undefined,
            characterId: search.characterId ?? undefined,
            minLevel: search.minLevel,
            maxLevel: search.maxLevel,
          }),
        ),
      ]);

      return null;
    }),
  component: BattlePanelBattlesList,
  pendingComponent: BattlePanelBattlesSkeleton,
});
