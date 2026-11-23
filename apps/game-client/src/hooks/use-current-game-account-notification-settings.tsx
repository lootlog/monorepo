import { useCurrentGameAccountPreferences } from "@/lib/settings-persistence/use-game-account-preferences";
import { isNotificationPreferencesReady } from "@/lib/game-account-preferences";
import { defaultNotificationsSettings } from "@lootlog/schema/account-preferences";

export const useCurrentGameAccountNotificationSettings = () => {
  const query = useCurrentGameAccountPreferences();

  const settings = query.data?.notifications ?? defaultNotificationsSettings;

  const isReady = isNotificationPreferencesReady(query.data);

  return {
    ...query,
    isReady,
    settings,
  };
};
