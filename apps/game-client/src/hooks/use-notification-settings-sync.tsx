import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGuilds } from "@/hooks/api/use-guilds";
import {
  useUpdateUserGameAccountPreferences,
  useUserGameAccountPreferences,
} from "@/hooks/api/use-user-account-preferences";
import {
  createNotificationsSettings,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-notification-preferences";
import { Game } from "@/lib/game";
import { useGlobalStore } from "@/store/global.store";

export const useNotificationSettingsSync = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const { data: guilds } = useGuilds();
  const queryClient = useQueryClient();
  const accountId = Game.hero?.account ? String(Game.hero.account) : null;
  const guildIds = guilds?.map((guild) => guild.id) ?? [];
  const seededAccountsRef = useRef<Set<string>>(new Set());

  const { data, isLoading, isFetching } = useUserGameAccountPreferences(
    accountId,
    gameInitialized,
  );
  const updateUserGameAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);

  useEffect(() => {
    if (
      !gameInitialized ||
      !accountId ||
      !guilds ||
      isLoading ||
      isFetching ||
      !data
    ) {
      return;
    }

    if (!data.hasStoredPreferences) {
      if (seededAccountsRef.current.has(accountId)) {
        return;
      }

      const queryKey = getUserGameAccountPreferencesQueryKey(accountId);
      const seededSettings = createNotificationsSettings(guildIds);
      seededAccountsRef.current.add(accountId);
      queryClient.setQueryData(queryKey, {
        accountId,
        notifications: seededSettings,
        hasStoredPreferences: true,
      });
      updateUserGameAccountPreferences.mutate(
        {
          notifications: seededSettings,
        },
        {
          onError: () => {
            seededAccountsRef.current.delete(accountId);
            queryClient.setQueryData(queryKey, data);
          },
        },
      );
    }
  }, [
    accountId,
    data,
    gameInitialized,
    guildIds,
    guilds,
    isFetching,
    isLoading,
    queryClient,
    updateUserGameAccountPreferences,
  ]);
};
