import { useCurrentGameAccountPreferences } from "@/lib/settings-persistence/use-game-account-preferences";
import { isDetectorPreferencesReady } from "@/lib/game-account-preferences";
import { defaultDetectorSettings } from "@lootlog/schema/account-preferences";

export const useCurrentGameAccountDetectorSettings = () => {
  const query = useCurrentGameAccountPreferences();

  const settings = query.data?.detector ?? defaultDetectorSettings;

  const isReady = isDetectorPreferencesReady(query.data) || query.isError;

  return {
    ...query,
    isReady,
    settings,
  };
};
