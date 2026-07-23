import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getEffectiveNotificationMutes } from "@/lib/user-preferences";
import { useGlobalStore } from "@/store/global.store";

type EffectiveNotificationMutes = ReturnType<
  typeof getEffectiveNotificationMutes
>;

const emptyNotificationMutes = getEffectiveNotificationMutes(undefined);
const notificationMutesCache = new WeakMap<
  object,
  EffectiveNotificationMutes
>();

const getCachedEffectiveNotificationMutes = (
  preferences: ReturnType<typeof useUserPreferences>["data"],
) => {
  if (!preferences) return emptyNotificationMutes;

  const cachedMutes = notificationMutesCache.get(preferences);
  if (cachedMutes) return cachedMutes;

  const mutes = getEffectiveNotificationMutes(preferences);
  notificationMutesCache.set(preferences, mutes);
  return mutes;
};

export const useCurrentUserNotificationMutes = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const query = useUserPreferences(gameInitialized);

  return {
    isReady: query.isFetched,
    mutes: getCachedEffectiveNotificationMutes(query.data),
  };
};
