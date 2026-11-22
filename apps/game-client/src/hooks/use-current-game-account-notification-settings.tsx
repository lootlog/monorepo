import { useCurrentGameAccountPreferences } from "@/lib/settings-persistence/use-game-account-preferences";
import {
  getEffectiveNotificationSettings,
  isNotificationPreferencesReady,
} from "@/lib/game-account-preferences";

export const useCurrentGameAccountNotificationSettings = () => {
  const query = useCurrentGameAccountPreferences();

  const settings = getEffectiveNotificationSettings(query.data);

  const isReady = isNotificationPreferencesReady(query.data);

  return {
    ...query,
    isReady,
    settings,
  };
};
