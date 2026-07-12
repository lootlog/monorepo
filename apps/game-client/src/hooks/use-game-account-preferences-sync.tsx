import { useEffect, useRef, useState } from "react";
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

// TODO: Temporary startup workaround. Replace this polling with an explicit
// game account-ready signal; retry-based readiness checks are brittle and
// should not become our long-term pattern.
const ACCOUNT_ID_RETRY_DELAY_MS = 100;
const ACCOUNT_ID_MAX_RETRIES = 20;

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
  const [accountId, setAccountId] = useState<string | null>(() =>
    Game.getAccountId(),
  );
  const seededAccountsRef = useRef<Set<string>>(new Set());
  const accountIdRetryAttemptsRef = useRef(0);

  const { data, isLoading, isFetching, isFetched } =
    useUserGameAccountPreferences(accountId, gameInitialized);
  const updateUserGameAccountPreferences =
    useUpdateUserGameAccountPreferences(accountId);

  useEffect(() => {
    if (!gameInitialized || accountId) {
      accountIdRetryAttemptsRef.current = 0;
      return;
    }

    const resolveAccountId = () => {
      const nextAccountId = Game.getAccountId();

      if (nextAccountId) {
        accountIdRetryAttemptsRef.current = 0;
        setAccountId(nextAccountId);
        return true;
      }

      if (accountIdRetryAttemptsRef.current >= ACCOUNT_ID_MAX_RETRIES) {
        return true;
      }

      accountIdRetryAttemptsRef.current += 1;
      return false;
    };

    if (resolveAccountId()) {
      return;
    }

    const retryInterval = setInterval(() => {
      if (resolveAccountId()) {
        clearInterval(retryInterval);
      }
    }, ACCOUNT_ID_RETRY_DELAY_MS);

    return () => {
      clearInterval(retryInterval);
    };
  }, [accountId, gameInitialized]);

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
          hasStoredNotifications: true,
          hasStoredDetector: true,
          hasStoredPings: data.hasStoredPings,
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
