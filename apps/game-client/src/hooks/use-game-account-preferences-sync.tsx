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
import { Game } from "@/lib/game";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { useGlobalStore } from "@/store/global.store";
import type { UserGameAccountPreferencesResponseDtoOutput } from "@/lib/api/generated/main/model";
import {
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@/lib/api/generated/main/users/users";

const NPC_INITIAL_DETECTION_DEBUG_PREFIX = "[DEBUG-NPC-INIT]";

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
  const accountId = Game.getAccountId();
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
          hasStoredNotifications: true,
          hasStoredDetector: true,
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
    console.log(
      `${NPC_INITIAL_DETECTION_DEBUG_PREFIX} useGameAccountPreferencesSync flush effect`,
      {
        accountId,
        gameInitialized,
        isFetched,
      },
    );

    if (!gameInitialized || !accountId || !isFetched) {
      return;
    }

    console.log(
      `${NPC_INITIAL_DETECTION_DEBUG_PREFIX} useGameAccountPreferencesSync flushPending`,
      {
        accountId,
      },
    );

    npcsDetectionProcessor.flushPending(accountId);
  }, [accountId, gameInitialized, isFetched]);
};
