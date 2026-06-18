import type { Battle } from "@/lib/api/battlelog-types";
import { battlesControllerGetPlayerVsPlayerBattles } from "@/lib/api/generated/battlelog/battles/battles";
import { useQuery } from "@tanstack/react-query";
import { getRecentOpponentBattleContext } from "../components/recent-opponent-battle-context";

export const useRecentOpponentBattles = (battle: Battle | undefined) => {
  const context = getRecentOpponentBattleContext(battle);
  const query = useQuery({
    queryKey: [
      "recent-opponent-battles",
      context?.battleId,
      context?.characterId,
      context?.opponentId,
      context?.world,
    ],
    queryFn: () => {
      if (!context) {
        throw new Error("Missing recent opponent context");
      }

      return battlesControllerGetPlayerVsPlayerBattles({
        characterId: context.characterId,
        excludeBattleId: context.battleId,
        opponentId: context.opponentId,
        period: "all",
        size: 10,
        world: context.world,
      });
    },
    enabled: context !== null,
  });

  return {
    ...query,
    battles: query.data?.battles ?? [],
    context,
  };
};
