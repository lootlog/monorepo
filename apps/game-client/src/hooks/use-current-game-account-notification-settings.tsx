import { useMemo } from "react";
import { useUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import { getEffectiveNotificationSettings } from "@/lib/game-account-notification-preferences";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";

export const useCurrentGameAccountNotificationSettings = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const accountId = Game.hero?.account ? String(Game.hero.account) : null;
  const query = useUserGameAccountPreferences(accountId, gameInitialized);
  const settings = useMemo(
    () => getEffectiveNotificationSettings(query.data),
    [query.data],
  );
  const isReady = query.isFetched;

  return {
    ...query,
    accountId,
    isReady,
    settings,
  };
};
