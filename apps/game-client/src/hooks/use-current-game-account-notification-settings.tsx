import { useMemo } from "react";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import {
  getEffectiveNotificationSettings,
  isNotificationPreferencesReady,
} from "@/lib/game-account-preferences";

export const useCurrentGameAccountNotificationSettings = () => {
  const query = useCurrentGameAccountPreferences();
  // Form reset effects depend on this clone identity; recreating it on each render
  // causes an unbounded reset/render cycle even when the cached data is unchanged.
  const settings = useMemo(
    () => getEffectiveNotificationSettings(query.data),
    [query.data],
  );
  const isReady = isNotificationPreferencesReady(query.data);

  return {
    ...query,
    isReady,
    settings,
  };
};
