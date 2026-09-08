import { useMemo } from "react";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import {
  getEffectiveDetectorSettings,
  isDetectorPreferencesReady,
} from "@/lib/game-account-preferences";

export const useCurrentGameAccountDetectorSettings = () => {
  const query = useCurrentGameAccountPreferences();
  // Form reset effects depend on this clone identity; recreating it on each render
  // causes an unbounded reset/render cycle even when the cached data is unchanged.
  const settings = useMemo(
    () => getEffectiveDetectorSettings(query.data),
    [query.data],
  );
  const isReady = isDetectorPreferencesReady(query.data) || query.isError;

  return {
    ...query,
    isReady,
    settings,
  };
};
