import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getEffectiveNotificationMutes } from "@/lib/user-preferences";
import { useGlobalStore } from "@/store/global.store";
import { useRef } from "react";

export const useCurrentUserNotificationMutes = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const query = useUserPreferences(gameInitialized);
  const cachedMutesRef = useRef<{
    preferences: typeof query.data;
    mutes: ReturnType<typeof getEffectiveNotificationMutes>;
  } | null>(null);

  if (
    cachedMutesRef.current === null ||
    cachedMutesRef.current.preferences !== query.data
  ) {
    cachedMutesRef.current = {
      preferences: query.data,
      mutes: getEffectiveNotificationMutes(query.data),
    };
  }

  return {
    isReady: query.isFetched,
    mutes: cachedMutesRef.current.mutes,
  };
};
