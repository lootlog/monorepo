import { useCurrentGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import {
  getEffectiveDetectorSettings,
  isDetectorPreferencesReady,
} from "@/lib/game-account-preferences";

export const useCurrentGameAccountDetectorSettings = () => {
  const query = useCurrentGameAccountPreferences();

  // Form reset effects depend on this clone identity; the React Compiler keeps
  // it stable while `query.data` is unchanged, which stops an unbounded
  // reset/render cycle.
  const settings = getEffectiveDetectorSettings(query.data);

  const isReady = isDetectorPreferencesReady(query.data) || query.isError;

  return {
    ...query,
    isReady,
    settings,
  };
};
