import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpdateUserGameAccountPreferences,
  useUserGameAccountPreferences,
} from "@/hooks/api/use-user-account-preferences";
import {
  createDetectorSettings,
  createNotificationsSettings,
} from "@/lib/game-account-preferences";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import type { UserGameAccountPreferencesResponseDtoOutput } from "@/lib/api/generated/main/model";
import {
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";

export const useGameAccountPreferencesSync = () => {
  const gameInitialized = useGlobalStore(
    (state) => state.gameState.gameInitialized,
  );
  const {
    data: guilds,
    isFetched: areGuildsFetched,
    isFetching: areGuildsFetching,
    isLoading: areGuildsLoading,
  } = useUsersControllerGetCurrentUserAccessibleGuilds();
  const queryClient = useQueryClient();
  const accountId = useGameStore((state) => state.game?.hero.accountId ?? null);
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

      const queryKey = getUsersControllerGetUserGameAccountPreferencesQueryKey({
        accountId,
      });
      const guildIds = guilds?.map((guild) => guild.id) ?? [];
      const seededNotifications = data.hasStoredNotifications
        ? data.notifications
        : createNotificationsSettings(guildIds);
      const seededDetector = data.hasStoredDetector
        ? data.detector
        : createDetectorSettings();
      seededAccountsRef.current.add(accountId);
      queryClient.setQueryData<UserGameAccountPreferencesResponseDtoOutput>(
        queryKey,
        {
          accountId,
          notifications: seededNotifications,
          detector: seededDetector,
          pings: data.pings,
          airTags: data.airTags,
          hasStoredNotifications: true,
          hasStoredDetector: true,
          hasStoredPings: data.hasStoredPings,
          hasStoredAirTags: data.hasStoredAirTags,
          hasStoredPreferences: true,
        },
      );
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
            queryClient.setQueryData(queryKey, data);
          },
        },
      );
    }
  }, [
    accountId,
    data,
    gameInitialized,
    guilds,
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
