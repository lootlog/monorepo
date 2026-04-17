import { useMemo } from "react";
import { useUserPreferences } from "@/hooks/api/use-user-preferences";
import { getEffectiveNotificationMutes } from "@/lib/user-preferences";
import { useGlobalStore } from "@/store/global.store";

export const useCurrentUserNotificationMutes = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const query = useUserPreferences(gameInitialized);
  const mutes = useMemo(
    () => getEffectiveNotificationMutes(query.data),
    [query.data],
  );

  return {
    ...query,
    isReady: query.isFetched,
    mutes,
  };
};
