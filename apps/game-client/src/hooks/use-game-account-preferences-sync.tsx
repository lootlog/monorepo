import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGuilds } from "@/hooks/api/use-guilds";
import {
  useUpdateUserGameAccountPreferences,
  useUserGameAccountPreferences,
} from "@/hooks/api/use-user-account-preferences";
import {
  createDetectorSettings,
  createNotificationsSettings,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-preferences";
import { Game } from "@/lib/game";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { useGlobalStore } from "@/store/global.store";
import type { UserGameAccountPreferences } from "@lootlog/types";

export const useGameAccountPreferencesSync = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const {
    data: guilds,
    isFetched: areGuildsFetched,
    isFetching: areGuildsFetching,
    isLoading: areGuildsLoading,
  } = useGuilds();
  const queryClient = useQueryClient();
  const accountId = Game.hero?.account ? String(Game.hero.account) : null;
  const guildIds = guilds?.map((guild) => guild.id) ?? [];
  const seededAccountsRef = useRef<Set<string>>(new Set());

  const { data, isLoading, isFetching, isFetched } =
    useUserGameAccountPreferences(accountId, gameInitialized);
  const updateUserGameAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);

  useEffect(() => {
    if (
      !gameInitialized ||
      !accountId ||
      !areGuildsFetched ||
      areGuildsLoading ||
      areGuildsFetching ||
      isLoading ||
      isFetching ||
      !data
    ) {
      return;
    }

    if (!data.hasStoredNotifications || !data.hasStoredDetector) {
      if (seededAccountsRef.current.has(accountId)) {
        return;
      }

      const queryKey = getUserGameAccountPreferencesQueryKey(accountId);
      const seededNotifications = data.hasStoredNotifications
        ? data.notifications
        : createNotificationsSettings(guildIds);
      const seededDetector = data.hasStoredDetector
        ? data.detector
        : createDetectorSettings();
      seededAccountsRef.current.add(accountId);
      queryClient.setQueryData<UserGameAccountPreferences>(queryKey, {
        accountId,
        notifications: seededNotifications,
        detector: seededDetector,
        hasStoredNotifications: true,
        hasStoredDetector: true,
        hasStoredPreferences: true,
      });
      updateUserGameAccountPreferences.mutate(
        {
          ...(!data.hasStoredNotifications && {
            notifications: seededNotifications,
          }),
          ...(!data.hasStoredDetector && {
            detector: seededDetector,
          }),
        },
        {
          onError: () => {
            seededAccountsRef.current.delete(accountId);
            queryClient.setQueryData<UserGameAccountPreferences>(
              queryKey,
              data,
            );
          },
        },
      );
    }
  }, [
    accountId,
    data,
    gameInitialized,
    guildIds,
    areGuildsFetched,
    areGuildsFetching,
    areGuildsLoading,
    isFetching,
    isLoading,
    queryClient,
    updateUserGameAccountPreferences,
  ]);

  useEffect(() => {
    if (!gameInitialized || !accountId || !isFetched) {
      return;
    }

    npcsDetectionProcessor.flushPending(accountId);
  }, [accountId, gameInitialized, isFetched]);
};
