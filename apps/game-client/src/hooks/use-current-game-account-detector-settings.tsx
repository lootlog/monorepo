import { useMemo } from "react";
import { useCurrentGameAccountPreferences } from "@/hooks/use-current-game-account-preferences";
import { getEffectiveDetectorSettings } from "@/lib/game-account-preferences";

export const useCurrentGameAccountDetectorSettings = () => {
  const query = useCurrentGameAccountPreferences();
  const settings = useMemo(
    () => getEffectiveDetectorSettings(query.data),
    [query.data],
  );

  return {
    ...query,
    settings,
  };
};
