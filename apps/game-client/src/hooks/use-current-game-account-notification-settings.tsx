import { useCurrentGameAccountPreferences } from "@/features/settings/persistence/use-game-account-preferences";
import {
  getEffectiveNotificationSettings,
  isNotificationPreferencesReady,
} from "@/lib/game-account-preferences";

export const useCurrentGameAccountNotificationSettings = () => {
  const query = useCurrentGameAccountPreferences();

  // Form reset effects depend on this clone identity; the React Compiler keeps
  // it stable while `query.data` is unchanged, which stops an unbounded
  // reset/render cycle.
  const settings = getEffectiveNotificationSettings(query.data);

  // Deliberately narrower than the detector hook, which also accepts
  // `query.isError`: this flag gates notification *delivery*, not a settings
  // form. Delivering on default settings after a failed fetch would surface
  // muted or disabled notifications as if the player had asked for them.
  const isReady = isNotificationPreferencesReady(query.data);

  return {
    ...query,
    isReady,
    settings,
  };
};
