import { useMemo } from "react";
import { useUserGameAccountPreferences } from "@/hooks/api/use-user-account-preferences";
import {
  getEffectiveDetectorSettings,
  isDetectorPreferencesReady,
} from "@/lib/game-account-notification-preferences";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";

export const useCurrentGameAccountDetectorSettings = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const accountId = Game.hero?.account ? String(Game.hero.account) : null;
  const query = useUserGameAccountPreferences(accountId, gameInitialized);
  const settings = useMemo(
    () => getEffectiveDetectorSettings(query.data),
    [query.data],
  );
  const isReady = useMemo(
    () => isDetectorPreferencesReady(query.data),
    [query.data],
  );

  return {
    ...query,
    accountId,
    isReady,
    settings,
  };
};
