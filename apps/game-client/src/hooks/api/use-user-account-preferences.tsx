import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cloneDetectorSettings } from "@/lib/game-account-preferences";
import { DETECTOR_NPC_TYPES, type NotificationType } from "@lootlog/types";
import {
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  useUsersControllerGetUserGameAccountPreferences,
  usersControllerUpdateUserGameAccountPreferences,
} from "@/lib/api/generated/main/users/users";
import type {
  UpdateUserGameAccountPreferencesDto,
  UserGameAccountPreferencesResponseDtoOutput,
} from "@/lib/api/generated/main/model";

export const useUserGameAccountPreferences = (
  accountId: string | null,
  enabled = true,
) => {
  const resolvedAccountId = accountId ?? "";

  return useUsersControllerGetUserGameAccountPreferences(
    { accountId: resolvedAccountId },
    {
      query: {
        queryKey: getUsersControllerGetUserGameAccountPreferencesQueryKey({
          accountId: resolvedAccountId,
        }),
        enabled: enabled && !!accountId,
        staleTime: 60_000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: false,
      },
    },
  );
};

export const useUpdateUserGameAccountPreferences = (
  accountId: string | null,
) => {
  const queryClient = useQueryClient();
  const queryKey = accountId
    ? getUsersControllerGetUserGameAccountPreferencesQueryKey({ accountId })
    : ["usersControllerGetUserGameAccountPreferences", "disabled"];

  return useMutation({
    mutationKey: accountId
      ? ["usersControllerUpdateUserGameAccountPreferences", accountId]
      : ["usersControllerUpdateUserGameAccountPreferences", "disabled"],
    mutationFn: async (payload: UpdateUserGameAccountPreferencesDto) => {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      return usersControllerUpdateUserGameAccountPreferences(
        { accountId },
        payload,
      );
    },
    onMutate: async (payload) => {
      if (!accountId) {
        return { previousData: undefined };
      }

      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<UserGameAccountPreferencesResponseDtoOutput>(
          queryKey,
        );

      if (!previousData) {
        return { previousData };
      }

      const nextNotifications = payload.notifications
        ? Object.entries(payload.notifications).reduce(
            (acc, [notificationType, patch]) => {
              const typedNotificationType =
                notificationType as NotificationType;

              acc[typedNotificationType] = {
                ...acc[typedNotificationType],
                ...patch,
              };

              return acc;
            },
            {
              ...previousData.notifications,
            } as UserGameAccountPreferencesResponseDtoOutput["notifications"],
          )
        : previousData.notifications;
      const nextDetector = payload.detector
        ? (() => {
            const nextSettings = cloneDetectorSettings(previousData.detector);

            if (payload.detector.routingRules) {
              nextSettings.routingRules = payload.detector.routingRules.map(
                (rule) => ({
                  ...rule,
                  guildIds: [...rule.guildIds],
                }),
              );
            }

            DETECTOR_NPC_TYPES.forEach((detectorType) => {
              const patch = payload.detector?.[detectorType];

              if (!patch) {
                return;
              }

              nextSettings[detectorType] = {
                ...nextSettings[detectorType],
                ...patch,
              };
            });

            return nextSettings;
          })()
        : previousData.detector;
      const nextPings = payload.pings
        ? { ...previousData.pings, ...payload.pings }
        : previousData.pings;

      queryClient.setQueryData<UserGameAccountPreferencesResponseDtoOutput>(
        queryKey,
        {
          ...previousData,
          notifications: nextNotifications,
          detector: nextDetector,
          pings: nextPings,
          hasStoredNotifications:
            previousData.hasStoredNotifications ||
            payload.notifications !== undefined,
          hasStoredDetector:
            previousData.hasStoredDetector || payload.detector !== undefined,
          hasStoredPings:
            previousData.hasStoredPings || payload.pings !== undefined,
          hasStoredPreferences: true,
        },
      );

      return { previousData };
    },
    onError: (_error, _payload, context) => {
      if (!accountId || !context?.previousData) {
        return;
      }

      queryClient.setQueryData(queryKey, context.previousData);
    },
    onSuccess: (data) => {
      if (!accountId) {
        return;
      }

      queryClient.setQueryData(queryKey, data);
    },
    onSettled: () => {
      if (!accountId) {
        return;
      }

      queryClient.invalidateQueries({ queryKey });
    },
  });
};
