import {
  invalidateBattlesControllerGetBattle,
  invalidateBattlesControllerGetDashboardBattles,
  invalidatePublicBattlesControllerGetPublicBattle,
  invalidatePublicBattlesControllerGetPublicBattleRaw,
  invalidatePublicBattlesControllerGetPublicBattleTimeline,
} from "@lootlog/client/battlelog";
import type { QueryClient } from "@tanstack/react-query";

export const createBattleVisibilityInvalidations = (
  queryClient: QueryClient,
  battleIds: readonly string[],
) => {
  const invalidationPromises: Promise<unknown>[] = [
    invalidateBattlesControllerGetDashboardBattles(queryClient),
  ];

  for (const battleId of battleIds) {
    invalidationPromises.push(
      invalidateBattlesControllerGetBattle(queryClient, { battleId }),
      invalidatePublicBattlesControllerGetPublicBattle(queryClient, {
        battleId,
      }),
      invalidatePublicBattlesControllerGetPublicBattleRaw(queryClient, {
        battleId,
      }),
      invalidatePublicBattlesControllerGetPublicBattleTimeline(queryClient, {
        battleId,
      }),
    );
  }

  return invalidationPromises;
};
