import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserGameAccountPreferences,
  updateUserGameAccountPreferences,
} from "@/api";
import {
  cloneDetectorSettings,
  getUpdateUserGameAccountPreferencesMutationKey,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-preferences";
import {
  DETECTOR_NPC_TYPES,
  type NotificationType,
  type UpdateUserGameAccountPreferencesPayload,
  type UserGameAccountPreferences,
} from "@lootlog/types";

export const useUserGameAccountPreferences = (
  accountId: string | null,
  enabled = true,
) => {
  return useQuery({
    queryKey: accountId
      ? getUserGameAccountPreferencesQueryKey(accountId)
      : ["user-game-account-preferences", "disabled"],
    queryFn: async () => {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      return fetchUserGameAccountPreferences(accountId);
    },
    enabled: enabled && !!accountId,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useUpdateUserGameAccountPreferences = (
  accountId: string | null,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: accountId
      ? getUpdateUserGameAccountPreferencesMutationKey(accountId)
      : ["update-user-game-account-preferences", "disabled"],
    mutationFn: async (payload: UpdateUserGameAccountPreferencesPayload) => {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      return updateUserGameAccountPreferences(accountId, payload);
    },
    onMutate: async (payload) => {
      if (!accountId) {
        return { previousData: undefined };
      }

      const queryKey = getUserGameAccountPreferencesQueryKey(accountId);
      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<UserGameAccountPreferences>(queryKey);

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
            } as UserGameAccountPreferences["notifications"],
          )
        : previousData.notifications;
      const nextDetector = payload.detector
        ? (() => {
            const nextSettings = cloneDetectorSettings(previousData.detector);

            if (payload.detector?.routingRules) {
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

      queryClient.setQueryData<UserGameAccountPreferences>(queryKey, {
        ...previousData,
        notifications: nextNotifications,
        detector: nextDetector,
        hasStoredNotifications:
          previousData.hasStoredNotifications ||
          payload.notifications !== undefined,
        hasStoredDetector:
          previousData.hasStoredDetector || payload.detector !== undefined,
        hasStoredPreferences: true,
      });

      return { previousData };
    },
    onError: (_error, _payload, context) => {
      if (!accountId || !context?.previousData) {
        return;
      }

      queryClient.setQueryData(
        getUserGameAccountPreferencesQueryKey(accountId),
        context.previousData,
      );
    },
    onSuccess: (data) => {
      if (!accountId) {
        return;
      }

      queryClient.setQueryData(
        getUserGameAccountPreferencesQueryKey(accountId),
        data,
      );
    },
    onSettled: () => {
      if (!accountId) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: getUserGameAccountPreferencesQueryKey(accountId),
      });
    },
  });
};
