import { useUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";

export const useCurrentGameAccountPreferences = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? null);
  const query = useUserGameAccountPreferences(accountId, gameInitialized);

  return {
    ...query,
    accountId,
  };
};
