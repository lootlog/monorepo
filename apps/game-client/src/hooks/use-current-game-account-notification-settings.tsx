import { useMemo } from "react";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { getEffectiveNotificationSettings } from "@/lib/game-account-preferences";

export const useCurrentGameAccountNotificationSettings = () => {
  const query = useCurrentGameAccountPreferences();
  const settings = useMemo(
    () => getEffectiveNotificationSettings(query.data),
    [query.data],
  );

  return {
    ...query,
    settings,
  };
};
