import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import {
  getEffectiveDetectorSettings,
  isDetectorPreferencesReady,
} from "@/lib/game-account-preferences";

export const useCurrentGameAccountDetectorSettings = () => {
  const query = useCurrentGameAccountPreferences();
  const settings = getEffectiveDetectorSettings(query.data);
  const isReady = isDetectorPreferencesReady(query.data) || query.isError;

  return {
    ...query,
    isReady,
    settings,
  };
};
