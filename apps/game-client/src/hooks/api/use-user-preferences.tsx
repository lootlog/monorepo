import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserPreferences, updateUserPreferences } from "@/api";
import {
  cloneNotificationMutes,
  getUpdateUserPreferencesMutationKey,
  getUserPreferencesQueryKey,
} from "@/lib/user-preferences";
import type {
  UpdateUserPreferencesPayload,
  UserPreferences,
} from "@lootlog/types";

export const useUserPreferences = (enabled = true) => {
  return useQuery({
    queryKey: getUserPreferencesQueryKey(),
    queryFn: () => fetchUserPreferences(),
    enabled,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: getUpdateUserPreferencesMutationKey(),
    mutationFn: (payload: UpdateUserPreferencesPayload) =>
      updateUserPreferences(payload),
    onMutate: async (payload) => {
      const queryKey = getUserPreferencesQueryKey();
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<UserPreferences>(queryKey);

      if (!previousData) {
        return { previousData };
      }

      const previousMutes = cloneNotificationMutes(previousData.mutes);
      const nextMutes = payload.mutes
        ? {
            players: payload.mutes.players
              ? payload.mutes.players.map((player) => ({ ...player }))
              : previousMutes.players,
            npcs: payload.mutes.npcs
              ? payload.mutes.npcs.map((npc) => ({ ...npc }))
              : previousMutes.npcs,
          }
        : previousData.mutes;

      queryClient.setQueryData<UserPreferences>(queryKey, {
        ...previousData,
        ...payload,
        mutes: nextMutes,
      });

      return { previousData };
    },
    onError: (_error, _payload, context) => {
      if (!context?.previousData) {
        return;
      }

      queryClient.setQueryData(
        getUserPreferencesQueryKey(),
        context.previousData,
      );
    },
    onSuccess: (data) => {
      queryClient.setQueryData(getUserPreferencesQueryKey(), data);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getUserPreferencesQueryKey(),
      });
    },
  });
};
