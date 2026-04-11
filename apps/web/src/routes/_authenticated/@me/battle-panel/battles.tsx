import { createFileRoute } from "@tanstack/react-router";
import { BattlePanelBattlesList } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-list";
import { BattlePanelBattlesSkeleton } from "@/features/user/battle-panel/battle-panel-battles-list/battle-panel-battles-skeleton";
import { battlesQueryOptions } from "@/hooks/api/battle-log/use-battles";
import { battleCharactersQueryOptions } from "@/hooks/api/battle-log/use-battle-characters";
import { loadBattlePanelBattlesSearch } from "@/features/user/battle-panel/battle-panel-battles-list/battle-query-parsers";

export const Route = createFileRoute(
  "/_authenticated/@me/battle-panel/battles",
)({
  loader: async ({ context, location }) => {
    const search = loadBattlePanelBattlesSearch(location.searchStr);

    await Promise.all([
      context.queryClient.ensureQueryData(battleCharactersQueryOptions()),
      context.queryClient.ensureQueryData(
        battlesQueryOptions({
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
  },
  component: BattlePanelBattlesList,
  pendingComponent: BattlePanelBattlesSkeleton,
});
