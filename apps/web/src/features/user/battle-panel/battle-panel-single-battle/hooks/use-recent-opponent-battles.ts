import type { Battle } from "@/lib/api/battlelog-types";
import {
  battlesControllerGetPlayerVsPlayerBattles,
  getBattlesControllerGetBattleQueryOptions,
} from "@lootlog/client/battlelog";
import { useQueries, useQuery } from "@tanstack/react-query";
import { getRecentOpponentBattleContext } from "../components/recent-opponent-battle-context";

export const useRecentOpponentBattles = (battle: Battle | undefined) => {
  const context = getRecentOpponentBattleContext(battle);
  const query = useQuery({
    queryKey: [
      "recent-opponent-battles",
      "v4",
      context?.characterId,
      context?.opponentId,
      context?.world,
    ],
    queryFn: ({ signal }) => {
      if (!context) {
        throw new Error("Missing recent opponent context");
      }

      return battlesControllerGetPlayerVsPlayerBattles(
        {
          characterId: context.characterId,
          opponentId: context.opponentId,
          period: "all",
          size: 10,
          world: context.world,
        },
        { signal },
      );
    },
    enabled: context !== null,
    placeholderData: undefined,
  });
  const battles = query.data?.battles ?? [];
  const battleDetailsQueries = useQueries({
    queries: battles.map((recentBattle) =>
      getBattlesControllerGetBattleQueryOptions({
        battleId: recentBattle.battleId,
      }),
    ),
  });
  const battleDetailsById = battleDetailsQueries.reduce<
    Record<string, Battle | undefined>
  >((detailsById, detailQuery, index) => {
    const recentBattle = battles[index];

    if (!recentBattle) {
      return detailsById;
    }

    return {
      ...detailsById,
      [recentBattle.battleId]: detailQuery.data,
    };
  }, {});

  return {
    ...query,
    battleDetailsById,
    battles,
    context,
  };
};
