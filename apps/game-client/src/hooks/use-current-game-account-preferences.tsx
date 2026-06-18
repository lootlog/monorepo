import { useUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";

export const useCurrentGameAccountPreferences = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const accountId = Game.getAccountId();
  const query = useUserGameAccountPreferences(accountId, gameInitialized);

  return {
    ...query,
    accountId,
  };
};
